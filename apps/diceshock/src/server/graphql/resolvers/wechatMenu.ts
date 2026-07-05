import dbFactory, {
  drizzle as drizzleOp,
  wechatMenuSnapshotsTable,
} from "@lib/db";
import type { WechatMenuData } from "@lib/db";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getWechatAccessToken } from "@/server/apis/wechat/wechatApi";
import type { GQLContext } from "../context";
import { internalError, notFound, validationError } from "../errors";
import { requireStaff } from "../guards";

// ─── Helpers ──────────────────────────────────────────────────────────────

function db(ctx: GQLContext) {
  return dbFactory(ctx.env.DB);
}

function storeCondition(
  tableColumn: unknown,
  storeId: string | null | undefined,
) {
  if (!storeId) return undefined;
  return drizzleOp.eq(tableColumn as never, storeId);
}

const WECHAT_API_BASE = "https://diceshock.com/wx-proxy";

function mapWechatMenuSnapshot<
  T extends {
    id: string;
    name: string;
    store_id: string | null;
    data: WechatMenuData | null;
    status: string;
    created_at: Date | null;
    published_at: Date | null;
  },
>(row: T) {
  return {
    id: row.id,
    name: row.name,
    storeId: row.store_id,
    data: JSON.stringify(row.data ?? { buttons: [] }),
    status: row.status.toUpperCase(),
    summary: buildMenuSummary(row.data),
    createdAt: row.created_at?.toISOString() ?? null,
    publishedAt: row.published_at?.toISOString() ?? null,
  };
}

function buildMenuSummary(data: WechatMenuData | null): string {
  if (!data?.buttons?.length) return "空菜单";
  const count = data.buttons.length;
  const names = data.buttons.map((b) => b.name).join(", ");
  return `${count} 个按钮: ${names}`;
}

// ─── Default menu (mirrors original scripts/wechat-menu.ts) ───────────────

const DEFAULT_MENU: WechatMenuData = {
  buttons: [
    { id: "default01", type: "click", name: "会员中心", key: "MEMBERSHIP_PLAN" },
    {
      id: "default02",
      name: "快捷功能",
      items: [
        { id: "default03", type: "view", name: "桌游库存", link_target: "/inventory" },
        { id: "default04", type: "view", name: "日麻战绩", link_target: "/riichi" },
        { id: "default05", type: "view", name: "约局", link_target: "/actives" },
      ],
    },
    {
      id: "default06",
      name: "使用帮助",
      items: [
        { id: "default07", type: "click", name: "如何对话", key: "HELP_GUIDE" },
        { id: "default08", type: "view", name: "进入店铺", link_target: "/" },
        { id: "default09", type: "view", name: "联系我们", link_target: "/contact-us" },
        { id: "default10", type: "view", name: "个人信息", link_target: "/me" },
      ],
    },
  ],
};


// ─── Available variables for notification templates ────────────────────────

const MENU_VARIABLES = [
  { id: "user_nickname", label: "用户昵称", description: "当前用户的微信昵称", example: "张三" },
  { id: "user_balance", label: "用户余额", description: "储值余额 (元)", example: "128.00" },
  { id: "user_points", label: "用户积分", description: "当前可用积分", example: "520" },
  { id: "user_membership", label: "会员类型", description: "用户会员计划名称", example: "桌面通行证" },
  { id: "user_membership_expiry", label: "会员到期时间", description: "会员到期日期", example: "2025-12-31" },
  { id: "store_name", label: "店铺名称", description: "当前店铺名称", example: "骰子奇兵 古城店" },
  { id: "system_date", label: "当前日期", description: "当天日期", example: "2025-07-01" },
  { id: "system_time", label: "当前时间", description: "当前时间", example: "14:30" },
  { id: "system_weekday", label: "星期几", description: "当前星期", example: "星期二" },
  { id: "active_count", label: "今日约局数", description: "当天开放约局数量", example: "3" },
  { id: "next_event", label: "下一场活动", description: "最近一场活动名称", example: "周末桌游之夜" },
];

// ─── Translation via DeepSeek ─────────────────────────────────────────────

const LOCALE_NAMES: Record<string, string> = {
  zh_Hans: "简体中文",
  zh_Hant: "繁體中文",
  en: "English",
  ja: "日本語",
  ru: "Русский",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
};

