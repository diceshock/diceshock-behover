import { HTTPException } from "hono/http-exception";
import { z } from "zod/v4";

type Db = Cloudflare.Env["DB"];
type Role = "admin" | "staff" | "customer";
export type Operator = { id: string; role: Role; staffStores: string[]; hostStores: string[] };
const activeStates = "'interested','pending','confirmed'";
const heldStates = "'pending','confirmed'";
const overlap = `NOT EXISTS (SELECT 1 FROM actives other WHERE other.id<>? AND other.trpg_state='published'
  AND (other.creator_id=? OR other.trpg_table_id=?) AND other.trpg_starts_at<?
  AND other.trpg_starts_at + other.trpg_duration*60000>?)`;
const suitableTable = `EXISTS(SELECT 1 FROM tables t WHERE t.id=? AND t.store_id=? AND t.status='active'
  AND t.scope IN ('trpg','boardgame') AND t.capacity>=?)`;

export const sessionInput = z.object({
  requestId: z.uuid(), storeId: z.string().min(1).max(100), tableId: z.string().min(1).max(100).nullable(),
  hostId: z.string().min(1).max(100).optional(),
  title: z.string().trim().min(1).max(100), moduleName: z.string().trim().max(100),
  gameSystem: z.string().trim().min(1).max(40), description: z.string().trim().min(1).max(1000),
  startsAt: z.iso.datetime({ offset: true }).nullable(), deadline: z.iso.datetime({ offset: true }).nullable(),
  timeHint: z.string().trim().max(40).default(""), tags: z.array(z.string().trim().min(1).max(20)).max(8).default([]),
  capacity: z.number().int().min(1).max(6).default(6), minimum: z.number().int().min(1).max(6).default(4),
  durationMinutes: z.number().int().min(1).max(1440).default(300),
  feeCents: z.number().int().min(0).max(999999).default(11800),
}).refine((v) => v.minimum <= v.capacity &&
  (v.startsAt === null ? v.deadline === null && v.tableId === null : !!v.tableId && !!v.deadline &&
  Date.parse(v.deadline) <= Date.parse(v.startsAt)), "请核对席位、桌位和报名时间");

type SessionInput = z.output<typeof sessionInput>;
type SessionRow = {
  id: string; title: string; description: string; storeId: string; storeName: string; address: string | null;
  tableId: string | null; tableName: string | null; creatorId: string; hostName: string | null;
  moduleName: string; gameSystem: string; minimum: number; capacity: number; startsAt: number | null;
  deadline: number | null; priorityUntil: number | null; closedAt: number | null; durationMinutes: number;
  feeCents: number; timeHint: string; tags: string; revision: number; reason: string | null;
  changedBy: string | null; changedAt: number | null;
  status: "pending" | "returned" | "published" | "cancelled" | "completed"; confirmedCount: number;
  heldCount: number; interestedCount: number;
};
const selectSessions = `SELECT a.id,a.title,a.content AS description,a.store_id AS storeId,s.name AS storeName,s.address,
  a.trpg_table_id AS tableId,t.name AS tableName,a.creator_id AS creatorId,coalesce(ui.nickname,u.name) AS hostName,
  a.trpg_module AS moduleName,a.trpg_system AS gameSystem,a.trpg_min_players AS minimum,a.max_players AS capacity,
  a.trpg_starts_at AS startsAt,a.trpg_deadline AS deadline,a.trpg_priority_until AS priorityUntil,a.trpg_closed_at AS closedAt,
  a.trpg_duration AS durationMinutes,a.trpg_fee AS feeCents,a.trpg_time_hint AS timeHint,a.trpg_tags AS tags,
  a.trpg_state AS status,a.trpg_reason AS reason,a.trpg_revision AS revision,
  a.update_at AS changedAt,(SELECT coalesce(info.nickname,usr.name) FROM "user" usr
    LEFT JOIN user_info info ON info.id=usr.id WHERE usr.id=a.trpg_changed_by) AS changedBy,
  (SELECT count(*) FROM active_registrations r WHERE r.active_id=a.id AND r.trpg_status='confirmed') AS confirmedCount,
  (SELECT count(*) FROM active_registrations r WHERE r.active_id=a.id AND r.trpg_status IN (${heldStates})) AS heldCount,
  (SELECT count(*) FROM active_registrations r WHERE r.active_id=a.id AND r.trpg_status='interested') AS interestedCount
  FROM actives a JOIN stores s ON s.id=a.store_id JOIN "user" u ON u.id=a.creator_id
  LEFT JOIN user_info ui ON ui.id=u.id LEFT JOIN tables t ON t.id=a.trpg_table_id`;

