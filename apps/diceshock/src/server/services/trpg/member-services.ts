import type { Database } from "@lib/db";
import { sql } from "drizzle-orm";
import { forbidden, validationError } from "../../graphql/errors";
import {
  type Operator,
  requireDirectoryReviewer,
  requireReviewer,
} from "./access";

export type RewardInput = {
  id: string;
  title: string;
  description: string;
  cover: string;
  points: number;
  stock: number;
  active: boolean;
  revision: number;
};
type Reward = Omit<RewardInput, "active"> & { active: boolean };
export async function catalog(db: Database, managed = false) {
  const rows = await db.all<Reward>(
    sql`SELECT id,title,description,cover,points,stock,active,revision FROM trpg_rewards WHERE ${managed ? 1 : sql`active=1`} ORDER BY title,id LIMIT 100`,
  );
  return rows.map((r) => ({ ...r, active: Boolean(r.active) }));
}
export async function saveReward(
  db: Database,
  actor: Operator,
  input: RewardInput,
) {
  if (actor.role !== "admin") throw forbidden("仅管理员可维护兑换商品");
  const r =
    await db.run(sql`INSERT INTO trpg_rewards(id,title,description,cover,points,stock,active,updated_at)
    SELECT ${input.id},${input.title},${input.description},${input.cover},${input.points},${input.stock},${Number(input.active)},${Date.now()}
    WHERE ${input.revision}=0
    ON CONFLICT(id) DO NOTHING`);
  if (!r.meta.changes) {
    const update = await db.run(
      sql`UPDATE trpg_rewards SET title=${input.title},description=${input.description},cover=${input.cover},points=${input.points},stock=${input.stock},active=${Number(input.active)},revision=revision+1,updated_at=${Date.now()} WHERE id=${input.id} AND revision=${input.revision}`,
    );
    if (!update.meta.changes)
      throw validationError("revision", "商品已变化，请刷新后重试");
  }
}
export async function redeem(
  db: Database,
  actor: Operator,
  rewardId: string,
  requestId: string,
) {
  const existing = await db.get<{ id: string; rewardId: string }>(
    sql`SELECT id,reward_id AS rewardId FROM trpg_vouchers WHERE user_id=${actor.id} AND request_id=${requestId}`,
  );
  if (existing) {
    if (existing.rewardId !== rewardId)
      throw validationError("requestId", "兑换请求不一致");
    return existing.id;
  }
  const id = crypto.randomUUID();
  // Conditional insertion also makes concurrent retries a no-op before triggers.
  await db.run(sql`INSERT INTO trpg_vouchers(id,user_id,reward_id,title,points,request_id,created_at)
    SELECT ${id},${actor.id},r.id,r.title,r.points,${requestId},${Date.now()} FROM trpg_rewards r
    JOIN user_info i ON i.id=${actor.id} JOIN user u ON u.id=i.id
    WHERE r.id=${rewardId} AND r.active=1 AND r.stock>0 AND u.disabled=0 AND i.phone IS NOT NULL AND coalesce(i.points,0)>=r.points
    AND NOT EXISTS(SELECT 1 FROM trpg_vouchers WHERE user_id=${actor.id} AND request_id=${requestId})`);
  const voucher = await db.get<{ id: string; rewardId: string }>(
    sql`SELECT id,reward_id AS rewardId FROM trpg_vouchers WHERE user_id=${actor.id} AND request_id=${requestId}`,
  );
  if (!voucher)
    throw validationError("reward", "积分不足、商品已售罄或尚未验证手机号");
  if (voucher.rewardId !== rewardId)
    throw validationError("requestId", "兑换请求不一致");
  return voucher.id;
}
export async function vouchers(db: Database, userId: string, offset: number) {
  return db.all(
    sql`SELECT v.id,v.title,v.points,v.created_at AS createdAt,v.used_at AS usedAt,s.name AS usedStore FROM trpg_vouchers v LEFT JOIN stores s ON s.id=v.used_store_id WHERE user_id=${userId} ORDER BY v.created_at DESC,v.id LIMIT 30 OFFSET ${offset}`,
  );
}
export async function consume(
  db: Database,
  actor: Operator,
  id: string,
  storeId: string,
) {
  requireReviewer(actor, storeId);
  const r = await db.run(
    sql`UPDATE trpg_vouchers SET used_at=${Date.now()},used_by=${actor.id},used_store_id=${storeId} WHERE id=${id} AND used_at IS NULL AND EXISTS(SELECT 1 FROM stores WHERE id=${storeId} AND is_active=1)`,
  );
  if (!r.meta.changes)
    throw validationError("voucher", "券号不存在、已核销或门店不可用");
}
export async function sendMail(
  db: Database,
  actor: Operator,
  kind: string,
  message: string,
  requestId: string,
) {
  const existing = await db.get<{ kind: string; message: string }>(
    sql`SELECT kind,message FROM trpg_mail WHERE user_id=${actor.id} AND request_id=${requestId}`,
  );
  if (existing) {
    if (existing.kind !== kind || existing.message !== message)
      throw validationError("requestId", "来信请求不一致");
    return;
  }
  const r =
    await db.run(sql`INSERT INTO trpg_mail(id,user_id,kind,message,request_id,created_at)
    SELECT ${crypto.randomUUID()},${actor.id},${kind},${message},${requestId},${Date.now()}
    WHERE (SELECT count(*) FROM trpg_mail WHERE user_id=${actor.id} AND created_at>${Date.now() - 3600000})<10
    ON CONFLICT(user_id,request_id) DO NOTHING`);
  if (!r.meta.changes)
    throw validationError("message", "投递过于频繁，请稍后再试");
}
export async function mailbox(
  db: Database,
  actor: Operator,
  managed: boolean,
  offset: number,
) {
  if (managed) requireDirectoryReviewer(actor);
  return db.all<{
    id: string;
    kind: string;
    message: string;
    reply: string | null;
    createdAt: number;
    nickname: string;
  }>(
    sql`SELECT m.id,m.kind,m.message,m.reply,m.created_at AS createdAt,i.nickname FROM trpg_mail m JOIN user_info i ON i.id=m.user_id WHERE ${managed ? 1 : sql`m.user_id=${actor.id}`} ORDER BY m.created_at DESC,m.id LIMIT 30 OFFSET ${offset}`,
  );
}
export async function replyMail(
  db: Database,
  actor: Operator,
  id: string,
  reply: string,
) {
  requireDirectoryReviewer(actor);
  const r = await db.run(
    sql`UPDATE trpg_mail SET reply=${reply},replied_by=${actor.id},replied_at=${Date.now()} WHERE id=${id}`,
  );
  if (!r.meta.changes) throw validationError("id", "来信不存在");
}
