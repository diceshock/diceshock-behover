import { getAuthUser } from "@hono/auth-js";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod/v4";
import type { HonoCtxEnv } from "@/shared/types";
import * as data from "./data";
import { miniappAccount, miniappLogin, miniappLogout, miniappVerify } from "./miniappAuth";

type Ctx = Context<HonoCtxEnv>;
const code = z.string().trim().min(1).max(160);
const reason = z.string().trim().max(300).default("");
const requiredId = z.string().trim().min(1).max(100);
const revision = z.number().int().positive();
const offset = (c: Ctx) => parse(z.coerce.number().int().min(0).max(10_000), c.req.query("offset") ?? 0);

function parse<T>(schema: z.ZodType<T>, input: unknown) {
  const result = schema.safeParse(input);
  if (!result.success) throw new HTTPException(400, { message: result.error.issues[0]?.message ?? "请求格式不正确" });
  return result.data;
}

async function body<T>(c: Ctx, schema: z.ZodType<T>) {
  return parse(schema, await c.req.json().catch(() => null));
}

const player = (c: Ctx) => miniappAccount(c.env.DB, c.req.header("Authorization"));

async function staff(c: Ctx) {
  const auth = await getAuthUser(c);
  const id = auth?.token?.sub || auth?.user?.id;
  if (!id) throw new HTTPException(401, { message: "请登录 DiceShock 网页工作台" });
  return data.operator(c.env.DB, id);
}

export const trpgRoutes = new Hono<HonoCtxEnv>();
trpgRoutes.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ message: error.message }, error.status);
  console.error("[trpg]", error instanceof Error ? error.name : "UnknownError");
  return c.json({ message: "跑团服务暂时不可用，请重试" }, 500);
});
trpgRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (c.req.path.includes("/manage/") && c.req.method !== "GET") {
    const origin = c.req.header("Origin");
    const expected = c.env.AUTH_URL ? new URL(c.env.AUTH_URL).origin : new URL(c.req.url).origin;
    if (!origin || (origin !== expected && origin !== new URL(c.req.url).origin)) {
      throw new HTTPException(403, { message: "请从 DiceShock 工作台操作" });
    }
  }
  await next();
});

trpgRoutes.get("/stores", async (c) => c.json(await data.stores(c.env.DB)));
trpgRoutes.get("/sessions", async (c) => {
  const filters = parse(z.object({ date: z.iso.date().optional(), rule: z.string().max(40).optional(),
    tag: z.string().max(20).optional(), available: z.enum(["1"]).optional() }), c.req.query());
  return c.json(await data.sessions(c.env.DB, c.req.query("store") ?? null, offset(c), {
    date: filters.date ?? "", rule: filters.rule ?? "", tag: filters.tag ?? "", available: filters.available === "1",
  }));
});
trpgRoutes.get("/sessions/:id", async (c) => c.json(await data.session(c.env.DB, c.req.param("id"))));
trpgRoutes.post("/login", async (c) => {
  const input = await body(c, z.object({ code }));
  return c.json(await miniappLogin(c.env, input.code));
});
trpgRoutes.post("/verify", async (c) => {
  const input = await body(c, z.object({ code, phoneCode: code, nickname: z.string().trim().min(1).max(24) }));
  return c.json(await miniappVerify(c.env, input.code, input.phoneCode, input.nickname));
});
trpgRoutes.get("/me", async (c) => {
  const account = await player(c);
  return c.json({ id: account.id, nickname: account.nickname, ...(await data.wallet(c.env.DB, account.id)) });
});
trpgRoutes.post("/me/logout", async (c) => {
  await miniappLogout(c.env.DB, c.req.header("Authorization"));
  return c.body(null, 204);
});
trpgRoutes.get("/me/registrations", async (c) => {
  const account = await player(c);
  return c.json(await data.playerRecords(c.env.DB, account.id, false, offset(c)));
});
trpgRoutes.get("/me/history", async (c) => {
  const account = await player(c);
  return c.json(await data.playerRecords(c.env.DB, account.id, true, offset(c)));
});
trpgRoutes.get("/me/sessions/:id", async (c) => {
  const account = await player(c);
  const id = c.req.param("id");
  await data.session(c.env.DB, id);
  const [booking, roster] = await Promise.all([
    data.personalBooking(c.env.DB, id, account.id),
    data.roster(c.env.DB, id),
  ]);
  return c.json({ booking, roster });
});
trpgRoutes.post("/me/sessions/:id/:action", async (c) => {
  const account = await player(c);
  const action = parse(z.enum(["join", "withdraw"]), c.req.param("action"));
  await (action === "join" ? data.joinSession : data.withdraw)(c.env.DB, c.req.param("id"), account.id);
  return c.body(null, 204);
});

