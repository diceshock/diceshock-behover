import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod/v4";
import type { HonoCtxEnv } from "@/shared/types";
import {
  miniappLogin,
  miniappLogout,
  miniappVerify,
} from "../services/miniappAuth";

// Only platform authentication is HTTP. Business operations use /graphql.
export const miniappRoutes = new Hono<HonoCtxEnv>();
const code = z.string().trim().min(1).max(160);
miniappRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});
miniappRoutes.onError((error, c) => {
  if (error instanceof HTTPException)
    return c.json({ message: error.message }, error.status);
  return c.json({ message: "登录服务暂时不可用" }, 500);
});
miniappRoutes.post("/login", async (c) => {
  const input = z
    .object({ code })
    .safeParse(await c.req.json().catch(() => null));
  if (!input.success) throw new HTTPException(400, { message: "登录参数无效" });
  return c.json(await miniappLogin(c.env, input.data.code));
});
miniappRoutes.post("/verify", async (c) => {
  const input = z
    .object({
      code,
      phoneCode: code,
      nickname: z.string().trim().min(1).max(24),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!input.success)
    throw new HTTPException(400, { message: "请填写昵称并验证手机号" });
  return c.json(
    await miniappVerify(
      c.env,
      input.data.code,
      input.data.phoneCode,
      input.data.nickname,
    ),
  );
});
miniappRoutes.post("/logout", async (c) => {
  await miniappLogout(c.env.DB, c.req.header("Authorization"));
  return c.body(null, 204);
});
