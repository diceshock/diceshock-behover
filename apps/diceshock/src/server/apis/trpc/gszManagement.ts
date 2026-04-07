import db, {
  mahjongMatchesTable,
  mahjongRegistrationsTable,
  tempIdentitiesTable,
  users,
} from "@lib/db";
import { eq, inArray } from "drizzle-orm";
import z from "zod/v4";
import type { MatchState } from "@/shared/mahjong/types";
import { dashProcedure } from "./baseTRPC";
import { type GszPageResult, gszFetch } from "./gszApi";

type ModeFilter = "all" | "3p" | "4p";
type FormatFilter = "all" | "tonpuu" | "hanchan";
type CompletionFilter = "all" | "completed" | "incomplete";
type GszSyncFilter = "all" | "synced" | "unsynced";

export type UnsyncableReason = {
  nickname: string;
  userId: string;
  reason: "no_phone" | "temp_user";
};

const list = dashProcedure
  .input((v: unknown) => {
    const data = v as {
      search?: string;
      mode?: ModeFilter;
      format?: FormatFilter;
      completion?: CompletionFilter;
      gszSync?: GszSyncFilter;
      tableId?: string;
      startDate?: number;
      endDate?: number;
      page?: number;
      pageSize?: number;
    };
    return {
      search: data.search ?? "",
      mode: data.mode ?? "all",
      format: data.format ?? "all",
      completion: data.completion ?? "all",
      gszSync: (data.gszSync ?? "all") as GszSyncFilter,
      tableId: data.tableId ?? "",
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      page: data.page ?? 1,
      pageSize: data.pageSize ?? 50,
    };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const matches = await tdb.query.mahjongMatchesTable.findMany({
      orderBy: (m, { desc }) => desc(m.created_at),
    });

    const tables = await tdb.query.tablesTable.findMany({
      columns: { id: true, name: true, code: true, scope: true },
    });
    const tableMap = new Map(tables.map((t) => [t.id, t]));

    type MatchRow = (typeof matches)[number];
    type PlayerJSON = {
      userId: string;
      nickname: string;
      seat: string;
      finalScore: number;
    };

    const enriched = matches.map((m: MatchRow) => {
      const table = m.table_id ? (tableMap.get(m.table_id) ?? null) : null;
      const players = (m.players ?? []) as PlayerJSON[];
      return {
        id: m.id,
        table_id: m.table_id,
        table,
        match_type: m.match_type,
        mode: m.mode,
        format: m.format,
        started_at:
          m.started_at instanceof Date
            ? m.started_at.getTime()
            : Number(m.started_at),
        ended_at:
          m.ended_at instanceof Date
            ? m.ended_at.getTime()
            : Number(m.ended_at),
        termination_reason: m.termination_reason,
        players,
        player_count: players.length,
        player_names: players.map((p) => p.nickname).join(", "),
        gsz_record_id: m.gsz_record_id ?? null,
        gsz_synced: !!m.gsz_synced,
        gsz_error: m.gsz_error ?? null,
        gsz_synced_at: m.gsz_synced_at
          ? m.gsz_synced_at instanceof Date
            ? m.gsz_synced_at.getTime()
            : Number(m.gsz_synced_at)
          : null,
        created_at:
          m.created_at instanceof Date
            ? m.created_at.getTime()
            : Number(m.created_at ?? 0),
      };
    });

    let filtered = enriched;

    if (input.mode !== "all") {
      filtered = filtered.filter((m) => m.mode === input.mode);
    }

    if (input.format !== "all") {
      filtered = filtered.filter((m) => m.format === input.format);
    }

    if (input.tableId) {
      filtered = filtered.filter((m) => m.table_id === input.tableId);
    }

    if (input.startDate) {
      filtered = filtered.filter((m) => m.started_at >= input.startDate!);
    }
    if (input.endDate) {
      filtered = filtered.filter((m) => m.started_at <= input.endDate!);
    }

    if (input.search.trim()) {
      const q = input.search.trim().toLowerCase();
      filtered = filtered.filter((m) => {
        return (
          m.id.toLowerCase().includes(q) ||
          m.player_names.toLowerCase().includes(q) ||
          m.players.some((p) => p.userId.toLowerCase().includes(q)) ||
          (m.table?.name ?? "").toLowerCase().includes(q) ||
          (m.table?.code ?? "").toLowerCase().includes(q)
        );
      });
    }

    const INCOMPLETE_REASONS = new Set(["admin_abort", "order_invalid"]);
    if (input.completion === "completed") {
      filtered = filtered.filter(
        (m) => !INCOMPLETE_REASONS.has(m.termination_reason),
      );
    } else if (input.completion === "incomplete") {
      filtered = filtered.filter((m) =>
        INCOMPLETE_REASONS.has(m.termination_reason),
      );
    }

    if (input.gszSync === "synced") {
      filtered = filtered.filter((m) => m.gsz_synced);
    } else if (input.gszSync === "unsynced") {
      filtered = filtered.filter(
        (m) => m.match_type === "tournament" && !m.gsz_synced,
      );
    }

    const total = filtered.length;
    const start = (input.page - 1) * input.pageSize;
    const items = filtered.slice(start, start + input.pageSize);

    const unsyncedTournaments = items.filter(
      (m) => m.match_type === "tournament" && !m.gsz_synced,
    );
    const allPlayerIds = [
      ...new Set(
        unsyncedTournaments.flatMap((m) => m.players.map((p) => p.userId)),
      ),
    ];

    let regSet = new Set<string>();
    let tempSet = new Set<string>();
    let realUserSet = new Set<string>();

    if (allPlayerIds.length > 0) {
      const regs = await tdb
        .select({ user_id: mahjongRegistrationsTable.user_id })
        .from(mahjongRegistrationsTable)
        .where(inArray(mahjongRegistrationsTable.user_id, allPlayerIds));
      regSet = new Set(regs.map((r) => r.user_id));

      const unregisteredIds = allPlayerIds.filter((id) => !regSet.has(id));
      if (unregisteredIds.length > 0) {
        const realUsers = await tdb
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.id, unregisteredIds));
        realUserSet = new Set(realUsers.map((u) => u.id));

        const potentialTempIds = unregisteredIds.filter(
          (id) => !realUserSet.has(id),
        );
        if (potentialTempIds.length > 0) {
          const temps = await tdb
            .select({ id: tempIdentitiesTable.id })
            .from(tempIdentitiesTable)
            .where(inArray(tempIdentitiesTable.id, potentialTempIds));
          tempSet = new Set(temps.map((t) => t.id));
        }
      }
    }

    const enrichedItems = items.map((m) => {
      if (m.match_type !== "tournament" || m.gsz_synced) {
        return { ...m, unsyncable_reasons: [] as UnsyncableReason[] };
      }
      const reasons: UnsyncableReason[] = [];
      for (const p of m.players) {
        if (tempSet.has(p.userId)) {
          reasons.push({
            nickname: p.nickname,
            userId: p.userId,
            reason: "temp_user",
          });
        } else if (!regSet.has(p.userId)) {
          reasons.push({
            nickname: p.nickname,
            userId: p.userId,
            reason: "no_phone",
          });
        }
      }
      return { ...m, unsyncable_reasons: reasons };
    });

    return {
      items: enrichedItems,
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  });