async function translateText(
  env: GQLContext["env"],
  text: string,
  targetLocales: string[],
): Promise<{ locale: string; text: string }[]> {
  const apiKey = env.DEEPSEEK_API_KEY as string | undefined;
  if (!apiKey) throw internalError("DEEPSEEK_API_KEY not configured");

  const accountId =
    (env.CF_ACCOUNT_ID as string) || "3244c8f91cd34317ce18652158e5853a";
  const gatewayId = env.CF_AI_GATEWAY_ID as string | undefined;

  const baseURL = gatewayId
    ? `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/deepseek`
    : "https://api.deepseek.com/v1";

  const localeList = targetLocales
    .map((l) => `${l}: ${LOCALE_NAMES[l] ?? l}`)
    .join("\n");

  const systemPrompt = `You are a professional translator for a board game café (桌游吧). Translate the following text to each specified locale. Keep template variables like {{user_nickname}} unchanged. Return ONLY valid JSON: an array of objects with "locale" and "text" fields. No markdown, no explanation.`;

  const userPrompt = `Translate this text:\n"${text}"\n\nTarget locales:\n${localeList}\n\nReturn JSON array: [{"locale":"xx","text":"translated"}]`;

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw internalError(`Translation API error: ${err.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "";

  // Parse JSON from response (may be wrapped in code fence)
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw internalError("Translation returned invalid format");
  }

  try {
    const translations = JSON.parse(jsonMatch[0]) as { locale: string; text: string }[];
    return translations.filter(
      (t) => targetLocales.includes(t.locale) && typeof t.text === "string",
    );
  } catch {
    throw internalError("Failed to parse translation response");
  }
}

// ─── WeChat Menu API ──────────────────────────────────────────────────────

function convertToWechatApi(data: WechatMenuData): { button: unknown[] } {
  const buttons: unknown[] = [];

  for (const btn of data.buttons) {
    if ("items" in btn && btn.items) {
      // Category with sub-buttons
      const subButtons = btn.items.map((item) => convertMenuItem(item));
      buttons.push({
        name: btn.name,
        sub_button: subButtons,
      });
    } else {
      buttons.push(convertMenuItem(btn as import("@lib/db").WechatMenuItem));
    }
  }

  return { button: buttons };
}

function convertMenuItem(item: import("@lib/db").WechatMenuItem): Record<string, unknown> {
  if (item.type === "view") {
    return {
      type: "view",
      name: item.name,
      url: item.url ?? `https://diceshock.com${item.link_target ?? "/"}`,
    };
  }
  // click type
  return {
    type: "click",
    name: item.name,
    key: item.key ?? `MENU_${item.id.toUpperCase()}`,
  };
}

// ─── Resolvers ────────────────────────────────────────────────────────────