function publicSession(row: SessionRow) {
  const { creatorId: _creator, revision: _revision, reason: _reason, changedBy: _changedBy, changedAt: _changedAt, heldCount, tags, ...rest } = row;
  return {
    ...rest,
    tags: JSON.parse(tags ?? "[]") as string[],
    remaining: row.capacity - heldCount,
    pendingCount: heldCount - row.confirmedCount,
    registrationOpen: row.status === "published" && (row.deadline === null || row.deadline > Date.now()),
  };
}

const conflict = (message: string) => new HTTPException(409, { message });
const noAccess = () => new HTTPException(403, { message: "没有该门店的跑团管理权限" });
export const canReview = (actor: Operator, store: string) =>
  actor.role === "admin" || (actor.role === "staff" && actor.staffStores.includes(store));
const canHost = (actor: Operator, store: string) => canReview(actor, store) || actor.hostStores.includes(store);

export async function operator(db: Db, id: string) {
  const row = await db.prepare(`SELECT u.id,u.role,i.trpg_staff_stores AS staffStores,i.trpg_host_stores AS hostStores
    FROM "user" u LEFT JOIN user_info i ON i.id=u.id WHERE u.id=? AND u.disabled=0`)
    .bind(id).first<{ id: string; role: Role; staffStores: string | null; hostStores: string | null }>();
  if (!row) throw new HTTPException(401, { message: "请重新登录" });
  return { ...row, staffStores: JSON.parse(row.staffStores ?? "[]"), hostStores: JSON.parse(row.hostStores ?? "[]") } as Operator;
}

export async function stores(db: Db) {
  return (await db.prepare("SELECT id,code,name,address FROM stores WHERE is_active=1 ORDER BY name")
    .all<{ id: string; code: string | null; name: string; address: string | null }>()).results;
}

export async function tables(db: Db, store: string) {
  return (await db.prepare(`SELECT id,name,capacity FROM tables WHERE store_id=? AND status='active'
    AND scope IN ('trpg','boardgame') ORDER BY name`).bind(store).all()).results;
}

export async function sessions(db: Db, store: string | null, offset: number,
  filters: { date?: string; rule?: string; tag?: string; available?: boolean } = {}) {
  const { results } = await db.prepare(`${selectSessions}
    WHERE a.trpg_state='published' AND s.is_active=1 AND (?1 IS NULL OR a.store_id=?1)
      AND (a.trpg_starts_at IS NULL OR a.trpg_starts_at>?2)
      AND (?4 IS NULL OR a.date=?4) AND (?5 IS NULL OR instr(lower(a.trpg_system),lower(?5))>0)
      AND (?6 IS NULL OR EXISTS(SELECT 1 FROM json_each(a.trpg_tags) WHERE lower(value)=lower(?6)))
      AND (?7=0 OR (a.trpg_starts_at IS NOT NULL AND a.trpg_deadline>?2 AND a.max_players>
        (SELECT count(*) FROM active_registrations r WHERE r.active_id=a.id AND r.trpg_status IN (${heldStates}))))
    ORDER BY a.trpg_starts_at IS NULL,a.trpg_starts_at,a.id LIMIT 30 OFFSET ?3`)
    .bind(store, Date.now(), offset, filters.date || null, filters.rule || null, filters.tag || null, Number(!!filters.available)).all<SessionRow>();
  return results.map(publicSession);
}