trpgRoutes.get("/manage/sessions", async (c) => {
  const actor = await staff(c);
  return c.json(await data.managedSessions(c.env.DB, actor, parse(requiredId.optional(), c.req.query("store")) ?? null, offset(c)));
});
trpgRoutes.get("/manage/stores", async (c) => {
  const actor = await staff(c);
  const stores = (await data.stores(c.env.DB))
    .filter((store) => data.canReview(actor, store.id) || actor.hostStores.includes(store.id));
  return c.json({ stores, admin: actor.role === "admin" });
});
trpgRoutes.get("/manage/permissions", async (c) => {
  const actor = await staff(c);
  const store = parse(requiredId, c.req.query("store"));
  const canReview = data.canReview(actor, store);
  if (!canReview && !actor.hostStores.includes(store)) throw new HTTPException(403, { message: "没有该门店权限" });
  const hosts = canReview ? (await c.env.DB.prepare(`SELECT u.id,i.nickname FROM "user" u JOIN user_info i ON u.id=i.id
    WHERE u.disabled=0 AND u.id<>? AND (u.role='admin' OR
      EXISTS (SELECT 1 FROM json_each(i.trpg_host_stores) WHERE value=?) OR
      (u.role='staff' AND EXISTS (SELECT 1 FROM json_each(i.trpg_staff_stores) WHERE value=?)))
    ORDER BY i.nickname LIMIT 100`).bind(actor.id, store, store).all()).results : [];
  return c.json({ canReview, hosts });
});
trpgRoutes.get("/manage/tables", async (c) => {
  const actor = await staff(c);
  const store = parse(requiredId, c.req.query("store"));
  if (!data.canReview(actor, store) && !actor.hostStores.includes(store)) throw new HTTPException(403, { message: "没有该门店权限" });
  return c.json(await data.tables(c.env.DB, store));
});
trpgRoutes.post("/manage/sessions", async (c) => {
  const actor = await staff(c);
  return c.json(await data.createSession(c.env.DB, actor, await body(c, data.sessionInput)), 201);
});
trpgRoutes.post("/manage/sessions/:id/resubmit", async (c) => {
  const actor = await staff(c);
  const input = await body(c, z.object({ revision, session: data.sessionInput }));
  await data.resubmitSession(c.env.DB, actor, c.req.param("id"), input.revision, input.session);
  return c.body(null, 204);
});
trpgRoutes.post("/manage/sessions/:id/transition", async (c) => {
  const actor = await staff(c);
  const input = await body(c, z.object({ revision, action: z.enum(["approve", "return", "cancel", "complete"]), reason })
    .refine((value) => !["return", "cancel"].includes(value.action) || !!value.reason, "请填写原因"));
  await data.transition(c.env.DB, actor, c.req.param("id"), input.revision, input.action, input.reason);
  return c.body(null, 204);
});
trpgRoutes.post("/manage/sessions/:id/schedule", async (c) => {
  const actor = await staff(c);
  const input = await body(c, z.object({ revision, tableId: requiredId, startsAt: z.iso.datetime({ offset: true }),
    deadline: z.iso.datetime({ offset: true }) }));
  await data.scheduleSession(c.env.DB, actor, c.req.param("id"), input.revision, input.tableId, input.startsAt, input.deadline);
  return c.body(null, 204);
});
trpgRoutes.get("/manage/sessions/:id/roster", async (c) => c.json(await data.roster(c.env.DB, c.req.param("id"), await staff(c))));
trpgRoutes.post("/manage/sessions/:id/roster/:registration", async (c) => {
  const actor = await staff(c);
  const input = await body(c, z.object({ decision: z.enum(["approve", "reject", "withdraw"]), depositConfirmed: z.boolean().default(false), reason })
    .refine((value) => value.decision === "approve" || !!value.reason, "请填写原因"));
  await data.reviewBooking(c.env.DB, actor, c.req.param("id"), c.req.param("registration"), input.decision, input.depositConfirmed, input.reason);
  return c.body(null, 204);
});
trpgRoutes.get("/manage/members", async (c) => {
  const actor = await staff(c);
  const store = parse(requiredId, c.req.query("store"));
  if (!data.canReview(actor, store)) throw new HTTPException(403, { message: "没有该门店权限" });
  const search = parse(z.string().trim().min(2).max(80), c.req.query("q"));
  const result = await c.env.DB.prepare(`SELECT i.id,i.uid,i.nickname
    FROM user_info i JOIN "user" u ON u.id=i.id
    WHERE u.disabled=0
      AND (instr(lower(i.nickname),lower(?1))>0 OR instr(lower(i.uid),lower(?1))>0 OR i.phone=?1)
      AND (?2 OR EXISTS(SELECT 1 FROM active_registrations r JOIN actives a ON a.id=r.active_id
        WHERE r.user_id=i.id AND r.trpg_status IS NOT NULL AND a.store_id=?3))
    ORDER BY i.nickname,i.id LIMIT 20`).bind(search, Number(actor.role === "admin"), store).all();
  return c.json(result.results);
});
trpgRoutes.get("/manage/members/:id/history", async (c) => {
  const actor = await staff(c);
  const store = parse(requiredId, c.req.query("store"));
  if (!data.canReview(actor, store)) throw new HTTPException(403, { message: "没有该门店权限" });
  return c.json(await data.playerRecords(c.env.DB, c.req.param("id"), true, offset(c), actor.role === "admin" ? null : store));
});
trpgRoutes.post("/manage/access", async (c) => {
  const actor = await staff(c);
  if (actor.role !== "admin") throw new HTTPException(403, { message: "仅管理员可修改权限" });
  const input = await body(c, z.object({ id: requiredId, store: requiredId, staff: z.boolean(), host: z.boolean() }));
  const target = await data.operator(c.env.DB, input.id);
  if (input.staff && target.role !== "staff") throw new HTTPException(400, { message: "请先在用户管理将该账号设为店员" });
  const result = await c.env.DB.prepare(`UPDATE user_info SET
    trpg_staff_stores=(SELECT json_group_array(value) FROM (
      SELECT value FROM json_each(trpg_staff_stores) WHERE value<>?1 UNION SELECT ?1 WHERE ?2)),
    trpg_host_stores=(SELECT json_group_array(value) FROM (
      SELECT value FROM json_each(trpg_host_stores) WHERE value<>?1 UNION SELECT ?1 WHERE ?3))
    WHERE id=?4 AND EXISTS (SELECT 1 FROM stores WHERE id=?1 AND is_active=1)`)
    .bind(input.store, Number(input.staff), Number(input.host), input.id).run();
  if (!result.meta.changes) throw new HTTPException(404, { message: "会员不存在" });
  return c.body(null, 204);
});
