import dbFactory, { accounts, sessions, userInfoTable, users } from "@lib/db";
import { and, eq, gt } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { nanoid } from "nanoid";
import { subject, verifiedPhone } from "../providers/wechatMiniapp";

type Env = Pick<
  Cloudflare.Env,
  "DB" | "KV" | "WECHAT_MINIAPP_APP_ID" | "WECHAT_MINIAPP_APP_SECRET"
>;
type Account = { id: string; nickname: string; phone: string | null };

const tokenPrefix = "dsmini_";
const storedPrefix = "ds-miniapp:";
const bearer = (authorization?: string) =>
  authorization?.match(/^Bearer (dsmini_[\da-f-]{72})$/i)?.[1];

async function tokenKey(token: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return (
    storedPrefix +
    Array.from(new Uint8Array(bytes), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("")
  );
}

const accountFields = {
  id: users.id,
  nickname: userInfoTable.nickname,
  phone: userInfoTable.phone,
};
const lookupAccount = (db: Env["DB"], provider: string, openid: string) =>
  dbFactory(db)
    .select(accountFields)
    .from(accounts)
    .innerJoin(users, eq(users.id, accounts.userId))
    .innerJoin(userInfoTable, eq(userInfoTable.id, users.id))
    .where(
      and(
        eq(accounts.provider, provider),
        eq(accounts.providerAccountId, openid),
        eq(users.disabled, false),
      ),
    )
    .get();

async function issueSession(db: Env["DB"], account: Account) {
  const token = tokenPrefix + crypto.randomUUID() + crypto.randomUUID();
  await dbFactory(db)
    .insert(sessions)
    .values({
      sessionToken: await tokenKey(token),
      userId: account.id,
      expires: new Date(Date.now() + 7 * 86400000),
    });
  return {
    accessToken: token,
    profile: {
      id: account.id,
      nickname: account.nickname,
      phoneVerified: Boolean(account.phone),
    },
  };
}

export async function miniappLogin(env: Env, code: string) {
  const { provider, openid } = await subject(env, code);
  const account = await lookupAccount(env.DB, provider, openid);
  return account?.phone
    ? issueSession(env.DB, account)
    : { accessToken: null, profile: null };
}

export async function miniappVerify(
  env: Env,
  code: string,
  phoneCode: string,
  nickname: string,
) {
  const [{ provider, openid }, phone] = await Promise.all([
    subject(env, code),
    verifiedPhone(env, phoneCode),
  ]);
  const now = Date.now();
  const userId = crypto.randomUUID();
  const db = env.DB;
  await db.batch([
    db
      .prepare(`INSERT INTO "user"(id,name,role,disabled)
      SELECT ?,?,'customer',0 WHERE NOT EXISTS(SELECT 1 FROM user_info WHERE phone=?)
        AND NOT EXISTS(SELECT 1 FROM account WHERE provider=? AND providerAccountId=?)`)
      .bind(userId, nickname, phone, provider, openid),
    db
      .prepare(`INSERT INTO user_info(id,uid,nickname,phone,points,create_at)
      SELECT id,?,?,?,0,? FROM "user" WHERE id=?`)
      .bind(nanoid(), nickname, phone, now, userId),
    db
      .prepare(`INSERT INTO account("userId",type,provider,"providerAccountId")
      SELECT i.id,'oauth',?,? FROM user_info i JOIN "user" u ON u.id=i.id
      WHERE i.phone=? AND u.disabled=0 AND (SELECT count(*) FROM user_info WHERE phone=?)=1
      ON CONFLICT(provider,providerAccountId) DO NOTHING`)
      .bind(provider, openid, phone, phone),
  ]);
  const account = await lookupAccount(db, provider, openid);
  if (!account || account.phone !== phone) {
    throw new HTTPException(409, {
      message: "手机号与现有会员资料需要核对，请联系店员",
    });
  }
  return issueSession(db, account);
}

export async function miniappAccount(db: Env["DB"], authorization?: string) {
  const token = bearer(authorization);
  if (!token) throw new HTTPException(401, { message: "请先微信登录" });
  const account = await dbFactory(db)
    .select(accountFields)
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(userInfoTable, eq(userInfoTable.id, users.id))
    .where(
      and(
        eq(sessions.sessionToken, await tokenKey(token)),
        gt(sessions.expires, new Date()),
        eq(users.disabled, false),
      ),
    )
    .get();
  if (!account?.phone)
    throw new HTTPException(401, { message: "请重新登录并验证手机号" });
  return account;
}

export async function miniappLogout(db: Env["DB"], authorization?: string) {
  const token = bearer(authorization);
  if (token)
    await dbFactory(db)
      .delete(sessions)
      .where(eq(sessions.sessionToken, await tokenKey(token)));
}
