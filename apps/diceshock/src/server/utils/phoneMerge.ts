/**
 * Account merge system.
 *
 * Two merge triggers:
 * 1. Phone: phone number is the logical unique identity across all platforms.
 * 2. Unionid: WeChat's cross-platform identity (Open Platform + MP share the same unionid).
 *
 * When a match is detected, the "acting" (target) account absorbs the old (source) account:
 * credentials copied, data migrated, old account disabled.
 *
 * KV key: `admin_phones` — JSON string[] of admin phone numbers
 */

import db, {
  accounts,
  drizzle,
  mahjongRegistrationsTable,
  tableOccupancyTable,
  type UserRole,
  userBadgesTable,
  userBusinessCardTable,
  userInfoTable,
  userMembershipPlansTable,
  userPreferencesTable,
  users,
} from "@lib/db";
import { and, eq, ne } from "drizzle-orm";

const ROLE_PRIORITY: Record<string, number> = {
  customer: 0,
  staff: 1,
  admin: 2,
};

export const ADMIN_PHONES_KV_KEY = "admin_phones";

export interface MergeResult {
  merged: boolean;
  /** IDs of accounts that were merged (disabled) */
  mergedUserIds: string[];
  /** Final role after merge */
  role: string;
}

// ---------------------------------------------------------------------------
// Shared merge loop — moves all data from sourceUserIds into targetUserId
// ---------------------------------------------------------------------------

async function mergeUsersInto(
  DB: D1Database,
  targetUserId: string,
  sourceUserIds: string[],
): Promise<{ mergedUserIds: string[]; highestRole: string }> {
  const d = db(DB);
  const mergedUserIds: string[] = [];
  let highestRole = "customer";

  // Get target's current role
  const targetUser = await d.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, targetUserId),
    columns: { role: true },
  });
  if (targetUser?.role) {
    highestRole = targetUser.role;
  }

  if (sourceUserIds.length === 0) {
    return { mergedUserIds: [], highestRole };
  }

  // Get target's info and business card for field merging
  const targetInfo = await d.query.userInfoTable.findFirst({
    where: (ui, { eq }) => eq(ui.id, targetUserId),
  });
  const targetCard = await d.query.userBusinessCardTable.findFirst({
    where: (bc, { eq }) => eq(bc.id, targetUserId),
  });

  // Check if target already has mahjong registration
  const targetMahjong = await d.query.mahjongRegistrationsTable.findFirst({
    where: (mr, { eq }) => eq(mr.user_id, targetUserId),
  });

  // Track cumulative points for multi-source merges
  let runningPoints = targetInfo?.points ?? 0;

  for (const sourceUserId of sourceUserIds) {
    console.log("[mergeUsersInto] merging", sourceUserId, "→", targetUserId);
    // Get source user role
    const sourceUser = await d.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, sourceUserId),
      columns: { role: true },
    });
    if (sourceUser?.role) {
      if (
        (ROLE_PRIORITY[sourceUser.role] ?? 0) >
        (ROLE_PRIORITY[highestRole] ?? 0)
      ) {
        highestRole = sourceUser.role;
      }
    }

    // a. Move accounts → targetUserId (handle PK conflicts)
    // PK is (provider, providerAccountId), so delete source duplicates first
    const targetAccounts = await d
      .select({
        provider: accounts.provider,
        providerAccountId: accounts.providerAccountId,
      })
      .from(accounts)
      .where(eq(accounts.userId, targetUserId));

    const sourceAccts = await d
      .select({
        provider: accounts.provider,
        providerAccountId: accounts.providerAccountId,
      })
      .from(accounts)
      .where(eq(accounts.userId, sourceUserId));

    // Find conflicting accounts (same provider+providerAccountId on both users)
    const targetKeys = new Set(
      targetAccounts.map((a) => `${a.provider}:${a.providerAccountId}`),
    );
    const conflicting = sourceAccts.filter((a) =>
      targetKeys.has(`${a.provider}:${a.providerAccountId}`),
    );

    // Delete source accounts that would conflict (target already has them)
    for (const c of conflicting) {
      await d
        .delete(accounts)
        .where(
          and(
            eq(accounts.userId, sourceUserId),
            eq(accounts.provider, c.provider),
            eq(accounts.providerAccountId, c.providerAccountId),
          ),
        );
    }
    if (conflicting.length > 0) {
      console.log("[mergeUsersInto] resolved PK conflicts:", conflicting);
    }

    // Now safely move remaining source accounts to target
    await d
      .update(accounts)
      .set({ userId: targetUserId })
      .where(eq(accounts.userId, sourceUserId));

    // b. Move table_occupancy
    await d
      .update(tableOccupancyTable)
      .set({ user_id: targetUserId })
      .where(eq(tableOccupancyTable.user_id, sourceUserId));

    // c. Move membership plans
    await d
      .update(userMembershipPlansTable)
      .set({ user_id: targetUserId })
      .where(eq(userMembershipPlansTable.user_id, sourceUserId));

    // d. Move mahjong registration (if target doesn't have one)
    if (!targetMahjong) {
      await d
        .update(mahjongRegistrationsTable)
        .set({ user_id: targetUserId })
        .where(eq(mahjongRegistrationsTable.user_id, sourceUserId));
    } else {
      await d
        .delete(mahjongRegistrationsTable)
        .where(eq(mahjongRegistrationsTable.user_id, sourceUserId));
    }

    // f. Move badges
    await d
      .update(userBadgesTable)
      .set({ user_id: targetUserId })
      .where(eq(userBadgesTable.user_id, sourceUserId));

    // g. Move preferences
    await d
      .update(userPreferencesTable)
      .set({ user_id: targetUserId })
      .where(eq(userPreferencesTable.user_id, sourceUserId));

    // h. Merge user_info fields (fill missing on target)
    if (targetInfo) {
      const sourceInfo = await d.query.userInfoTable.findFirst({
        where: (ui, { eq }) => eq(ui.id, sourceUserId),
      });
      if (sourceInfo) {
        const updates: Record<string, string | number | null> = {};
        if (!targetInfo.nickname && sourceInfo.nickname)
          updates.nickname = sourceInfo.nickname;
        if (!targetInfo.avatar_url && sourceInfo.avatar_url)
          updates.avatar_url = sourceInfo.avatar_url;
        if (!targetInfo.preferred_store_id && sourceInfo.preferred_store_id)
          updates.preferred_store_id = sourceInfo.preferred_store_id;
        if (!targetInfo.preferred_locale && sourceInfo.preferred_locale)
          updates.preferred_locale = sourceInfo.preferred_locale;
        // Points: sum them using running total for multi-source correctness
        if (sourceInfo.points && sourceInfo.points > 0) {
          runningPoints += sourceInfo.points;
          updates.points = runningPoints;
        }
        if (Object.keys(updates).length > 0) {
          await d
            .update(userInfoTable)
            .set(updates)
            .where(eq(userInfoTable.id, targetUserId));
        }
      }
    }

    // i. Merge business card (fill missing)
    if (!targetCard) {
      const sourceCard = await d.query.userBusinessCardTable.findFirst({
        where: (bc, { eq }) => eq(bc.id, sourceUserId),
      });
      if (sourceCard) {
        await d
          .update(userBusinessCardTable)
          .set({ id: targetUserId })
          .where(eq(userBusinessCardTable.id, sourceUserId));
      }
    } else {
      const sourceCard = await d.query.userBusinessCardTable.findFirst({
        where: (bc, { eq }) => eq(bc.id, sourceUserId),
      });
      if (sourceCard) {
        const cardUpdates: Record<string, string | null> = {};
        if (!targetCard.wechat && sourceCard.wechat)
          cardUpdates.wechat = sourceCard.wechat;
        if (!targetCard.qq && sourceCard.qq) cardUpdates.qq = sourceCard.qq;
        if (!targetCard.custom_content && sourceCard.custom_content)
          cardUpdates.custom_content = sourceCard.custom_content;
        if (Object.keys(cardUpdates).length > 0) {
          await d
            .update(userBusinessCardTable)
            .set(cardUpdates)
            .where(eq(userBusinessCardTable.id, targetUserId));
        }
        await d
          .delete(userBusinessCardTable)
          .where(eq(userBusinessCardTable.id, sourceUserId));
      }
    }

    // j. Disable source user
    await d
      .update(users)
      .set({ name: "[merged]", role: "customer" })
      .where(eq(users.id, sourceUserId));

    // Clean up source user_info
    await d.delete(userInfoTable).where(eq(userInfoTable.id, sourceUserId));

    mergedUserIds.push(sourceUserId);
  }

  return { mergedUserIds, highestRole };
}

