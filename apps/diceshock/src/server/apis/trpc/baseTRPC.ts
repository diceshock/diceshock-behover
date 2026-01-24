import type Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import { initTRPC, TRPCError } from "@trpc/server";
import type { HonoCtxEnv } from "@/shared/types";
import type { UserInfo } from "@/server/middlewares/auth";

const t = initTRPC
  .context<{
    env: HonoCtxEnv["Bindings"];
    aliyunClient: Dysmsapi20170525;
    userInfo?: UserInfo;
    userId?: string;
  }>()
  .create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
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
