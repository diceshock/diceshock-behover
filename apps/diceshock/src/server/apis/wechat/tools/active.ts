import db, {
  accounts,
  activeRegistrationsTable,
  activesTable,
  boardGamesTable,
  drizzle,
  userInfoTable,
} from "@lib/db";
import dayjs from "dayjs";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import "dayjs/locale/zh-cn";
import { SITE_LINKS } from "../linkRegistry";
import type { ToolDefinition } from "../skills";
import type { PageLink } from "../types";

const { and, eq, gte, lte } = drizzle;

const ACTIVE_LINKS: PageLink[] = [
  { url: SITE_LINKS.actives(), title: "约局列表" },
  { url: SITE_LINKS.activeNew(), title: "发起新约局" },
];

function result<T>(data: T, extraLinks?: PageLink[]): string {
  return JSON.stringify({
    ...(data as object),
    links: extraLinks ? [...ACTIVE_LINKS, ...extraLinks] : ACTIVE_LINKS,
  });
}

function notFound(message: string): string {
  return JSON.stringify({ found: false, message, links: ACTIVE_LINKS });
}

async function resolveUserId(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string | null> {
  const d = db(c.env.DB);
  const account = await d
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, "wechat-mp"),
        eq(accounts.providerAccountId, openId),
      ),
    )
    .limit(1);
  if (account.length > 0) return account[0].userId;

  const silent = await d
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, "wechat-mp-silent"),
        eq(accounts.providerAccountId, openId),
      ),
    )
    .limit(1);
  return silent.length > 0 ? silent[0].userId : null;
}

async function queryActivesList(
  c: Context<HonoCtxEnv>,
  args: { dateRange?: "today" | "week" | "month" },
): Promise<string> {
  const d = db(c.env.DB);
  const now = dayjs().tz("Asia/Shanghai");
  const today = now.format("YYYY-MM-DD");

  let dateStart: string;
  let dateEnd: string;

  switch (args.dateRange) {
    case "today":
      dateStart = today;
      dateEnd = today;
      break;
    case "week":
      dateStart = now.startOf("week").format("YYYY-MM-DD");
      dateEnd = now.endOf("week").format("YYYY-MM-DD");
      break;
    default:
      dateStart = now.startOf("month").format("YYYY-MM-DD");
      dateEnd = now.endOf("month").format("YYYY-MM-DD");
      break;
  }

  const conditions = [
    gte(activesTable.date, today),
    gte(activesTable.date, dateStart),
    lte(activesTable.date, dateEnd),
  ];

  const actives = await d
    .select({
      id: activesTable.id,
      title: activesTable.title,
      date: activesTable.date,
      time: activesTable.time,
      max_players: activesTable.max_players,
      board_game_id: activesTable.board_game_id,
      is_game: activesTable.is_game,
    })
    .from(activesTable)
    .where(and(...conditions))
    .orderBy(activesTable.date)
    .limit(20);

  const gameIds = [
    ...new Set(actives.map((a) => a.board_game_id).filter(Boolean)),
  ];
  const games =
    gameIds.length > 0
      ? await d
          .select({
            id: boardGamesTable.id,
            sch_name: boardGamesTable.sch_name,
            eng_name: boardGamesTable.eng_name,
          })
          .from(boardGamesTable)
          .where(drizzle.inArray(boardGamesTable.id, gameIds as string[]))
      : [];
  const gameMap = new Map(games.map((g) => [g.id, g]));

  const items = actives.map((a) => {
    const game = a.board_game_id ? gameMap.get(a.board_game_id) : null;
    return {
      id: a.id,
      title: a.title,
      date: a.date,
      time: a.time,
      max_players: a.max_players,
      board_game_name: game?.sch_name || game?.eng_name || null,
      is_game: a.is_game,
      link: SITE_LINKS.activeDetail(a.id),
    };
  });

  return result({
    found: true,
    count: items.length,
    date_range: args.dateRange || "month",
    actives: items,
  });
}

async function queryActiveDetail(
  c: Context<HonoCtxEnv>,
  args: { id: string },
): Promise<string> {
  const d = db(c.env.DB);

  const active = await d
    .select()
    .from(activesTable)
    .where(eq(activesTable.id, args.id))
    .limit(1);

  if (active.length === 0) {
    return notFound("约局不存在");
  }

  const a = active[0];

  const registrations = await d
    .select()
    .from(activeRegistrationsTable)
    .where(eq(activeRegistrationsTable.active_id, args.id));

  const joiningCount = registrations.filter((r) => !r.is_watching).length;
  const watchingCount = registrations.filter((r) => r.is_watching).length;

  let boardGameName: string | null = null;
  if (a.board_game_id) {
    const games = await d
      .select({
        sch_name: boardGamesTable.sch_name,
        eng_name: boardGamesTable.eng_name,
      })
      .from(boardGamesTable)
      .where(eq(boardGamesTable.id, a.board_game_id))
      .limit(1);
    if (games.length > 0) {
      boardGameName = games[0].sch_name || games[0].eng_name || null;
    }
  }

  let creatorName: string | null = null;
  if (a.creator_id) {
    const creator = await d
      .select({ nickname: userInfoTable.nickname })
      .from(userInfoTable)
      .where(eq(userInfoTable.id, a.creator_id))
      .limit(1);
    creatorName = creator.length > 0 ? creator[0].nickname : null;
  }

  return result(
    {
      found: true,
      active: {
        id: a.id,
        title: a.title,
        creator_id: a.creator_id,
        creator_name: creatorName,
        date: a.date,
        time: a.time,
        max_players: a.max_players,
        board_game_name: boardGameName,
        content: a.content,
        is_game: a.is_game,
        joining_count: joiningCount,
        watching_count: watchingCount,
        total_registrations: registrations.length,
      },
    },
    [{ url: SITE_LINKS.activeDetail(a.id), title: "约局详情" }],
  );
}