const getById = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const match = await tdb.query.mahjongMatchesTable.findFirst({
      where: (m, { eq }) => eq(m.id, input.id),
    });
    if (!match) throw new Error("对局不存在");

    const table = match.table_id
      ? await tdb.query.tablesTable.findFirst({
          where: (t, { eq }) => eq(t.id, match.table_id!),
          columns: { id: true, name: true, code: true, scope: true },
        })
      : null;

    type PlayerJSON = {
      userId: string;
      nickname: string;
      seat: string | null;
      finalScore: number;
    };

    const players = (match.players ?? []) as PlayerJSON[];

    return {
      id: match.id,
      table_id: match.table_id,
      match_type: match.match_type,
      gsz_record_id: match.gsz_record_id ?? null,
      gsz_synced: !!match.gsz_synced,
      gsz_error: match.gsz_error ?? null,
      gsz_synced_at: match.gsz_synced_at
        ? match.gsz_synced_at instanceof Date
          ? match.gsz_synced_at.getTime()
          : Number(match.gsz_synced_at)
        : null,
      table,
      mode: match.mode,
      format: match.format,
      started_at:
        match.started_at instanceof Date
          ? match.started_at.getTime()
          : Number(match.started_at),
      ended_at:
        match.ended_at instanceof Date
          ? match.ended_at.getTime()
          : Number(match.ended_at),
      termination_reason: match.termination_reason,
      players,
      config: match.config as {
        type?: string;
        mode: string;
        format: string;
      } | null,
      created_at:
        match.created_at instanceof Date
          ? match.created_at.getTime()
          : Number(match.created_at ?? 0),
    };
  });

