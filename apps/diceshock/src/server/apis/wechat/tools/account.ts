import db, {
  accounts,
  drizzle,
  pricingSnapshotsTable,
  tableOccupancyTable,
  tablesTable,
  userBusinessCardTable,
  userInfoTable,
  userMembershipPlansTable,
  users,
} from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { SITE_LINKS } from "../linkRegistry";
import type { ToolDefinition } from "../skills";
import type { PageLink } from "../types";

const { and, eq, ne, desc } = drizzle;

export const ACCOUNT_LINKS: PageLink[] = [
  { url: SITE_LINKS.me(), title: "个人中心" },
];

function result<T>(data: T): string {
  return JSON.stringify({ ...(data as object), links: ACCOUNT_LINKS });
}

function notFound(message: string): string {
  return JSON.stringify({ found: false, message, links: ACCOUNT_LINKS });
}

// ─── Helpers ────────────────────────────────────────────────────

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

// ─── Tool: query_membership_status ─────────────────────────────

async function queryMembershipStatus(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string> {
  const userId = await resolveUserId(c, openId);
  if (!userId) {
    return notFound("未找到该用户的账号，可能尚未在网站注册");
  }

  const d = db(c.env.DB);
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

  return result({
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

// ─── Tool: query_all_membership_plans ───────────────────────────

const _PLAN_LABELS: Record<string, string> = {
  monthly: "月卡",
  monthly_cc: "月卡(CC)",
  yearly: "年卡",
};

const BILLING_LABELS: Record<string, string> = {
  hourly: "按小时计费",
  fixed: "固定价格",
};

async function queryAllPlans(c: Context<HonoCtxEnv>): Promise<string> {
  const d = db(c.env.DB);

  const snapshot = await d
    .select()
    .from(pricingSnapshotsTable)
    .where(eq(pricingSnapshotsTable.status, "published"))
    .orderBy(desc(pricingSnapshotsTable.published_at))
    .limit(1);

  const plans =
    snapshot.length > 0 && snapshot[0].data?.plans
      ? snapshot[0].data.plans
          .filter((p) => p.enabled)
          .map((p) => ({
            name: p.name,
            type: p.plan_type,
            billing: BILLING_LABELS[p.billing_type] ?? p.billing_type,
            price: p.price, // cents
            cap: p.cap_enabled
              ? {
                  unit: p.cap_unit,
                  price: p.cap_price,
                  day: p.cap_price_day,
                  night: p.cap_price_night,
                }
              : null,
          }))
      : null;

  const summary =
    plans && plans.length > 0
      ? {
          found: true,
          source: "published_pricing_snapshot",
          plans,
        }
      : {
          found: true,
          source: "fallback",
          message: "暂无已发布的定价方案，请查看以下会员计划类型：",
          plan_types: [
            { type: "monthly", name: "月卡", desc: "30天畅玩桌游" },
            {
              type: "monthly_cc",
              name: "月卡(CC)",
              desc: "30天畅玩桌游 + CC包间",
            },
            { type: "yearly", name: "年卡", desc: "365天畅玩桌游" },
            {
              type: "stored_value",
              name: "储值卡",
              desc: "按小时扣费，余额随时可用",
            },
          ],
        };

  return result(summary);
}

// ─── Tool: query_my_active_table ─────────────────────────────────

async function queryMyActiveTable(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string> {
  const userId = await resolveUserId(c, openId);
  if (!userId) {
    return notFound("未找到该用户的账号");
  }

  const d = db(c.env.DB);
  const occs = await d
    .select({
      id: tableOccupancyTable.id,
      status: tableOccupancyTable.status,
      start_at: tableOccupancyTable.start_at,
      code: tablesTable.code,
      name: tablesTable.name,
    })
    .from(tableOccupancyTable)
    .innerJoin(tablesTable, eq(tableOccupancyTable.table_id, tablesTable.id))
    .where(
      and(
        eq(tableOccupancyTable.user_id, userId),
        ne(tableOccupancyTable.status, "ended"),
      ),
    )
    .orderBy(desc(tableOccupancyTable.start_at));

  if (occs.length === 0) {
    return result({ found: false, message: "当前没有正在使用的桌台" });
  }

  const tables = occs.map((o) => ({
    code: o.code,
    name: o.name,
    status: o.status,
    start_at: o.start_at,
    link: SITE_LINKS.table(o.code),
  }));

  return result({ found: true, active_tables: tables });
}

// ─── Tool: get_user_profile ────────────────────────────────────

async function getUserProfile(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string> {
  const userId = await resolveUserId(c, openId);
  if (!userId) {
    return notFound("未找到该用户的账号");
  }

  const d = db(c.env.DB);

  const userRow = await d
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const info = await d
    .select({
      nickname: userInfoTable.nickname,
      uid: userInfoTable.uid,
      create_at: userInfoTable.create_at,
    })
    .from(userInfoTable)
    .where(eq(userInfoTable.id, userId))
    .limit(1);

  if (info.length === 0) {
    return result({
      found: false,
      message: "用户资料尚未填写，请前往个人中心完善",
    });
  }

  return result({
    found: true,
    profile: {
      nickname: info[0].nickname,
      uid: info[0].uid,
      member_since: info[0].create_at,
      role: userRow.length > 0 ? userRow[0].role : "customer",
    },
  });
}

// ─── Tool: get_my_business_card ──────────────────────────────────

async function getMyBusinessCard(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<string> {
  const userId = await resolveUserId(c, openId);
  if (!userId) {
    return notFound("未找到该用户的账号");
  }

  const d = db(c.env.DB);
  const card = await d
    .select({
      share_phone: userBusinessCardTable.share_phone,
      wechat: userBusinessCardTable.wechat,
      qq: userBusinessCardTable.qq,
      custom_content: userBusinessCardTable.custom_content,
    })
    .from(userBusinessCardTable)
    .where(eq(userBusinessCardTable.id, userId))
    .limit(1);

  if (card.length === 0) {
    return result({
      found: false,
      message: "名片尚未创建，请前往个人中心设置",
    });
  }

  // Never expose phone number
  return result({
    found: true,
    card: {
      share_phone: card[0].share_phone,
      wechat: card[0].wechat ?? null,
      qq: card[0].qq ?? null,
      custom_content: card[0].custom_content ?? null,
      phone: null, // explicitly null for privacy
    },
  });
}

// ─── Tool Definitions ────────────────────────────────────────────

export const ACCOUNT_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "query_membership_status",
      description: "查询当前用户的会员状态（通行证和储值卡余额）",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "query_all_membership_plans",
      description: "查询店铺所有会员计划方案和定价",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "query_my_active_table",
      description: "查询当前用户正在使用的桌台",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_profile",
      description: "获取当前用户的基本信息（昵称、UID）",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_business_card",
      description: "获取当前用户的名片信息",
      parameters: { type: "object", properties: {} },
    },
  },
];

// ─── Dispatcher ──────────────────────────────────────────────────

export async function executeAccountTool(
  c: Context<HonoCtxEnv>,
  toolName: string,
  _args: Record<string, unknown>,
  openId: string,
): Promise<string> {
  console.log("[tools:account] execute", {
    toolName,
    openId: openId.slice(-8),
  });
  try {
    switch (toolName) {
      case "query_membership_status":
        return await queryMembershipStatus(c, openId);
      case "query_all_membership_plans":
        return await queryAllPlans(c);
      case "query_my_active_table":
        return await queryMyActiveTable(c, openId);
      case "get_user_profile":
        return await getUserProfile(c, openId);
      case "get_my_business_card":
        return await getMyBusinessCard(c, openId);
      default:
        console.error("[tools:account] unknown tool:", toolName);
        return JSON.stringify({ error: "未知工具", links: ACCOUNT_LINKS });
    }
  } catch (e) {
    console.error("[tools:account] execution error", {
      toolName,
      error: String(e),
    });
    return JSON.stringify({
      error: `工具执行失败: ${String(e)}`,
      links: ACCOUNT_LINKS,
    });
  }
}