export const wechatMenuResolvers = {
  Query: {
    async wechatMenuDraft(
      _source: unknown,
      args: { storeId?: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const storeId = args.storeId ?? ctx.preferredStoreId;

      const latest = await tdb.query.wechatMenuSnapshotsTable.findFirst({
        where: (s, { and: a, eq: e }) =>
          storeId
            ? a(e(s.store_id, storeId))
            : undefined,
        orderBy: (s) => desc(s.created_at),
      });

      if (!latest) {
        return {
          data: JSON.stringify(DEFAULT_MENU),
          snapshotId: null,
          snapshotName: "默认菜单",
          status: "PUBLISHED",
        };
      }

      return {
        data: JSON.stringify(latest.data ?? { buttons: [] }),
        snapshotId: latest.id,
        snapshotName: latest.name,
        status: latest.status.toUpperCase(),
      };
    },

    async wechatMenuSnapshots(
      _source: unknown,
      args: { storeId?: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const storeId = args.storeId ?? ctx.preferredStoreId;

      const rows = await tdb.query.wechatMenuSnapshotsTable.findMany({
        where: storeId
          ? (s, { eq: e }) => e(s.store_id, storeId)
          : undefined,
        orderBy: (s) => desc(s.created_at),
        limit: 50,
      });

      return rows.map(mapWechatMenuSnapshot);
    },

    async wechatMenuSnapshot(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);

      const row = await tdb.query.wechatMenuSnapshotsTable.findFirst({
        where: (s, { eq: e }) => e(s.id, args.id),
      });

      if (!row) throw notFound("Snapshot not found");
      return mapWechatMenuSnapshot(row);
    },

    wechatMenuVariables() {
      return MENU_VARIABLES;
    },
  },

  Mutation: {
    async saveWechatMenuSnapshot(
      _source: unknown,
      args: {
        input: {
          name: string;
          data: string;
          storeId?: string;
        };
      },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const storeId = args.input.storeId ?? ctx.preferredStoreId;

      let parsed: WechatMenuData;
      try {
        parsed = JSON.parse(args.input.data) as WechatMenuData;
      } catch {
        throw validationError("data", "Invalid menu data JSON");
      }

      if (!parsed.buttons || !Array.isArray(parsed.buttons)) {
        throw validationError("data", "Menu data must contain buttons array");
      }

      // Deduplicate name
      const existing = await tdb.query.wechatMenuSnapshotsTable.findFirst({
        where: (s, { and: a, eq: e }) =>
          a(
            e(s.name, args.input.name),
            storeId ? e(s.store_id, storeId) : undefined,
          ),
        columns: { id: true },
      });
      const finalName = existing
        ? `${args.input.name}-${nanoid(4)}`
        : args.input.name;

      const [row] = await tdb
        .insert(wechatMenuSnapshotsTable)
        .values({
          name: finalName,
          store_id: storeId ?? undefined,
          data: parsed,
          status: "draft",
          created_at: new Date(),
        })
        .returning();

      return mapWechatMenuSnapshot(row);
    },

    async publishWechatMenuSnapshot(
      _source: unknown,
      args: { storeId?: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const storeId = args.storeId ?? ctx.preferredStoreId;

      const latestDraft = await tdb.query.wechatMenuSnapshotsTable.findFirst({
        where: (s, { and: a, eq: e }) =>
          a(
            e(s.status, "draft"),
            storeId ? e(s.store_id, storeId) : undefined,
          ),
        orderBy: (s) => desc(s.created_at),
      });

      if (!latestDraft) {
        return { success: false, error: "没有可发布的草稿", snapshot: null };
      }

      if (!latestDraft.data?.buttons?.length) {
        return { success: false, error: "菜单为空，无法发布", snapshot: null };
      }

      // Push to WeChat API
      try {
        const token = await getWechatAccessToken(ctx.env);
        const menuPayload = convertToWechatApi(latestDraft.data);
        const url = `${WECHAT_API_BASE}/cgi-bin/menu/create?access_token=${token}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(menuPayload),
        });
        const resData = (await res.json()) as { errcode: number; errmsg: string };
        if (resData.errcode !== 0) {
          return {
            success: false,
            error: `微信接口错误: ${resData.errcode} ${resData.errmsg}`,
            snapshot: null,
          };
        }
      } catch (err) {
        return {
          success: false,
          error: `发布失败: ${String(err)}`,
          snapshot: null,
        };
      }

      // Mark as published
      const [updated] = await tdb
        .update(wechatMenuSnapshotsTable)
        .set({ status: "published", published_at: new Date() })
        .where(eq(wechatMenuSnapshotsTable.id, latestDraft.id))
        .returning();

      return {
        success: true,
        error: null,
        snapshot: mapWechatMenuSnapshot(updated),
      };
    },

    async restoreWechatMenuSnapshot(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const storeId = ctx.preferredStoreId;

      const snapshot = await tdb.query.wechatMenuSnapshotsTable.findFirst({
        where: (s, { eq: e }) => e(s.id, args.id),
      });
      if (!snapshot?.data) throw notFound("Snapshot not found");

      const existing = await tdb.query.wechatMenuSnapshotsTable.findFirst({
        where: (s, { and: a, eq: e }) =>
          a(
            e(s.name, snapshot.name),
            storeId ? e(s.store_id, storeId) : undefined,
          ),
        columns: { id: true },
      });
      const finalName = existing
        ? `${snapshot.name}-${nanoid(4)}`
        : snapshot.name;

      const [row] = await tdb
        .insert(wechatMenuSnapshotsTable)
        .values({
          name: finalName,
          store_id: storeId ?? undefined,
          data: snapshot.data,
          status: "draft",
          created_at: new Date(),
        })
        .returning();

      return mapWechatMenuSnapshot(row);
    },

    async translateWechatMenuText(
      _source: unknown,
      args: { text: string; targetLocales: string[] },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);

      if (!args.text.trim()) {
        throw validationError("text", "Text cannot be empty");
      }
      if (!args.targetLocales.length) {
        throw validationError("targetLocales", "Must specify at least one target locale");
      }

      const translations = await translateText(ctx.env, args.text, args.targetLocales);
      return { translations };
    },
  },
};