const listTables = dashProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const tables = await tdb.query.tablesTable.findMany({
    where: (t, { eq }) => eq(t.scope, "mahjong"),
    columns: { id: true, name: true, code: true },
    orderBy: (t, { asc }) => asc(t.name),
  });
  return tables;
});

export interface ActiveMatchInfo {
  tableCode: string;
  tableName: string;
  tableId: string;
  phase: MatchState["phase"];
  matchType: string;
  mode: string;
  format: string;
  players: Array<{
    userId: string;
    nickname: string;
    seat: string | null;
    currentPoints: number;
  }>;
  startedAt: number | null;
}

const listActive = dashProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const mahjongTables = await tdb.query.tablesTable.findMany({
    where: (t, { eq }) => eq(t.scope, "mahjong"),
    columns: { id: true, name: true, code: true },
  });

  const results: ActiveMatchInfo[] = [];

  await Promise.all(
    mahjongTables.map(async (table) => {
      try {
        const doId = ctx.env.SOCKET.idFromName(table.code);
        const stub = ctx.env.SOCKET.get(doId);
        const res = await stub.fetch(
          new Request("https://do/mahjong-state", { method: "GET" }),
        );
        if (!res.ok) return;

        const data = (await res.json()) as {
          mahjong: MatchState | null;
          table: { id: string; name: string; code: string } | null;
        };

        if (!data.mahjong) return;
        if (data.mahjong.phase === "ended") return;
        if (data.mahjong.phase === "config_select") return;

        results.push({
          tableCode: table.code,
          tableName: table.name,
          tableId: table.id,
          phase: data.mahjong.phase,
          matchType: data.mahjong.config?.type ?? "store",
          mode: data.mahjong.config?.mode ?? "4p",
          format: data.mahjong.config?.format ?? "hanchan",
          players: data.mahjong.players.map((p) => ({
            userId: p.userId,
            nickname: p.nickname,
            seat: p.seat,
            currentPoints: p.currentPoints,
          })),
          startedAt: data.mahjong.startedAt,
        });
      } catch {
        // noop
      }
    }),
  );

  return results;
});

const terminateMatch = dashProcedure
  .input((v: unknown) => {
    const data = v as { tableCode: string; reason?: string };
    if (!data.tableCode) throw new Error("tableCode is required");
    return {
      tableCode: data.tableCode,
      reason: (data.reason ?? "admin_abort") as "admin_abort" | "order_invalid",
    };
  })
  .mutation(async ({ input, ctx }) => {
    const doId = ctx.env.SOCKET.idFromName(input.tableCode);
    const stub = ctx.env.SOCKET.get(doId);
    const res = await stub.fetch(
      new Request("https://do/mahjong-abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: input.reason }),
      }),
    );
    if (!res.ok) throw new Error("终止立直麻将失败");
    return { success: true };
  });

