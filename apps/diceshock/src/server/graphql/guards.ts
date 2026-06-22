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
