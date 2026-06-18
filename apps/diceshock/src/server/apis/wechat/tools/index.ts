import db, { accounts, drizzle, userMembershipPlansTable } from "@lib/db";

const { and, eq } = drizzle;

import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { executeAccountTool } from "./account";
import { executeActiveTool } from "./active";
import { executeBoardgameTool } from "./boardgame";
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
      case "query_board_game_count":
      case "query_board_game_detail":
      case "query_board_game_filter":
        return await executeBoardgameTool(c, toolName, args);
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
      case "query_my_created_actives":
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
