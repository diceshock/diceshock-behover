import db, {
  accounts,
  boardGamesTable,
  drizzle,
  userMembershipPlansTable,
} from "@lib/db";

const { and, eq, like } = drizzle;

import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "query_board_game_inventory",
      description: "查询店里桌游的库存/在架状态，支持按名称模糊搜索",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "桌游名称（中文或英文）" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_membership_status",
      description: "查询当前用户的会员状态（通行证和储值卡余额）",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export async function executeTool(
  c: Context<HonoCtxEnv>,
  toolName: string,
  args: Record<string, unknown>,
  openId: string,
): Promise<string> {
  switch (toolName) {
    case "query_board_game_inventory":
      return queryBoardGameInventory(c, args.name as string);
    case "query_membership_status":
      return queryMembershipStatus(c, openId);
    default:
      return JSON.stringify({ error: "未知工具" });
  }
}

async function queryBoardGameInventory(
  c: Context<HonoCtxEnv>,
  name: string,
): Promise<string> {
  const d = db(c.env.DB);
  const results = await d
    .select({
      id: boardGamesTable.id,
      sch_name: boardGamesTable.sch_name,
      eng_name: boardGamesTable.eng_name,
      player_num: boardGamesTable.player_num,
      removeDate: boardGamesTable.removeDate,
    })
    .from(boardGamesTable)
    .where(like(boardGamesTable.sch_name, `%${name}%`))
    .limit(10);

  if (results.length === 0) {
    const engResults = await d
      .select({
        id: boardGamesTable.id,
        sch_name: boardGamesTable.sch_name,
        eng_name: boardGamesTable.eng_name,
        player_num: boardGamesTable.player_num,
        removeDate: boardGamesTable.removeDate,
      })
      .from(boardGamesTable)
      .where(like(boardGamesTable.eng_name, `%${name}%`))
      .limit(10);

    if (engResults.length === 0) {
      return JSON.stringify({
        found: false,
        message: `未找到"${name}"相关桌游`,
      });
    }
    return formatGameResults(engResults);
  }

  return formatGameResults(results);
}

function formatGameResults(
  games: Array<{
    id: string;
    sch_name: string | null;
    eng_name: string | null;
    player_num: number[] | null;
    removeDate: Date | null;
  }>,
): string {
  const items = games.map((g) => {
    const removed = g.removeDate && g.removeDate.getTime() > 0;
    return {
      name: g.sch_name || g.eng_name || "未知",
      eng_name: g.eng_name,
      player_num: g.player_num,
      in_stock: !removed,
    };
  });
  return JSON.stringify({ found: true, count: items.length, games: items });
}

async function queryMembershipStatus(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string> {
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

  if (account.length === 0) {
    const accountSilent = await d
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(
        and(
          eq(accounts.provider, "wechat-mp-silent"),
          eq(accounts.providerAccountId, openId),
        ),
      )
      .limit(1);

    if (accountSilent.length === 0) {
      return JSON.stringify({
        found: false,
        message: "未找到该用户的会员记录，可能尚未在网站注册",
      });
    }
    return fetchMembershipPlans(d, accountSilent[0].userId);
  }

  return fetchMembershipPlans(d, account[0].userId);
}

async function fetchMembershipPlans(
  d: ReturnType<typeof db>,
  userId: string,
): Promise<string> {
  const now = new Date();
  const plans = await d
    .select()
    .from(userMembershipPlansTable)
    .where(eq(userMembershipPlansTable.user_id, userId));

  const activePlans = plans.filter((p) => {
    if (p.plan_type === "stored_value") return true;
    if (!p.end_date) return false;
    return p.end_date > now;
  });

  const storedValue = activePlans.find((p) => p.plan_type === "stored_value");
  const timePlans = activePlans.filter((p) => p.plan_type !== "stored_value");

  return JSON.stringify({
    found: true,
    stored_value: storedValue
      ? { balance: storedValue.amount ?? 0, note: storedValue.note }
      : null,
    time_plans: timePlans.map((p) => ({
      type: p.plan_type,
      start_date: p.start_date,
      end_date: p.end_date,
      note: p.note,
    })),
    has_active_membership: timePlans.length > 0,
  });
}