// ---------------------------------------------------------------------------
// Phone-based merge
// ---------------------------------------------------------------------------

/**
 * Merge all accounts sharing the given phone number into `targetUserId`.
 * Call AFTER the phone has been verified (SMS code confirmed).
 */
export async function mergeByPhone(
  DB: D1Database,
  KV: KVNamespace,
  targetUserId: string,
  phone: string,
): Promise<MergeResult> {
  const d = db(DB);

  // Find all other users with the same phone
  const sourceInfos = await d
    .select({ id: userInfoTable.id })
    .from(userInfoTable)
    .where(
      and(eq(userInfoTable.phone, phone), ne(userInfoTable.id, targetUserId)),
    );

  // Also find via account table (SMS provider)
  const sourceAccounts = await d
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, "SMS"),
        eq(accounts.providerAccountId, phone),
        ne(accounts.userId, targetUserId),
      ),
    );

  const sourceUserIds = [
    ...new Set([
      ...sourceInfos.map((s) => s.id),
      ...sourceAccounts.map((s) => s.userId),
    ]),
  ];

  if (sourceUserIds.length === 0) {
    // No merge needed, just check admin phones
    const targetUser = await d.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, targetUserId),
      columns: { role: true },
    });
    const finalRole = await resolveAdminRole(
      KV,
      phone,
      targetUser?.role ?? "customer",
    );
    if (finalRole !== targetUser?.role) {
      await d
        .update(users)
        .set({ role: finalRole as UserRole })
        .where(eq(users.id, targetUserId));
    }
    return { merged: false, mergedUserIds: [], role: finalRole };
  }

  const { mergedUserIds, highestRole } = await mergeUsersInto(
    DB,
    targetUserId,
    sourceUserIds,
  );

  // Resolve final role (admin phones override)
  const finalRole = await resolveAdminRole(KV, phone, highestRole);

  // Apply final role to target
  await d
    .update(users)
    .set({ role: finalRole as UserRole })
    .where(eq(users.id, targetUserId));

  return { merged: mergedUserIds.length > 0, mergedUserIds, role: finalRole };
}