async function findSession(db: Db, id: string) {
  const row = await db.prepare(`${selectSessions} WHERE a.id=? AND a.trpg_state IS NOT NULL`)
    .bind(id).first<SessionRow>();
  if (!row) throw new HTTPException(404, { message: "场次不存在" });
  return row;
}

export async function session(db: Db, id: string) {
  const row = await findSession(db, id);
  if (row.status === "pending" || row.status === "returned") throw new HTTPException(404, { message: "场次未发布" });
  return publicSession(row);
}

export async function managedSessions(db: Db, actor: Operator, store: string | null, offset: number) {
  if (store && !canHost(actor, store)) throw noAccess();
  const staffStores = JSON.stringify(actor.role === "staff" ? actor.staffStores : []);
  const hostStores = JSON.stringify(actor.hostStores);
  const { results } = await db.prepare(`${selectSessions}
    WHERE a.trpg_state IS NOT NULL AND (?1 IS NULL OR a.store_id=?1)
      AND (?2 OR EXISTS(SELECT 1 FROM json_each(?3) WHERE value=a.store_id) OR
        (a.creator_id=?4 AND EXISTS(SELECT 1 FROM json_each(?5) WHERE value=a.store_id)))
    ORDER BY CASE WHEN a.trpg_state IN ('pending','returned') THEN 0
      WHEN a.trpg_state='published' AND (a.trpg_starts_at>?6 OR a.trpg_starts_at IS NULL) THEN 1 ELSE 2 END,
      CASE WHEN a.trpg_starts_at>?6 THEN a.trpg_starts_at END ASC NULLS LAST,
      coalesce(a.trpg_starts_at,a.create_at) DESC,a.id LIMIT 30 OFFSET ?7`)
    .bind(store, Number(actor.role === "admin"), staffStores, actor.id, hostStores, Date.now(), offset).all<SessionRow>();
  return results.map((row) => ({ ...publicSession(row), revision: row.revision, reason: row.reason, changedBy: row.changedBy, changedAt: row.changedAt, canReview: canReview(actor, row.storeId) }));
}

function localDateParts(instant: number | null) {
  const local = instant === null ? "" : new Date(instant + 28_800_000).toISOString();
  return [local.slice(0, 10), local.slice(11, 16) || null] as const;
}

export async function createSession(db: Db, actor: Operator, input: SessionInput) {
  if (!canHost(actor, input.storeId)) throw noAccess();
  const host = input.hostId && input.hostId !== actor.id ? await operator(db, input.hostId) : actor;
  if (host.id !== actor.id && (!canReview(actor, input.storeId) || !canHost(host, input.storeId))) throw noAccess();
  const now = Date.now();
  const start = input.startsAt === null ? null : Date.parse(input.startsAt);
  const cutoff = input.deadline === null ? null : Date.parse(input.deadline);
  if (cutoff !== null && cutoff <= now) throw conflict("报名截止时间须在未来");
  const [date, time] = localDateParts(start);
  const state = canReview(actor, input.storeId) ? "published" : "pending";
  const created = await db.prepare(`INSERT INTO actives
    (id,creator_id,title,store_id,date,time,max_players,content,is_game,is_system_recommended,create_at,update_at,
     trpg_state,trpg_module,trpg_system,trpg_min_players,trpg_table_id,trpg_duration,trpg_fee,trpg_starts_at,trpg_deadline,trpg_time_hint,trpg_tags)
    SELECT ?,?,?,?,?,?,?,?,0,0,?,?,?,?,?,?,?,?,?,?,?,?,?
    WHERE EXISTS(SELECT 1 FROM stores WHERE id=? AND is_active=1)
      AND (? IS NULL OR ${suitableTable})
      AND (?='pending' OR ? IS NULL OR ${overlap})
    ON CONFLICT(id) DO NOTHING`)
    .bind(input.requestId, host.id, input.title, input.storeId, date, time, input.capacity, input.description,
      now, now, state, input.moduleName || "模组待定", input.gameSystem, input.minimum, input.tableId,
      input.durationMinutes, input.feeCents, start, cutoff, input.timeHint, JSON.stringify(input.tags),
      input.storeId, start, input.tableId, input.storeId, input.capacity, state, start,
      input.requestId, host.id, input.tableId, (start ?? 0) + input.durationMinutes * 60_000, start).run();
  if (!created.meta.changes) {
    const previous = await db.prepare("SELECT creator_id,store_id FROM actives WHERE id=? AND trpg_state IS NOT NULL")
      .bind(input.requestId).first<{ creator_id: string; store_id: string }>();
    if (previous?.creator_id !== host.id || previous.store_id !== input.storeId) {
      throw conflict("门店或桌位不可用，或场次和主持人排期冲突");
    }
  }
  const row = await findSession(db, input.requestId);
  return { ...publicSession(row), revision: row.revision, reason: row.reason };
}

