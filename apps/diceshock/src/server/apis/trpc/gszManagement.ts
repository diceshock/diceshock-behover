import db from "@lib/db";
import type { MatchState } from "@/shared/mahjong/types";
import { dashProcedure } from "./baseTRPC";

type ModeFilter = "all" | "3p" | "4p";
type FormatFilter = "all" | "tonpuu" | "hanchan";
type CompletionFilter = "all" | "completed" | "incomplete";

const list = dashProcedure
  .input((v: unknown) => {
    const data = v as {
      search?: string;
      mode?: ModeFilter;
      format?: FormatFilter;
      completion?: CompletionFilter;
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

    const total = filtered.length;
    const start = (input.page - 1) * input.pageSize;
    const items = filtered.slice(start, start + input.pageSize);

    return { items, total, page: input.page, pageSize: input.pageSize };
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
      seat: string;
      finalScore: number;
    };
    type RoundJSON = {
      round: number;
      wind: string;
      honba: number;
      dealerUserId: string;
      scores: Record<string, number>;
      result: string;
    };

    const players = (match.players ?? []) as PlayerJSON[];
    const roundHistory = (match.round_history ?? []) as RoundJSON[];

    return {
      id: match.id,
      table_id: match.table_id,
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
      round_history: roundHistory,
      config: match.config as { mode: string; format: string } | null,
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
  mode: string;
  format: string;
  players: Array<{
    userId: string;
    nickname: string;
    seat: string | null;
    currentPoints: number;
  }>;
  roundCount: number;
  currentWind: string;
  currentRoundNumber: number;
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
        if (
          data.mahjong.phase === "lobby" ||
          data.mahjong.phase === "config_select"
        )
          return;

        results.push({
          tableCode: table.code,
          tableName: table.name,
          tableId: table.id,
          phase: data.mahjong.phase,
          mode: data.mahjong.config?.mode ?? "4p",
          format: data.mahjong.config?.format ?? "hanchan",
          players: data.mahjong.players.map((p) => ({
            userId: p.userId,
            nickname: p.nickname,
            seat: p.seat,
            currentPoints: p.currentPoints,
          })),
          roundCount: data.mahjong.roundHistory.length,
          currentWind: data.mahjong.currentRound.wind,
          currentRoundNumber: data.mahjong.currentRound.roundNumber,
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
    if (!res.ok) throw new Error("终止公式战失败");
    return { success: true };
  });

export default { list, getById, listTables, listActive, terminateMatch };
