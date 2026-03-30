import db from "@lib/db";
import { dashProcedure } from "./baseTRPC";

type ModeFilter = "all" | "3p" | "4p";
type FormatFilter = "all" | "tonpuu" | "hanchan";

const list = dashProcedure
  .input((v: unknown) => {
    const data = v as {
      search?: string;
      mode?: ModeFilter;
      format?: FormatFilter;
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

export default { list, getById, listTables };
