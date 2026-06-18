import db, {
  accounts,
  boardGamesTable,
  drizzle,
  userMembershipPlansTable,
} from "@lib/db";

const { and, eq, like } = drizzle;

import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { executeAccountTool } from "./account";
import { executeActiveTool } from "./active";
import { executeEventTool } from "./event";
import { executeMahjongTool } from "./mahjong";
import { executeProposeTool, isProposeToolName } from "./propose";
import { generateTotpMessage } from "./totp";

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
  console.log("[tools] execute", { toolName, args, openId: openId.slice(-8) });
  try {
    if (isProposeToolName(toolName)) {
      return await executeProposeTool(c, toolName, args, openId);
    }

    switch (toolName) {
      case "query_board_game_inventory":
        return await queryBoardGameInventory(c, args.name as string);
      case "query_membership_status":
        return await queryMembershipStatus(c, openId);
      case "query_all_membership_plans":
      case "query_my_active_table":
      case "get_user_profile":
      case "get_my_business_card":
        return await executeAccountTool(c, toolName, args, openId);
      case "query_actives_list":
      case "query_active_detail":
      case "query_active_notifications":
        return await executeActiveTool(c, toolName, args, openId);
      case "query_events_list":
      case "query_event_detail":
        return await executeEventTool(c, toolName, args, openId);
      case "query_leaderboard":
      case "query_my_rankings":
      case "query_my_match_history":
      case "query_my_pp_stats":
      case "query_my_badges":
        return await executeMahjongTool(c, toolName, args, openId);
      case "generate_totp": {
        const totpMsg = await generateTotpMessage(c, openId);
        if (!totpMsg) {
          return JSON.stringify({
            error: "TOTP 验证码生成失败，请先在个人中心绑定验证器",
          });
        }
        return JSON.stringify(totpMsg);
      }
      default:
        console.error("[tools] unknown tool:", toolName);
        return JSON.stringify({ error: "未知工具" });
    }
  } catch (e) {
    console.error("[tools] execution error", { toolName, error: String(e) });
    return JSON.stringify({ error: `工具执行失败: ${String(e)}` });
  }
}

async function queryBoardGameInventory(
  c: Context<HonoCtxEnv>,
  name: string,
): Promise<string> {
  console.log("[tools:inventory] searching:", name);
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

  console.log("[tools:inventory] cn results:", results.length);

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

    console.log("[tools:inventory] en results:", engResults.length);

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
  console.log("[tools:membership] lookup openId:", openId.slice(-8));
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
    console.log("[tools:membership] no wechat-mp account, trying silent");
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
      console.log("[tools:membership] no account found at all");
      return JSON.stringify({
        found: false,
        message: "未找到该用户的会员记录，可能尚未在网站注册",
      });
    }
    console.log(
      "[tools:membership] found silent account, userId:",
      accountSilent[0].userId,
    );
    return fetchMembershipPlans(d, accountSilent[0].userId);
  }

  console.log(
    "[tools:membership] found mp account, userId:",
    account[0].userId,
  );
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

  console.log("[tools:membership] plans found:", plans.length);

  const activePlans = plans.filter((p) => {
    if (p.plan_type === "stored_value") return true;
    if (!p.end_date) return false;
    return p.end_date > now;
  });

  const storedValue = activePlans.find((p) => p.plan_type === "stored_value");
  const timePlans = activePlans.filter((p) => p.plan_type !== "stored_value");

  const result = {
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
  };

  console.log("[tools:membership] result:", {
    hasStoredValue: !!storedValue,
    timePlansCount: timePlans.length,
    active: result.has_active_membership,
  });

  return JSON.stringify(result);
}
