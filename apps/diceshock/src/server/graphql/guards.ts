import { hasRole } from "../apis/wechat/graphql/permissions";
import type { GQLContext } from "./context";
import { forbidden, unauthorized } from "./errors";

export function requireAuth(ctx: GQLContext): asserts ctx is GQLContext & {
  userId: string;
} {
  if (!ctx.userId || !hasRole(ctx.role, "authenticated")) {
    throw unauthorized("Authentication required");
  }
}

export function requireStaff(ctx: GQLContext): void {
  requireAuth(ctx);
  if (!hasRole(ctx.role, "staff")) {
    throw forbidden("Staff access required");
  }
}

export function requireAdmin(ctx: GQLContext): void {
  requireAuth(ctx);
  if (!hasRole(ctx.role, "admin")) {
    throw forbidden("Admin access required");
  }
}

export async function requireManageableUser(
  ctx: GQLContext,
  userId: string,
): Promise<void> {
  requireStaff(ctx);
  if (ctx.role === "admin") return;
  const target = await ctx.db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    columns: { role: true },
  });
  if (target?.role === "admin" || target?.role === "staff") {
    throw forbidden("Cannot manage a privileged account");
  }
}

export function requireOwner<
  TRow extends Record<TOwnerField, unknown>,
  TOwnerField extends string,
>(ctx: GQLContext, row: TRow, ownerField: TOwnerField): void {
  requireAuth(ctx);
  if (hasRole(ctx.role, "staff")) return;
  if (row[ownerField] !== ctx.userId) {
    throw forbidden("Owner access required");
  }
}