export async function resubmitSession(db: Db, actor: Operator, id: string, revision: number, input: SessionInput) {
  const row = await findSession(db, id);
  if (!canHost(actor, row.storeId) || (row.creatorId !== actor.id && !canReview(actor, row.storeId))) throw noAccess();
  if (input.storeId !== row.storeId) throw conflict("已提交场次不能更换门店");
  const now = Date.now();
  const start = input.startsAt === null ? null : Date.parse(input.startsAt);
  const cutoff = input.deadline === null ? null : Date.parse(input.deadline);
  if (cutoff !== null && cutoff <= now) throw conflict("报名截止时间须在未来");
  const [date, time] = localDateParts(start);
  const result = await db.prepare(`UPDATE actives SET title=?,content=?,date=?,time=?,max_players=?,trpg_module=?,
    trpg_system=?,trpg_min_players=?,trpg_table_id=?,trpg_duration=?,trpg_fee=?,trpg_starts_at=?,trpg_deadline=?,
    trpg_time_hint=?,trpg_tags=?,trpg_state='pending',trpg_reason=NULL,trpg_changed_by=NULL,trpg_revision=trpg_revision+1,update_at=?
    WHERE id=? AND trpg_state='returned' AND trpg_revision=? AND (? IS NULL OR ${suitableTable})`)
    .bind(input.title, input.description, date, time, input.capacity, input.moduleName || "模组待定", input.gameSystem,
      input.minimum, input.tableId, input.durationMinutes, input.feeCents, start, cutoff, input.timeHint,
      JSON.stringify(input.tags), now, id, revision, start, input.tableId, row.storeId, input.capacity).run();
  if (!result.meta.changes) throw conflict("场次已变更或桌位不可用");
}

export async function transition(db: Db, actor: Operator, id: string, revision: number,
  action: "approve" | "return" | "cancel" | "complete", reason: string) {
  const row = await findSession(db, id);
  if (!canReview(actor, row.storeId)) throw noAccess();
  const before = action === "approve" || action === "return" ? "pending" : "published";
  const after = { approve: "published", return: "returned", cancel: "cancelled", complete: "completed" }[action];
  const now = Date.now();
  if (action === "complete" && (row.startsAt === null || row.startsAt > now)) throw conflict("场次开始后才能结团");
  if (action === "approve" && row.deadline !== null && row.deadline <= now) throw conflict("报名已截止");
  const result = await db.prepare(`UPDATE actives SET trpg_state=?,trpg_reason=?,trpg_closed_at=?,trpg_changed_by=?,
    trpg_revision=trpg_revision+1,update_at=? WHERE id=? AND trpg_revision=? AND trpg_state=?
      AND (?<>'approve' OR trpg_starts_at IS NULL OR (${suitableTable} AND ${overlap}))`)
    .bind(after, reason || null, after === "cancelled" || after === "completed" ? now : null, actor.id, now, id, revision, before,
      action, row.tableId, row.storeId, row.capacity, id, row.creatorId, row.tableId,
      (row.startsAt ?? 0) + row.durationMinutes * 60_000, row.startsAt).run();
  if (!result.meta.changes) throw conflict("场次已变更或发生排期冲突，请刷新");
}

