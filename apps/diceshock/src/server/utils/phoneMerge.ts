/**
 * Phone-based account merge system.
 *
 * Principle: phone number is the logical unique identity across all platforms.
 * When a phone number is bound/verified, any existing account with the same phone
 * is merged INTO the current account (credentials copied, data migrated, old account disabled).
 *
 * KV key: `admin_phones` — JSON string[] of admin phone numbers
 */

import db, {
  accounts,
  drizzle,
  mahjongRegistrationsTable,
  tableOccupancyTable,
  tempIdentitiesTable,
  type UserRole,
  userBadgesTable,
  userBusinessCardTable,
  userInfoTable,
  userMembershipPlansTable,
  userPointsLogTable,
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

/**
 * Attempt to merge all accounts sharing the given phone number into `targetUserId`.
 * Call this AFTER the phone has been verified (sms code confirmed).
 *
 * Steps:
 * 1. Find all user_info rows with this phone (excluding targetUserId)
 * 2. For each source user:
 *    a. Move all `account` rows → targetUserId
 *    b. Move `table_occupancy` (user_id) → targetUserId
 *    c. Move `user_membership_plans` → targetUserId
 *    d. Move `user_points_log` → targetUserId
 *    e. Move `mahjong_registrations` → targetUserId (delete duplicate if already exists)
 *    f. Move `user_badges` → targetUserId
 *    g. Move `user_preferences` → targetUserId
 *    h. Move `temp_identities` (rare) — skip, ephemeral
 *    i. Merge user_info fields (fill missing on target)
 *    j. Merge user_business_card fields (fill missing on target)
 *    k. Inherit highest role
 *    l. Disable source user (set role = "customer", clear from users table name → "[merged]")
 * 3. Check admin phone list in KV → upgrade role if matched
 */
export async function mergeByPhone(
  DB: D1Database,
  KV: KVNamespace,
  targetUserId: string,
  phone: string,
): Promise<MergeResult> {
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
    const finalRole = await resolveAdminRole(KV, phone, highestRole);
    if (finalRole !== targetUser?.role) {
      await d.update(users).set({ role: finalRole as UserRole }).where(eq(users.id, targetUserId));
    }
    return { merged: false, mergedUserIds: [], role: finalRole };
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

  for (const sourceUserId of sourceUserIds) {
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

    // a. Move all accounts → targetUserId
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

    // d. Move points log
    await d
      .update(userPointsLogTable)
      .set({ user_id: targetUserId })
      .where(eq(userPointsLogTable.user_id, sourceUserId));

    // e. Move mahjong registration (if target doesn't have one)
    if (!targetMahjong) {
      await d
        .update(mahjongRegistrationsTable)
        .set({ user_id: targetUserId })
        .where(eq(mahjongRegistrationsTable.user_id, sourceUserId));
    } else {
      // Delete source registration (target already has one)
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
        const updates: Record<string, unknown> = {};
        if (!targetInfo.nickname && sourceInfo.nickname)
          updates.nickname = sourceInfo.nickname;
        if (!targetInfo.avatar_url && sourceInfo.avatar_url)
          updates.avatar_url = sourceInfo.avatar_url;
        if (!targetInfo.preferred_store_id && sourceInfo.preferred_store_id)
          updates.preferred_store_id = sourceInfo.preferred_store_id;
        if (!targetInfo.preferred_locale && sourceInfo.preferred_locale)
          updates.preferred_locale = sourceInfo.preferred_locale;
        // Points: sum them
        if (sourceInfo.points && sourceInfo.points > 0) {
          updates.points = (targetInfo.points ?? 0) + sourceInfo.points;
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
      // Just reassign source card to target
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
        const cardUpdates: Record<string, unknown> = {};
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
        // Delete source card
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

  // Resolve final role (admin phones override)
  const finalRole = await resolveAdminRole(KV, phone, highestRole);

  // Apply final role to target
  await d
    .update(users)
    .set({ role: finalRole as UserRole })
    .where(eq(users.id, targetUserId));

  return { merged: mergedUserIds.length > 0, mergedUserIds, role: finalRole };
}

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