const updateScore = dashProcedure
  .input(
    z.object({
      matchId: z.string(),
      players: z.array(
        z.object({
          userId: z.string(),
          nickname: z.string(),
          seat: z.string().nullable(),
          finalScore: z.number(),
        }),
      ),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const match = await tdb.query.mahjongMatchesTable.findFirst({
      where: (m, { eq }) => eq(m.id, input.matchId),
    });
    if (!match) throw new Error("对局不存在");

    await tdb
      .update(mahjongMatchesTable)
      .set({ players: input.players })
      .where(eq(mahjongMatchesTable.id, input.matchId));

    if (match.match_type === "tournament" && match.gsz_record_id) {
      const seatOrder = ["east", "south", "west", "north"];
      const sorted = [...input.players].sort(
        (a, b) =>
          seatOrder.indexOf(a.seat ?? "") - seatOrder.indexOf(b.seat ?? ""),
      );

      if (sorted.length === 4) {
        const endedAt =
          match.ended_at instanceof Date
            ? match.ended_at.getTime()
            : Number(match.ended_at);
        const pad = (n: number) => String(n).padStart(2, "0");
        const d = new Date(endedAt);
        const rateTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

        const userIds = sorted.map((p) => p.userId);
        const registrations = await tdb
          .select({
            user_id: mahjongRegistrationsTable.user_id,
            phone: mahjongRegistrationsTable.phone,
          })
          .from(mahjongRegistrationsTable)
          .where(inArray(mahjongRegistrationsTable.user_id, userIds));
        const phoneMap = new Map(
          registrations.map((r) => [r.user_id, r.phone]),
        );

        const phones = sorted.map((p) => phoneMap.get(p.userId) ?? "");
        const allHavePhones = phones.every(Boolean);

        if (allHavePhones) {
          await gszFetch(ctx.env, "/gszapi/open/score/update", {
            params: {
              recordId: match.gsz_record_id,
              phone1: phones[0],
              phone2: phones[1],
              phone3: phones[2],
              phone4: phones[3],
              point1: String(sorted[0].finalScore),
              point2: String(sorted[1].finalScore),
              point3: String(sorted[2].finalScore),
              point4: String(sorted[3].finalScore),
              rateTime,
            },
          });
        }
      }
    }

    return { success: true };
  });

async function performGszSync(
  env: Cloudflare.Env,
  matchId: string,
): Promise<{ success: boolean; error?: string }> {
  const tdb = db(env.DB);
  const match = await tdb.query.mahjongMatchesTable.findFirst({
    where: (m, { eq }) => eq(m.id, matchId),
  });
  if (!match) return { success: false, error: "对局不存在" };
  if (match.match_type !== "tournament")
    return { success: false, error: "仅立直麻将对局可同步" };

  type PlayerJSON = {
    userId: string;
    nickname: string;
    seat: string | null;
    finalScore: number;
  };
  const players = (match.players ?? []) as PlayerJSON[];
  if (players.length !== 4) return { success: false, error: "需要4名玩家" };

  const seatOrder = ["east", "south", "west", "north"];
  const sorted = [...players].sort(
    (a, b) => seatOrder.indexOf(a.seat ?? "") - seatOrder.indexOf(b.seat ?? ""),
  );

  const userIds = sorted.map((p) => p.userId);
  const registrations = await tdb
    .select({
      user_id: mahjongRegistrationsTable.user_id,
      phone: mahjongRegistrationsTable.phone,
      gsz_id: mahjongRegistrationsTable.gsz_id,
    })
    .from(mahjongRegistrationsTable)
    .where(inArray(mahjongRegistrationsTable.user_id, userIds));
  const regMap = new Map(registrations.map((r) => [r.user_id, r]));
  const phones = sorted.map((p) => regMap.get(p.userId)?.phone ?? "");
  if (!phones.every(Boolean))
    return { success: false, error: "部分玩家未绑定手机号" };

  for (const p of sorted) {
    const reg = regMap.get(p.userId);
    if (reg && !reg.gsz_id) {
      try {
        const gszResult = await gszFetch<GszPageResult>(
          env,
          "/gszapi/open/customer/page",
          { params: { phone: reg.phone } },
          { pageNo: 1, pageSize: 1 },
        );

        let gszId: number | null = null;
        if (gszResult.records.length > 0) {
          gszId = gszResult.records[0].id;
        } else {
          gszId = await gszFetch<number>(env, "/gszapi/open/register", {
            params: { username: p.nickname, phone: reg.phone },
          });
        }

        if (gszId) {
          await tdb
            .update(mahjongRegistrationsTable)
            .set({
              gsz_id: gszId,
              gsz_name: gszResult.records[0]?.name ?? p.nickname,
              gsz_synced: true,
              gsz_error: null,
              gsz_synced_at: new Date(),
            })
            .where(eq(mahjongRegistrationsTable.user_id, p.userId));
        }
      } catch {
        return {
          success: false,
          error: `无法为玩家 ${p.nickname} 创建公式战账户`,
        };
      }
    }
  }

  const endedAt =
    match.ended_at instanceof Date
      ? match.ended_at.getTime()
      : Number(match.ended_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date(endedAt);
  const rateTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  try {
    if (match.gsz_record_id) {
      await gszFetch(env, "/gszapi/open/score/update", {
        params: {
          recordId: match.gsz_record_id,
          phone1: phones[0],
          phone2: phones[1],
          phone3: phones[2],
          phone4: phones[3],
          point1: String(sorted[0].finalScore),
          point2: String(sorted[1].finalScore),
          point3: String(sorted[2].finalScore),
          point4: String(sorted[3].finalScore),
          rateTime,
        },
      });
    } else {
      const gszRecordId = await gszFetch<number>(
        env,
        "/gszapi/open/score/add",
        {
          params: {
            phone1: phones[0],
            phone2: phones[1],
            phone3: phones[2],
            phone4: phones[3],
            point1: String(sorted[0].finalScore),
            point2: String(sorted[1].finalScore),
            point3: String(sorted[2].finalScore),
            point4: String(sorted[3].finalScore),
            rateTime,
          },
        },
      );
      if (gszRecordId) {
        await tdb
          .update(mahjongMatchesTable)
          .set({ gsz_record_id: gszRecordId })
          .where(eq(mahjongMatchesTable.id, matchId));
      }
    }

    await tdb
      .update(mahjongMatchesTable)
      .set({
        gsz_synced: true,
        gsz_error: null,
        gsz_synced_at: new Date(),
      })
      .where(eq(mahjongMatchesTable.id, matchId));

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "立直麻将同步失败";
    await tdb
      .update(mahjongMatchesTable)
      .set({ gsz_error: errorMsg })
      .where(eq(mahjongMatchesTable.id, matchId));
    return { success: false, error: errorMsg };
  }
}

const syncToGsz = dashProcedure
  .input(z.object({ matchId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    return performGszSync(ctx.env, input.matchId);
  });

const batchSyncToGsz = dashProcedure
  .input(z.object({ matchIds: z.array(z.string()).min(1).max(50) }))
  .mutation(async ({ input, ctx }) => {
    const results = await Promise.allSettled(
      input.matchIds.map((id) => performGszSync(ctx.env, id)),
    );
    let successCount = 0;
    let failCount = 0;
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.success) successCount++;
      else failCount++;
    }
    return { successCount, failCount, total: input.matchIds.length };
  });

export default {
  list,
  getById,
  listTables,
  listActive,
  terminateMatch,
  updateScore,
  syncToGsz,
  batchSyncToGsz,
};
