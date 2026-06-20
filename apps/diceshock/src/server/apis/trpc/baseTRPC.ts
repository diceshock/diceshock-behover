import type Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import type { UserRole } from "@lib/db";
import { initTRPC, TRPCError } from "@trpc/server";
import type { UserInfo } from "@/server/middlewares/auth";
import type { HonoCtxEnv } from "@/shared/types";

export function unwrapInput<T>(v: unknown): T {
  const obj = v as Record<string, unknown>;
  if (
    obj &&
    typeof obj === "object" &&
    "json" in obj &&
    Object.keys(obj).length === 1
  ) {
    return obj.json as T;
  }
  return v as T;
}

const t = initTRPC
  .context<{
    env: HonoCtxEnv["Bindings"];
    aliyunClient: Dysmsapi20170525;
    userInfo?: UserInfo;
    userId?: string;
    userRole?: UserRole;
    storeCode?: string;
    locale?: string;
  }>()
  .create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const staffProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || !ctx.userRole) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "需要登录才能访问后台",
    });
  }
  if (ctx.userRole !== "admin" && ctx.userRole !== "staff") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "需要管理员或店员权限",
    });
  }
  return next({
    ctx: { ...ctx, userId: ctx.userId, userRole: ctx.userRole },
  });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || !ctx.userRole) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "需要登录才能访问后台",
    });
  }
  if (ctx.userRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "需要管理员权限",
    });
  }
  return next({
    ctx: { ...ctx, userId: ctx.userId, userRole: ctx.userRole },
  });
});

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.userInfo || !ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "需要登录才能执行此操作",
    });
  }
  return next({
    ctx: {
      ...ctx,
      userInfo: ctx.userInfo,
      userId: ctx.userId,
    },
  });
});