async function queryMyActives(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string> {
  const userId = await resolveUserId(c, openId);
  if (!userId) {
    return notFound("未找到该用户的账号");
  }

  const d = db(c.env.DB);
  const today = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");

  const created = await d
    .select({
      id: activesTable.id,
      title: activesTable.title,
      date: activesTable.date,
      time: activesTable.time,
      max_players: activesTable.max_players,
      board_game_id: activesTable.board_game_id,
      is_game: activesTable.is_game,
    })
    .from(activesTable)
    .where(
      and(eq(activesTable.creator_id, userId), gte(activesTable.date, today)),
    )
    .orderBy(activesTable.date)
    .limit(20);

  const myRegs = await d
    .select({
      active_id: activeRegistrationsTable.active_id,
      is_watching: activeRegistrationsTable.is_watching,
    })
    .from(activeRegistrationsTable)
    .where(eq(activeRegistrationsTable.user_id, userId));

  const regActiveIds = myRegs.map((r) => r.active_id);
  const joined =
    regActiveIds.length > 0
      ? await d
          .select({
            id: activesTable.id,
            title: activesTable.title,
            date: activesTable.date,
            time: activesTable.time,
            max_players: activesTable.max_players,
            board_game_id: activesTable.board_game_id,
            is_game: activesTable.is_game,
          })
          .from(activesTable)
          .where(
            and(
              drizzle.inArray(activesTable.id, regActiveIds),
              gte(activesTable.date, today),
            ),
          )
          .orderBy(activesTable.date)
      : [];

  const allGameIds = [
    ...new Set(
      [...created, ...joined].map((a) => a.board_game_id).filter(Boolean),
    ),
  ];
  const games =
    allGameIds.length > 0
      ? await d
          .select({
            id: boardGamesTable.id,
            sch_name: boardGamesTable.sch_name,
            eng_name: boardGamesTable.eng_name,
          })
          .from(boardGamesTable)
          .where(drizzle.inArray(boardGamesTable.id, allGameIds as string[]))
      : [];
  const gameMap = new Map(games.map((g) => [g.id, g]));

  const formatItem = (a: any, role: string) => {
    const game = a.board_game_id ? gameMap.get(a.board_game_id) : null;
    return {
      id: a.id,
      title: a.title,
      date: a.date,
      time: a.time,
      max_players: a.max_players,
      board_game_name: game?.sch_name || game?.eng_name || null,
      role,
      link: SITE_LINKS.activeDetail(a.id),
    };
  };

  const createdItems = created.map((a) => formatItem(a, "organizer"));
  const joinedItems = joined
    .filter((a) => !created.some((c) => c.id === a.id))
    .map((a) => {
      const reg = myRegs.find((r) => r.active_id === a.id);
      return formatItem(a, reg?.is_watching ? "watching" : "joined");
    });

  const all = [...createdItems, ...joinedItems];

  return result({
    found: true,
    total: all.length,
    created_count: createdItems.length,
    joined_count: joinedItems.length,
    actives: all,
  });
}

export const ACTIVE_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "query_actives_list",
      description:
        "查询约局列表，可按日期范围筛选（今天/本周/本月）。默认只显示尚未过期的约局。",
      parameters: {
        type: "object",
        properties: {
          dateRange: {
            type: "string",
            enum: ["today", "week", "month"],
            description: "日期范围：today=今天, week=本周, month=本月",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_active_detail",
      description: "查询约局详情，包括发起者、参加人数、桌游名称、时间等信息",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "约局 ID" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_my_actives",
      description:
        "查询当前用户所有相关的约局：包括自己发起的(role=organizer)和报名/观望的(role=joined/watching)。仅未过期。",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export async function executeActiveTool(
  c: Context<HonoCtxEnv>,
  toolName: string,
  args: Record<string, unknown>,
  openId: string,
): Promise<string> {
  console.log("[tools:active] execute", {
    toolName,
    openId: openId.slice(-8),
  });
  try {
    switch (toolName) {
      case "query_actives_list":
        return await queryActivesList(
          c,
          args as { dateRange?: "today" | "week" | "month" },
        );
      case "query_active_detail":
        return await queryActiveDetail(c, args as { id: string });
      case "query_my_actives":
        return await queryMyActives(c, openId);
      default:
        console.error("[tools:active] unknown tool:", toolName);
        return JSON.stringify({ error: "未知工具", links: ACTIVE_LINKS });
    }
  } catch (e) {
    console.error("[tools:active] execution error", {
      toolName,
      error: String(e),
    });
    return JSON.stringify({
      error: `工具执行失败: ${String(e)}`,
      links: ACTIVE_LINKS,
    });
  }
}