export async function scheduleSession(db: Db, actor: Operator, id: string, revision: number,
  tableId: string, startsAt: string, deadline: string) {
  const row = await findSession(db, id);
  if (!canReview(actor, row.storeId)) throw noAccess();
  const start = Date.parse(startsAt);
  const cutoff = Date.parse(deadline);
  const now = Date.now();
  if (cutoff <= now || cutoff > start) throw conflict("请核对开团和报名截止时间");
  const priority = Math.min(now + 86_400_000, cutoff - 3_600_000);
  const [date, time] = localDateParts(start);
  const result = await db.prepare(`UPDATE actives SET date=?,time=?,trpg_starts_at=?,trpg_deadline=?,trpg_table_id=?,
    trpg_priority_until=CASE WHEN EXISTS(SELECT 1 FROM active_registrations WHERE active_id=actives.id AND trpg_status='interested') THEN ? ELSE NULL END,
    trpg_revision=trpg_revision+1,trpg_changed_by=?,update_at=?
    WHERE id=? AND trpg_revision=? AND trpg_state='published' AND trpg_starts_at IS NULL
      AND (? > ? OR NOT EXISTS(SELECT 1 FROM active_registrations WHERE active_id=actives.id AND trpg_status='interested'))
      AND ${suitableTable} AND ${overlap}`)
    .bind(date, time, start, cutoff, tableId, priority, actor.id, now, id, revision, priority, now, tableId, row.storeId,
      row.capacity, id, row.creatorId, tableId, start + row.durationMinutes * 60_000, start).run();
  if (!result.meta.changes) throw conflict("场次已变更、桌位冲突或没有足够的优先确认时间");
}

export async function joinSession(db: Db, id: string, userId: string) {
  const now = Date.now();
  const result = await db.prepare(`INSERT INTO active_registrations (id,active_id,user_id,is_watching,create_at,trpg_status)
    SELECT ?,a.id,?,0,?,CASE WHEN a.trpg_starts_at IS NULL THEN 'interested' ELSE 'pending' END FROM actives a
    WHERE a.id=? AND a.trpg_state='published' AND a.creator_id<>? AND (a.trpg_deadline IS NULL OR a.trpg_deadline>?)
      AND (a.trpg_priority_until IS NULL OR a.trpg_priority_until<=? OR EXISTS
        (SELECT 1 FROM active_registrations r WHERE r.active_id=a.id AND r.user_id=? AND r.trpg_status='interested'))
      AND (a.trpg_starts_at IS NULL OR a.max_players>
        (SELECT count(*) FROM active_registrations r WHERE r.active_id=a.id AND r.trpg_status IN (${heldStates})))
    ON CONFLICT(active_id,user_id) WHERE trpg_status IN (${activeStates}) DO UPDATE SET
      id=excluded.id,trpg_status='pending',create_at=excluded.create_at
      WHERE active_registrations.trpg_status='interested' AND excluded.trpg_status='pending'`)
    .bind(crypto.randomUUID(), userId, now, id, userId, now, now, userId).run();
  if (!result.meta.changes) {
    const current = await db.prepare(`SELECT r.trpg_status AS status,a.trpg_starts_at AS startsAt FROM active_registrations r
      JOIN actives a ON a.id=r.active_id WHERE r.active_id=? AND r.user_id=? AND r.trpg_status IN (${activeStates})`)
      .bind(id, userId).first<{ status: string; startsAt: number | null }>();
    if (current && (current.status !== "interested" || current.startsAt === null)) return;
    throw conflict("报名已截止、正在优先确认、席位已满或你是本场主持人");
  }
}

export async function withdraw(db: Db, id: string, userId: string) {
  const result = await db.prepare(`UPDATE active_registrations SET trpg_status='withdrawn'
    WHERE active_id=? AND user_id=? AND trpg_status IN (${activeStates})
      AND EXISTS (SELECT 1 FROM actives WHERE id=? AND trpg_state='published'
        AND (trpg_deadline IS NULL OR trpg_deadline>?))`).bind(id, userId, id, Date.now()).run();
  if (!result.meta.changes) throw conflict("已取消或报名截止，请联系店员");
}