// ---------------------------------------------------------------------------
// Unionid-based merge (WeChat Open Platform ↔ WeChat MP)
// ---------------------------------------------------------------------------

const WECHAT_PROVIDERS = ["wechat-open", "wechat-mp", "wechat-mp-silent"];

/**
 * Merge all accounts sharing the given WeChat unionid into `targetUserId`.
 * Call in the JWT callback when a WeChat login provides a unionid that maps
 * to a different existing user.
 *
 * This does the same full data merge as phone-based merge — not just moving
 * the account row, but transferring all user data, merging fields, and
 * disabling the source user.
 */
export async function mergeByUnionid(
  DB: D1Database,
  KV: KVNamespace,
  targetUserId: string,
  unionid: string,
): Promise<MergeResult> {
  const d = db(DB);

  // Find all WeChat account rows with the same providerAccountId (openid)
  // that belong to a different user. Unionid is stored in KV, but we look up
  // via the KV mapping: `unionid:<unionid>` → userId.
  // However, KV only has the first user that claimed it. To be thorough, also
  // check accounts table: all WeChat accounts where providerAccountId matches
  // any openid linked to this unionid. The safest approach: find the KV user
  // and also scan accounts for same-unionid users.

  const existingUserId = await KV.get(`unionid:${unionid}`);

  // Collect source user IDs (any user associated with this unionid, excluding target)
  const sourceUserIdSet = new Set<string>();

  if (existingUserId && existingUserId !== targetUserId) {
    sourceUserIdSet.add(existingUserId);
  }

  // Also scan: any wechat account rows whose providerAccountId is in accounts
  // that belong to a different user who has the same unionid stored.
  // Since unionid→userId is in KV (1:1), the KV lookup is sufficient for now.
  // But there could be stale accounts from before KV was set up.
  // Check all wechat provider accounts for the target, get their openids,
  // and see if any OTHER user also has a wechat account (cross-platform scenario).
  // The definitive approach: target's wechat accounts all share the same unionid.
  // Any other user with a wechat account whose openid maps to same unionid should merge.
  // Since we don't store unionid in DB (it's in KV), we rely on:
  //   - KV `unionid:<unionid>` → the "original" user
  //   - If that original user != target → merge

  const sourceUserIds = [...sourceUserIdSet];

  if (sourceUserIds.length === 0) {
    // Nothing to merge — just ensure KV points to target
    await KV.put(`unionid:${unionid}`, targetUserId, {
      expirationTtl: 86400 * 365,
    });
    const targetUser = await d.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, targetUserId),
      columns: { role: true },
    });
    return {
      merged: false,
      mergedUserIds: [],
      role: targetUser?.role ?? "customer",
    };
  }

  console.log("[mergeByUnionid] merging", {
    targetUserId: targetUserId.slice(-8),
    sourceUserIds: sourceUserIds.map((id) => id.slice(-8)),
    unionid: unionid.slice(0, 8),
  });

  const { mergedUserIds, highestRole } = await mergeUsersInto(
    DB,
    targetUserId,
    sourceUserIds,
  );

  // After unionid merge, check if target has a phone → resolve admin role
  const targetInfo = await d.query.userInfoTable.findFirst({
    where: (ui, { eq }) => eq(ui.id, targetUserId),
    columns: { phone: true },
  });
  let finalRole = highestRole;
  if (targetInfo?.phone) {
    finalRole = await resolveAdminRole(KV, targetInfo.phone, highestRole);
  }

  // Apply final role
  await d
    .update(users)
    .set({ role: finalRole as UserRole })
    .where(eq(users.id, targetUserId));

  // Update KV to point unionid → target
  await KV.put(`unionid:${unionid}`, targetUserId, {
    expirationTtl: 86400 * 365,
  });

  return { merged: mergedUserIds.length > 0, mergedUserIds, role: finalRole };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if phone is in admin list; return highest of current role vs admin.
 */
async function resolveAdminRole(
  KV: KVNamespace,
  phone: string,
  currentRole: string,
): Promise<string> {
  const adminPhonesRaw = await KV.get(ADMIN_PHONES_KV_KEY);
  if (!adminPhonesRaw) return currentRole;

  try {
    const adminPhones: string[] = JSON.parse(adminPhonesRaw);
    if (adminPhones.includes(phone)) {
      return "admin";
    }
  } catch {
    // Malformed KV value, ignore
  }
  return currentRole;
}
