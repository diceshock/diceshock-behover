import db, {
  accounts,
  activeRegistrationsTable,
  activesTable,
  drizzle,
  mahjongRegistrationsTable,
  userBusinessCardTable,
  userInfoTable,
} from "@lib/db";
import type { MutateAction, MutateArgs } from "../graphql/mutateActions";
import { MUTATE_ACTIONS } from "../graphql/mutateActions";
import { SITE_LINKS } from "../linkRegistry";
import type { ToolContext } from "./totp";

const { and, eq } = drizzle;

// ─── Extended env for SMS/GSZ ───────────────────────────────────────

interface MutateEnv {
  DB: D1Database;
  KV: KVNamespace;
  aliyunClient?: unknown;
  GSZ_TOKEN?: string;
  DEV_SMS_CODE?: string;
}

// ─── User resolution ────────────────────────────────────────────────

async function resolveUserId(
  d1: D1Database,
  openId: string,
): Promise<string | null> {
  const d = db(d1);
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

// ─── Param validators ────────────────────────────────────────────────

const REQUIRED_PARAMS: Record<MutateAction, string[]> = {
  create_active: ["title", "date", "max_players"],
  join_active: ["active_id"],
  watch_active: ["active_id"],
  update_active: ["id"],
  leave_active: ["active_id"],
  send_sms_code: ["phone"],
  verify_phone: ["phone", "code"],
  bind_gsz: [],
  upsert_business_card: [],
  update_profile: ["nickname"],
  update_preferences: [],
};

function validateParams(
  action: MutateAction,
  params: Record<string, unknown>,
): string | null {
  const required = REQUIRED_PARAMS[action];
  if (!required) return null;
  for (const key of required) {
    if (
      params[key] === undefined ||
      params[key] === null ||
      params[key] === ""
    ) {
      return key;
    }
  }
  return null;
}

// ─── Hard confirmation for destructive actions ──────────────────────

const DESTRUCTIVE_ACTIONS: Set<MutateAction> = new Set([
  "leave_active",
  "update_active",
]);

interface PendingAction {
  action: MutateAction;
  params: Record<string, unknown>;
  description: string;
  summary: string;
  createdAt: number;
}

async function storePendingAction(
  kv: KVNamespace,
  openId: string,
  pending: PendingAction,
): Promise<void> {
  await kv.put(`pending_action:${openId}`, JSON.stringify(pending), {
    expirationTtl: 300,
  });
}

export async function getPendingAction(
  kv: KVNamespace,
  openId: string,
): Promise<PendingAction | null> {
  const raw = await kv.get(`pending_action:${openId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAction;
  } catch {
    return null;
  }
}

export async function clearPendingAction(
  kv: KVNamespace,
  openId: string,
): Promise<void> {
  await kv.delete(`pending_action:${openId}`);
}

export async function executePendingAction(
  pending: PendingAction,
  context: ToolContext,
): Promise<string> {
  return await executeMutateTool(
    {
      action: pending.action,
      params: pending.params,
      description: pending.description,
    } as MutateArgs,
    context,
    true,
  );
}

function buildConfirmationSummary(
  action: MutateAction,
  params: Record<string, unknown>,
): string {
  switch (action) {
    case "leave_active":
      return `将删除/退出约局 (ID: ${(params.active_id as string)?.slice(0, 8)}...)`;
    case "update_active":
      return `将修改约局 (ID: ${((params.id as string) || (params.active_id as string))?.slice(0, 8)}...)`;
    default:
      return `将执行 ${action}`;
  }
}

// ─── Main executor ───────────────────────────────────────────────────

const ACTION_ALIASES: Record<string, MutateAction> = {
  delete_active: "leave_active",
  cancel_active: "leave_active",
  remove_active: "leave_active",
  quit_active: "leave_active",
  exit_active: "leave_active",
  "active.create": "create_active",
  "active.join": "join_active",
  "active.leave": "leave_active",
  "active.watch": "watch_active",
  "active.update": "update_active",
  "active.delete": "leave_active",
};

function normalizeParams(
  action: MutateAction,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const p = { ...raw };
  if (p.activeId && !p.active_id) {
    p.active_id = p.activeId;
    delete p.activeId;
  }
  if (
    p.id &&
    !p.active_id &&
    (action === "leave_active" ||
      action === "join_active" ||
      action === "watch_active" ||
      action === "update_active")
  ) {
    p.active_id = p.id;
    delete p.id;
  }
  if (p.maxPlayers && !p.max_players) {
    p.max_players = p.maxPlayers;
    delete p.maxPlayers;
  }
  if (p.startTime && !p.start_time) {
    p.start_time = p.startTime;
    delete p.startTime;
  }
  if (p.gameId && !p.board_game_id) {
    p.board_game_id = p.gameId;
    delete p.gameId;
  }
  if (p.boardGameId && !p.board_game_id) {
    p.board_game_id = p.boardGameId;
    delete p.boardGameId;
  }
  return p;
}

export async function executeMutateTool(
  args: MutateArgs,
  context: ToolContext,
  skipConfirmation = false,
): Promise<string> {
  let action = args.action as string;
  if (ACTION_ALIASES[action]) action = ACTION_ALIASES[action];

  if (!(MUTATE_ACTIONS as readonly string[]).includes(action)) {
    return `无效操作: ${action}。有效操作: ${MUTATE_ACTIONS.join(", ")}`;
  }

  const typedAction = action as MutateAction;
  const params = normalizeParams(
    typedAction,
    args.params as Record<string, unknown>,
  );

  const missingKey = validateParams(
    typedAction,
    params as Record<string, unknown>,
  );
  if (missingKey) {
    return `操作失败: 缺少参数 ${missingKey}`;
  }

  const userId = await resolveUserId(context.env.DB, context.openId);
  if (!userId) {
    return "操作失败: 未找到账号，请先在网站注册";
  }

  if (!skipConfirmation && DESTRUCTIVE_ACTIONS.has(typedAction)) {
    const summary = buildConfirmationSummary(typedAction, params);
    const pending: PendingAction = {
      action: typedAction,
      params: params as Record<string, unknown>,
      description: (args.description as string) || "",
      summary,
      createdAt: Date.now(),
    };
    await storePendingAction(context.env.KV, context.openId, pending);
    return `[需要确认] ${summary}\n回复"确认"执行，回复其他内容取消。`;
  }

  const env = context.env as MutateEnv;
  try {
    switch (typedAction) {
      case "create_active":
        return await handleCreateActive(
          env,
          userId,
          params as Record<string, unknown>,
        );
      case "join_active":
        return await handleJoinActive(
          env,
          userId,
          params as Record<string, unknown>,
          false,
        );
      case "watch_active":
        return await handleJoinActive(
          env,
          userId,
          params as Record<string, unknown>,
          true,
        );
      case "update_active":
        return await handleUpdateActive(
          env,
          userId,
          params as Record<string, unknown>,
        );
      case "leave_active":
        return await handleLeaveActive(
          env,
          userId,
          params as Record<string, unknown>,
        );
      case "send_sms_code":
        return await handleSendSmsCode(env, params as Record<string, unknown>);
      case "verify_phone":
        return await handleVerifyPhone(
          env,
          userId,
          context.openId,
          params as Record<string, unknown>,
        );
      case "bind_gsz":
        return await handleBindGsz(
          env,
          userId,
          params as Record<string, unknown>,
        );
      case "upsert_business_card":
        return await handleUpsertBusinessCard(
          env,
          userId,
          params as Record<string, unknown>,
        );
      case "update_profile":
        return await handleUpdateProfile(
          env,
          userId,
          params as Record<string, unknown>,
        );
      case "update_preferences":
        return await handleUpdatePreferences(
          env,
          userId,
          params as Record<string, unknown>,
        );
      default:
        return `操作失败: 未知操作类型 ${typedAction}`;
    }
  } catch (e) {
    console.error(`[mutate:${action}] error:`, e);
    return `操作失败: ${String(e)}`;
  }
}

// ─── Action handlers ─────────────────────────────────────────────────

async function handleCreateActive(
  env: MutateEnv,
  userId: string,
  params: Record<string, unknown>,
): Promise<string> {
  const title = params.title as string;
  const date = params.date as string;
  const maxPlayers = params.max_players as number;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return "创建约局失败: 日期格式需为 YYYY-MM-DD";
  }

  const d = db(env.DB);
  const id = crypto.randomUUID();

  try {
    await d.insert(activesTable).values({
      id,
      creator_id: userId,
      title,
      board_game_id: (params.board_game_id as string) || null,
      date,
      time: (params.time as string) || null,
      max_players: maxPlayers,
      content: (params.content as string) || null,
      is_game: params.is_game !== false,
    });
    // Auto-register creator as player
    await d.insert(activeRegistrationsTable).values({
      id: crypto.randomUUID(),
      active_id: id,
      user_id: userId,
      is_watching: false,
    });
  } catch (e) {
    console.error("[mutate:create_active] insert failed:", e);
    return `创建约局失败: ${String(e)}`;
  }

  const url = SITE_LINKS.activeDetail(id);
  return `[通知] 约局创建成功\n${title} | ${date}${params.time ? ` ${params.time}` : ""} | ${maxPlayers}人\n${url}`;
}

async function handleJoinActive(
  env: MutateEnv,
  userId: string,
  params: Record<string, unknown>,
  isWatching: boolean,
): Promise<string> {
  const d = db(env.DB);
  const activeId = params.active_id as string;

  const active = await d
    .select({
      id: activesTable.id,
      creator_id: activesTable.creator_id,
      max_players: activesTable.max_players,
      title: activesTable.title,
    })
    .from(activesTable)
    .where(eq(activesTable.id, activeId))
    .limit(1);

  if (active.length === 0) {
    return "操作失败: 活动不存在";
  }

  if (active[0].creator_id === userId) {
    return "操作失败: 不能加入自己发起的约局";
  }

  const existing = await d
    .select({
      id: activeRegistrationsTable.id,
      is_watching: activeRegistrationsTable.is_watching,
    })
    .from(activeRegistrationsTable)
    .where(
      and(
        eq(activeRegistrationsTable.active_id, activeId),
        eq(activeRegistrationsTable.user_id, userId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].is_watching === isWatching) {
      const status = isWatching ? "观望" : "参加";
      return `[通知] 您已${status}此约局`;
    }
    await d
      .update(activeRegistrationsTable)
      .set({ is_watching: isWatching })
      .where(eq(activeRegistrationsTable.id, existing[0].id));
    const status = isWatching ? "观望" : "参加";
    const url = SITE_LINKS.activeDetail(activeId);
    return `[通知] 已切换为${status}\n${active[0].title}\n${url}`;
  }

  if (!isWatching) {
    const [{ count: playerCount }] = await d
      .select({ count: drizzle.count(activeRegistrationsTable.id) })
      .from(activeRegistrationsTable)
      .where(
        and(
          eq(activeRegistrationsTable.active_id, activeId),
          eq(activeRegistrationsTable.is_watching, false),
        ),
      );
    if (playerCount >= active[0].max_players) {
      return "操作失败: 人数已满，可选择观望";
    }
  }

  await d.insert(activeRegistrationsTable).values({
    id: crypto.randomUUID(),
    active_id: activeId,
    user_id: userId,
    is_watching: isWatching,
  });

  const status = isWatching ? "观望" : "加入";
  const url = SITE_LINKS.activeDetail(activeId);
  return `[通知] 已${status}约局\n${active[0].title}\n${url}`;
}

async function handleUpdateActive(
  env: MutateEnv,
  userId: string,
  params: Record<string, unknown>,
): Promise<string> {
  const d = db(env.DB);
  const activeId = params.id as string;

  const active = await d
    .select({ creator_id: activesTable.creator_id })
    .from(activesTable)
    .where(eq(activesTable.id, activeId))
    .limit(1);

  if (active.length === 0) {
    return "操作失败: 约局不存在";
  }

  if (active[0].creator_id !== userId) {
    return "操作失败: 只有发起者可以修改约局";
  }

  const updates: Record<string, unknown> = { update_at: new Date() };
  if (params.title) updates.title = params.title;
  if (params.date) updates.date = params.date;
  if (params.time !== undefined) updates.time = params.time;
  if (params.max_players) updates.max_players = params.max_players;
  if (params.board_game_id !== undefined)
    updates.board_game_id = params.board_game_id;

  await d
    .update(activesTable)
    .set(updates)
    .where(eq(activesTable.id, activeId));

  const url = SITE_LINKS.activeDetail(activeId);
  return `[通知] 约局修改成功\n${url}`;
}

async function handleLeaveActive(
  env: MutateEnv,
  userId: string,
  params: Record<string, unknown>,
): Promise<string> {
  const d = db(env.DB);
  const activeId = params.active_id as string;

  const active = await d
    .select({ creator_id: activesTable.creator_id, title: activesTable.title })
    .from(activesTable)
    .where(eq(activesTable.id, activeId))
    .limit(1);

  if (active.length === 0) {
    return "操作失败: 约局不存在";
  }

  // Creator leaving → delete entire active including all registrations
  if (active[0].creator_id === userId) {
    try {
      await d
        .delete(activeRegistrationsTable)
        .where(eq(activeRegistrationsTable.active_id, activeId));
      await d.delete(activesTable).where(eq(activesTable.id, activeId));
    } catch (e) {
      console.error("[mutate:leave_active] delete failed:", e);
      return `删除约局失败: ${String(e)}`;
    }
    return `[通知] 约局已删除\n${active[0].title}`;
  }

  // Participant leaving → remove only their registration
  try {
    await d
      .delete(activeRegistrationsTable)
      .where(
        and(
          eq(activeRegistrationsTable.active_id, activeId),
          eq(activeRegistrationsTable.user_id, userId),
        ),
      );
  } catch (e) {
    console.error("[mutate:leave_active] unregister failed:", e);
    return `退出约局失败: ${String(e)}`;
  }

  const url = SITE_LINKS.activeDetail(activeId);
  return `[通知] 已退出约局\n${active[0].title}\n${url}`;
}

async function handleUpsertBusinessCard(
  env: MutateEnv,
  userId: string,
  params: Record<string, unknown>,
): Promise<string> {
  const d = db(env.DB);

  const sharePhone = (params.share_phone ??
    params.sharePhone ??
    params.share) as boolean | undefined;
  const wechat = (params.wechat ?? params.wechatId ?? params.wx) as
    | string
    | undefined;
  const qq = (params.qq ?? params.QQ) as string | undefined;
  const customContent = (params.custom_content ??
    params.customContent ??
    params.bio ??
    params.description) as string | undefined;

  if (!wechat && !qq && !customContent && sharePhone === undefined) {
    return "名片更新失败: 至少提供一项内容(wechat/qq/custom_content/share_phone)";
  }

  const existing = await d
    .select({ id: userBusinessCardTable.id })
    .from(userBusinessCardTable)
    .where(eq(userBusinessCardTable.id, userId))
    .limit(1);

  const data: Record<string, unknown> = { update_at: new Date() };
  if (sharePhone !== undefined) data.share_phone = sharePhone;
  if (wechat !== undefined) data.wechat = wechat;
  if (qq !== undefined) data.qq = qq;
  if (customContent !== undefined) data.custom_content = customContent;

  if (existing.length > 0) {
    await d
      .update(userBusinessCardTable)
      .set(data)
      .where(eq(userBusinessCardTable.id, userId));
  } else {
    await d
      .insert(userBusinessCardTable)
      .values({ id: userId, ...data } as any);
  }

  const parts: string[] = [];
  if (wechat) parts.push(`微信: ${wechat}`);
  if (qq) parts.push(`QQ: ${qq}`);
  if (customContent) parts.push(`简介: ${customContent}`);
  if (sharePhone !== undefined)
    parts.push(`手机${sharePhone ? "公开" : "不公开"}`);

  return `[通知] 名片${existing.length > 0 ? "更新" : "创建"}成功\n${parts.join(" | ")}\n${SITE_LINKS.me()}`;
}

async function handleUpdateProfile(
  env: MutateEnv,
  userId: string,
  params: Record<string, unknown>,
): Promise<string> {
  const nickname = params.nickname as string;
  if (!nickname || nickname.length > 30) {
    return "修改失败: 昵称不能为空且不超过30字";
  }

  const d = db(env.DB);
  await d
    .update(userInfoTable)
    .set({ nickname })
    .where(eq(userInfoTable.id, userId));

  return `[通知] 昵称已修改为: ${nickname}`;
}

const VALID_LOCALES: Record<string, string> = {
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

const VALID_STORES: Record<string, string> = {
  gg: "光谷店",
  jdk: "街道口店",
};

const STORE_ALIASES: Record<string, string> = {
  光谷: "gg",
  光谷店: "gg",
  光谷天地: "gg",
  gg: "gg",
  GG: "gg",
  街道口: "jdk",
  街道口店: "jdk",
  jdk: "jdk",
  JDK: "jdk",
};

const LOCALE_ALIASES: Record<string, string> = {
  中文: "zh_Hans",
  简体: "zh_Hans",
  简体中文: "zh_Hans",
  chinese: "zh_Hans",
  "zh-CN": "zh_Hans",
  繁体: "zh_Hant",
  繁體: "zh_Hant",
  繁体中文: "zh_Hant",
  "zh-TW": "zh_Hant",
  英文: "en",
  英语: "en",
  english: "en",
  English: "en",
  日文: "ja",
  日语: "ja",
  日本語: "ja",
  japanese: "ja",
  Japanese: "ja",
  韩文: "ko",
  韩语: "ko",
  korean: "ko",
  俄文: "ru",
  俄语: "ru",
  Russian: "ru",
  russian: "ru",
  西班牙语: "es",
  Spanish: "es",
  spanish: "es",
  葡萄牙语: "pt",
  Portuguese: "pt",
  法语: "fr",
  French: "fr",
  french: "fr",
  德语: "de",
  German: "de",
  german: "de",
};

async function handleUpdatePreferences(
  env: MutateEnv,
  userId: string,
  params: Record<string, unknown>,
): Promise<string> {
  const rawLocale = (params.locale ?? params.language ?? params.lang) as
    | string
    | undefined;
  const rawStore = (params.store_id ?? params.store ?? params.location) as
    | string
    | undefined;

  if (!rawLocale && !rawStore) {
    return "设置失败: 请提供 locale(语言) 或 store_id(店铺) 至少一项";
  }

  const updates: Record<string, unknown> = {};
  const confirmParts: string[] = [];

  if (rawLocale) {
    const resolvedLocale = LOCALE_ALIASES[rawLocale] || rawLocale;
    if (!VALID_LOCALES[resolvedLocale]) {
      return `语言设置失败: 不支持 "${rawLocale}"。可选: ${Object.entries(
        VALID_LOCALES,
      )
        .map(([k, v]) => `${k}(${v})`)
        .join(", ")}`;
    }
    updates.preferred_locale = resolvedLocale;
    confirmParts.push(`语言: ${VALID_LOCALES[resolvedLocale]}`);
  }

  if (rawStore) {
    const resolvedStore = STORE_ALIASES[rawStore] || rawStore;
    if (!VALID_STORES[resolvedStore]) {
      return `店铺设置失败: 不支持 "${rawStore}"。可选: gg(光谷店), jdk(街道口店)`;
    }
    updates.preferred_store_id = resolvedStore;
    confirmParts.push(`店铺: ${VALID_STORES[resolvedStore]}`);
  }

  const d = db(env.DB);
  await d
    .update(userInfoTable)
    .set(updates)
    .where(eq(userInfoTable.id, userId));

  return `[通知] 偏好设置已更新\n${confirmParts.join(" | ")}`;
}

async function handleSendSmsCode(
  env: MutateEnv,
  params: Record<string, unknown>,
): Promise<string> {
  const phone = params.phone as string;
  const kv = env.KV;

  // Dev mode shortcut
  if (env.DEV_SMS_CODE) {
    await kv.put(`sms_code:${phone}`, env.DEV_SMS_CODE, { expirationTtl: 300 });
    return `[通知] 验证码已发送到 ${phone.slice(0, 3)}****${phone.slice(-4)}\n5分钟内回复验证码完成绑定`;
  }

  const { customAlphabet } = await import("nanoid");
  const code = customAlphabet("0123456789", 6)();

  try {
    const aliyunClient = env.aliyunClient;
    if (!aliyunClient) {
      return "短信服务未配置，请联系管理员";
    }

    const { SendSmsRequest } = await import("@alicloud/dysmsapi20170525");
    const request = new SendSmsRequest({
      phoneNumbers: phone,
      signName: "武汉市奇兵文化创意",
      templateCode: "SMS_330260870",
      templateParam: JSON.stringify({ code }),
    });
    const client = aliyunClient as {
      sendSmsWithOptions: (
        req: unknown,
        opts: Record<string, unknown>,
      ) => Promise<{ body?: { code?: string } }>;
    };
    const response = await client.sendSmsWithOptions(request, {});
    const body = response?.body;

    if (body?.code !== "OK") {
      if (body?.code === "isv.MOBILE_NUMBER_ILLEGAL") {
        return "手机号码格式错误";
      }
      if (body?.code === "isv.BUSINESS_LIMIT_CONTROL") {
        return "发送次数过多，请稍后再试";
      }
      return "无法发送短信，请联系管理员";
    }

    await kv.put(`sms_code:${phone}`, code, { expirationTtl: 300 });

    return `[通知] 验证码已发送到 ${phone.slice(0, 3)}****${phone.slice(-4)}\n5分钟内回复验证码完成绑定`;
  } catch (e) {
    console.error("[mutate:sms] error:", e);
    return "短信发送失败，请稍后再试";
  }
}

async function handleVerifyPhone(
  env: MutateEnv,
  userId: string,
  openId: string,
  params: Record<string, unknown>,
): Promise<string> {
  const kv = env.KV;
  const phone = params.phone as string;
  const code = params.code as string;

  const storedCode = env.DEV_SMS_CODE || (await kv.get(`sms_code:${phone}`));
  if (!storedCode || storedCode !== code) {
    return "验证码错误或已过期，请重新发送";
  }

  await kv.delete(`sms_code:${phone}`);

  const d = db(env.DB);

  const existingAccount = await d
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(eq(accounts.provider, "SMS"), eq(accounts.providerAccountId, phone)),
    )
    .limit(1);

  if (existingAccount.length > 0 && existingAccount[0].userId !== userId) {
    return "该手机号已被其他账号使用";
  }

  await d
    .update(userInfoTable)
    .set({ phone })
    .where(eq(userInfoTable.id, userId));

  if (existingAccount.length === 0) {
    const accountValues = {
      userId,
      type: "credentials",
      provider: "SMS",
      providerAccountId: phone,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await d.insert(accounts).values(accountValues as any);
  }

  return `[通知] 手机号绑定成功\n${phone.slice(0, 3)}****${phone.slice(-4)}\n${SITE_LINKS.me()}`;
}

async function handleBindGsz(
  env: MutateEnv,
  userId: string,
  params: Record<string, unknown>,
): Promise<string> {
  const d = db(env.DB);

  const existing = await d
    .select({ gsz_id: mahjongRegistrationsTable.gsz_id })
    .from(mahjongRegistrationsTable)
    .where(eq(mahjongRegistrationsTable.user_id, userId))
    .limit(1);

  if (existing.length > 0) {
    return `[通知] 已绑定公式战账号 (ID: ${existing[0].gsz_id})\n${SITE_LINKS.myRiichi()}`;
  }

  const userInfo = await d
    .select({ phone: userInfoTable.phone })
    .from(userInfoTable)
    .where(eq(userInfoTable.id, userId))
    .limit(1);

  const phone = (params.phone as string) || userInfo[0]?.phone;
  if (!phone) {
    return "绑定公式战需要手机号，请先绑定手机号";
  }

  const gszName = (params.gsz_name as string) || "未命名";
  const gszToken = env.GSZ_TOKEN as string;

  if (!gszToken) {
    return "公式战服务未配置，请联系管理员";
  }

  let gszId: number | null = null;
  let actualGszName = gszName;
  let gszSynced = false;
  let gszError: string | null = null;

  try {
    const searchRes = await fetch(
      "https://gsz.rmlinking.com/gszapi/open/customer/page?pageNo=1&pageSize=1",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", token: gszToken },
        body: JSON.stringify({ params: { phone } }),
      },
    );
    const searchData = (await searchRes.json()) as {
      code: number;
      data?: { records?: Array<{ id: number; name: string }> };
    };

    if (searchData.code === 200) {
      const first = searchData.data?.records?.[0];
      if (first) {
        gszId = first.id;
        actualGszName = first.name;
      } else {
        const regRes = await fetch(
          "https://gsz.rmlinking.com/gszapi/open/register",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", token: gszToken },
            body: JSON.stringify({ params: { username: gszName, phone } }),
          },
        );
        const regData = (await regRes.json()) as {
          code: number;
          data?: number;
          message?: string;
        };
        if (regData.code === 200) {
          gszId = regData.data ?? null;
        } else {
          gszError = regData.message || "注册失败";
        }
      }
    }
    gszSynced = gszId !== null;
  } catch (e) {
    gszError = "公式战系统暂时不可用";
  }

  await d.insert(mahjongRegistrationsTable).values({
    id: crypto.randomUUID(),
    user_id: userId,
    phone,
    gsz_id: gszId,
    gsz_name: actualGszName,
    gsz_synced: gszSynced,
    gsz_error: gszError,
    gsz_synced_at: gszSynced ? new Date() : null,
  });

  if (gszSynced) {
    return `[通知] 公式战绑定成功\n昵称: ${actualGszName} | ID: ${gszId}\n${SITE_LINKS.myRiichi()}`;
  }

  return `[通知] 公式战信息已保存，同步失败: ${gszError}\n后续自动重试\n${SITE_LINKS.myRiichi()}`;
}