export async function reviewBooking(db: Db, actor: Operator, id: string, registrationId: string,
  decision: "approve" | "reject" | "withdraw", depositConfirmed: boolean, reason: string) {
  const row = await findSession(db, id);
  if (!canReview(actor, row.storeId)) throw noAccess();
  if (decision === "approve" && row.feeCents > 0 && !depositConfirmed) throw conflict("请先在微信群确认定金");
  const now = Date.now();
  const status = { approve: "confirmed", reject: "rejected", withdraw: "withdrawn" }[decision];
  const result = await db.prepare(`UPDATE active_registrations SET trpg_status=?,trpg_reason=?,trpg_reviewed_by=?,trpg_reviewed_at=?
    WHERE id=? AND active_id=? AND ((?='withdraw' AND trpg_status IN (${activeStates})) OR trpg_status='pending')
      AND EXISTS (SELECT 1 FROM actives WHERE id=? AND trpg_state='published'
        AND (trpg_starts_at>? OR (?='withdraw' AND trpg_starts_at IS NULL)))`)
    .bind(status, reason || null, actor.id, now, registrationId, id, decision, id, now, decision).run();
  if (!result.meta.changes) throw conflict("报名已变更或场次已开始");
}

export async function roster(db: Db, id: string, actor?: Operator) {
  const row = await findSession(db, id);
  const staff = actor && canReview(actor, row.storeId);
  const host = actor && canHost(actor, row.storeId) && row.creatorId === actor.id;
  if (actor && !staff && !host) throw noAccess();
  if (!actor && row.status !== "published") return [];
  const { results } = await db.prepare(`SELECT i.nickname
    ${actor ? ",r.id,r.trpg_status AS status" : ""}${staff ? ",i.phone,r.trpg_reason AS reason" : ""}
    FROM active_registrations r JOIN user_info i ON i.id=r.user_id WHERE r.active_id=?
      AND ${actor ? "r.trpg_status IS NOT NULL" : "r.trpg_status='confirmed'"} ORDER BY r.create_at,r.id`)
    .bind(id).all();
  return results;
}

export async function playerRecords(db: Db, userId: string, archive: boolean, offset: number, store: string | null = null) {
  const { results } = await db.prepare(`${selectSessions.replace("SELECT a.id", "SELECT r.trpg_status AS bookingStatus,r.trpg_reason AS bookingReason,a.id")}
    JOIN active_registrations r ON r.active_id=a.id
    WHERE r.user_id=?1 AND r.trpg_status IS NOT NULL AND (?2 IS NULL OR a.store_id=?2)
      AND r.id=(SELECT latest.id FROM active_registrations latest WHERE latest.active_id=a.id AND latest.user_id=?1
        AND latest.trpg_status IS NOT NULL ORDER BY (latest.trpg_status IN (${activeStates})) DESC,latest.create_at DESC,latest.id DESC LIMIT 1)
      AND (?3=0 OR (a.trpg_state='completed' AND r.trpg_status='confirmed'))
    ORDER BY coalesce(a.trpg_starts_at,a.create_at) DESC,a.id LIMIT 30 OFFSET ?4`)
    .bind(userId, store, Number(archive), offset).all<SessionRow & { bookingStatus: string; bookingReason: string | null }>();
  return results.map(publicSession);
}

export async function personalBooking(db: Db, id: string, userId: string) {
  return db.prepare(`SELECT r.trpg_status AS status,r.trpg_reason AS reason FROM active_registrations r
    WHERE r.active_id=? AND r.user_id=? AND r.trpg_status IS NOT NULL ORDER BY (r.trpg_status IN (${activeStates})) DESC,r.create_at DESC,r.id DESC LIMIT 1`)
    .bind(id, userId).first<{ status: string; reason: string | null }>();
}

export async function wallet(db: Db, userId: string) {
  return db.prepare(`SELECT coalesce(i.points,0) AS points, (SELECT coalesce(sum(amount),0)
    FROM user_membership_plans WHERE user_id=i.id AND plan_type='stored_value') AS balanceCents
    FROM user_info i WHERE i.id=?`).bind(userId).first<{ points: number; balanceCents: number }>();
}
