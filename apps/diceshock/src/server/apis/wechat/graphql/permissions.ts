export type Role = "public" | "customer" | "authenticated" | "staff" | "admin" | "agent";

const ROLE_HIERARCHY: Record<Role, number> = {
  public: 0,
  customer: 1,
  authenticated: 1,
  staff: 2,
  admin: 3,
  agent: 4,
};

export function hasRole(actual: Role, required: Role): boolean {
  return ROLE_HIERARCHY[actual] >= ROLE_HIERARCHY[required];
}

export interface TablePermission {
  read: Role;
  write: Role;
  ownerField?: string;
}

export const TABLE_PERMISSIONS: Record<string, TablePermission> = {
  boardGamesTable: { read: "public", write: "staff" },
  storesTable: { read: "public", write: "admin" },
  eventsTable: { read: "public", write: "staff" },
  activesTable: {
    read: "public",
    write: "authenticated",
    ownerField: "creator_id",
  },
  activeRegistrationsTable: {
    read: "authenticated",
    write: "authenticated",
    ownerField: "user_id",
  },
  userInfoTable: {
    read: "authenticated",
    write: "authenticated",
    ownerField: "id",
  },
  userBusinessCardTable: {
    read: "authenticated",
    write: "authenticated",
    ownerField: "id",
  },
  userMembershipPlansTable: {
    read: "authenticated",
    write: "staff",
    ownerField: "user_id",
  },
  leaderboardSnapshotsTable: { read: "public", write: "staff" },
  mahjongMatchesTable: { read: "authenticated", write: "staff" },
  accounts: { read: "admin", write: "admin" },
  sessions: { read: "admin", write: "admin" },
  verificationTokens: { read: "admin", write: "admin" },
  authenticators: { read: "admin", write: "admin" },
  users: { read: "staff", write: "admin" },
};

export interface FieldMask {
  minRole: Role;
  ownerCanSee?: boolean;
  maskedValue?: unknown;
}

export const FIELD_MASKS: Record<string, Record<string, FieldMask>> = {
  userInfoTable: {
    phone: { minRole: "staff", ownerCanSee: true, maskedValue: null },
    meta: { minRole: "staff", ownerCanSee: true, maskedValue: null },
  },
  users: {
    role: { minRole: "staff", ownerCanSee: false, maskedValue: "customer" },
  },
};

export interface AuthContext {
  role: Role;
  userId: string | null;
}

export function isRowVisible(
  tableName: string,
  row: Record<string, unknown>,
  ctx: AuthContext,
): boolean {
  if (hasRole(ctx.role, "staff")) return true;

  const perm = TABLE_PERMISSIONS[tableName];
  if (!perm?.ownerField) return true;
  if (perm.read === "public") return true;

  if (!ctx.userId) return false;
  return row[perm.ownerField] === ctx.userId;
}

export function maskRow(
  tableName: string,
  row: Record<string, unknown>,
  ctx: AuthContext,
): Record<string, unknown> {
  const masks = FIELD_MASKS[tableName];
  if (!masks) return row;
  if (hasRole(ctx.role, "staff")) return row;

  const result = { ...row };
  for (const [field, mask] of Object.entries(masks)) {
    if (field in result) {
      const canSee =
        hasRole(ctx.role, mask.minRole) ||
        (mask.ownerCanSee && ctx.userId && isOwner(tableName, row, ctx.userId));
      if (!canSee) {
        result[field] = mask.maskedValue ?? null;
      }
    }
  }
  return result;
}

function isOwner(
  tableName: string,
  row: Record<string, unknown>,
  userId: string,
): boolean {
  const perm = TABLE_PERMISSIONS[tableName];
  if (!perm?.ownerField) return false;
  return row[perm.ownerField] === userId;
}

export function canMutate(
  tableName: string,
  row: Record<string, unknown> | null,
  ctx: AuthContext,
): { allowed: boolean; reason?: string } {
  const perm = TABLE_PERMISSIONS[tableName];
  if (!perm) return { allowed: false, reason: `Unknown table: ${tableName}` };

  if (!hasRole(ctx.role, perm.write)) {
    return {
      allowed: false,
      reason: `Insufficient role for ${tableName} write`,
    };
  }

  if (perm.ownerField && row && !hasRole(ctx.role, "staff")) {
    if (!ctx.userId || row[perm.ownerField] !== ctx.userId) {
      return {
        allowed: false,
        reason: `Can only modify own ${tableName} records`,
      };
    }
  }

  return { allowed: true };
}
