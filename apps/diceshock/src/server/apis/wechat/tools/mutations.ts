import db, {
  accounts,
  activeRegistrationsTable,
  activesTable,
  drizzle,
  mahjongRegistrationsTable,
  userBusinessCardTable,
  userInfoTable,
} from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { SITE_LINKS } from "../linkRegistry";
import type { PendingAction } from "../pendingAction";

const { and, eq, ne } = drizzle;

interface ActionResult {
  success: boolean;
  notification: string;
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

export async function executeAction(
  c: Context<HonoCtxEnv>,
  action: PendingAction,
  openId: string,
): Promise<ActionResult> {
  const userId = await resolveUserId(c, openId);
  if (!userId) {
    return {
      success: false,
      notification: "❌ 操作失败：未找到您的账号，请先在网站注册",
    };
  }

  switch (action.type) {
    case "create_active":
      return await executeCreateActive(c, userId, action.params);
    case "join_active":
      return await executeJoinActive(c, userId, action.params, false);
    case "watch_active":
      return await executeJoinActive(c, userId, action.params, true);
    case "update_active":
      return await executeUpdateActive(c, userId, action.params);
    case "leave_active":
      return await executeLeaveActive(c, userId, action.params);
    case "upsert_business_card":
      return await executeUpsertBusinessCard(c, userId, action.params);
    case "send_sms_code":
      return await executeSendSmsCode(c, action.params);
    case "verify_phone":
      return await executeVerifyPhone(c, userId, openId, action.params);
    case "bind_gsz":
      return await executeBindGsz(c, userId, action.params);
    default:
      return { success: false, notification: "❌ 未知操作类型" };
  }
}

async function executeCreateActive(
  c: Context<HonoCtxEnv>,
  userId: string,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const title = params.title as string | undefined;
  const date = params.date as string | undefined;
  const maxPlayers = params.max_players as number | undefined;

  if (!title || !date || !maxPlayers) {
    return {
      success: false,
      notification: `❌ 创建约局失败：缺少必要信息\n${!title ? "· 标题\n" : ""}${!date ? "· 日期\n" : ""}${!maxPlayers ? "· 人数上限" : ""}`,
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false, notification: "❌ 日期格式错误，需要 YYYY-MM-DD" };
  }

  const d = db(c.env.DB);
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
  } catch (e) {
    console.error("[mutations:create_active] insert failed:", e);
    return { success: false, notification: `❌ 创建约局失败：${String(e)}` };
  }

  const url = SITE_LINKS.activeDetail(id);
  return {
    success: true,
    notification: `[通知] ✅ 约局创建成功！\n标题: ${title}\n日期: ${date}${params.time ? ` ${params.time}` : ""}\n人数上限: ${maxPlayers}\n\n查看详情: ${url}`,
  };
}

async function executeJoinActive(
  c: Context<HonoCtxEnv>,
  userId: string,
  params: Record<string, unknown>,
  isWatching: boolean,
): Promise<ActionResult> {
  const d = db(c.env.DB);
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
    return { success: false, notification: "❌ 操作失败：活动不存在" };
  }

  if (active[0].creator_id === userId) {
    return {
      success: false,
      notification: "❌ 操作失败：不能加入/观望自己发起的约局",
    };
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
      return { success: true, notification: `ℹ️ 您已经${status}了此约局` };
    }
    await d
      .update(activeRegistrationsTable)
      .set({ is_watching: isWatching })
      .where(eq(activeRegistrationsTable.id, existing[0].id));
    const status = isWatching ? "观望" : "参加";
    const url = SITE_LINKS.activeDetail(activeId);
    return {
      success: true,
      notification: `[通知] ✅ 已切换为${status}状态\n约局: ${active[0].title}\n\n查看详情: ${url}`,
    };
  }

  if (!isWatching) {
    const [{ count }] = await d
      .select({ count: drizzle.count(activeRegistrationsTable.id) })
      .from(activeRegistrationsTable)
      .where(
        and(
          eq(activeRegistrationsTable.active_id, activeId),
          eq(activeRegistrationsTable.is_watching, false),
        ),
      );
    if (count >= active[0].max_players) {
      return {
        success: false,
        notification: "❌ 操作失败：人数已满，可以选择观望",
      };
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
  return {
    success: true,
    notification: `[通知] ✅ 成功${status}约局\n约局: ${active[0].title}\n\n查看详情: ${url}`,
  };
}

async function executeLeaveActive(
  c: Context<HonoCtxEnv>,
  userId: string,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const d = db(c.env.DB);
  const activeId = params.active_id as string;

  if (!activeId) {
    return { success: false, notification: "❌ 退出约局失败：缺少约局ID" };
  }

  const active = await d
    .select({ creator_id: activesTable.creator_id, title: activesTable.title })
    .from(activesTable)
    .where(eq(activesTable.id, activeId))
    .limit(1);

  if (active.length === 0) {
    return { success: false, notification: "❌ 约局不存在" };
  }

  if (active[0].creator_id === userId) {
    try {
      await d
        .delete(activeRegistrationsTable)
        .where(eq(activeRegistrationsTable.active_id, activeId));
      await d.delete(activesTable).where(eq(activesTable.id, activeId));
    } catch (e) {
      console.error("[mutations:leave_active] delete failed:", e);
      return { success: false, notification: `❌ 删除约局失败：${String(e)}` };
    }
    return {
      success: true,
      notification: `[通知] ✅ 约局已删除\n标题: ${active[0].title}\n\n（组织者退出即删除整个约局）`,
    };
  }

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
    console.error("[mutations:leave_active] unregister failed:", e);
    return { success: false, notification: `❌ 退出约局失败：${String(e)}` };
  }

  const url = SITE_LINKS.activeDetail(activeId);
  return {
    success: true,
    notification: `[通知] ✅ 已退出约局\n约局: ${active[0].title}\n\n查看详情: ${url}`,
  };
}

if (active[0].creator_id === userId) {
  await d
    .delete(activeRegistrationsTable)
    .where(eq(activeRegistrationsTable.active_id, activeId));
  await d.delete(activesTable).where(eq(activesTable.id, activeId));
  return {
      success: true,
      notification: `[通知] ✅ 约局已删除\n标题: ${active[0].title}\n\n（组织者退出即删除整个约局）`,
    };
}

await d
  .delete(activeRegistrationsTable)
  .where(
    and(
      eq(activeRegistrationsTable.active_id, activeId),
      eq(activeRegistrationsTable.user_id, userId),
    ),
  );

const url = SITE_LINKS.activeDetail(activeId);
return {
    success: true,
    notification: `[通知] ✅ 已退出约局\n\n查看详情: ${url}`,
  };
}

async
function executeUpdateActive(
  c: Context<HonoCtxEnv>,
  userId: string,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const d = db(c.env.DB);
  const activeId = params.id as string;

  const active = await d
    .select({ creator_id: activesTable.creator_id })
    .from(activesTable)
    .where(eq(activesTable.id, activeId))
    .limit(1);

  if (active.length === 0) {
    return { success: false, notification: "❌ 操作失败：约局不存在" };
  }

  if (active[0].creator_id !== userId) {
    return {
      success: false,
      notification: "❌ 操作失败：只有发起者可以修改约局",
    };
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
  return {
    success: true,
    notification: `[通知] ✅ 约局修改成功\n\n查看详情: ${url}`,
  };
}

async function executeUpsertBusinessCard(
  c: Context<HonoCtxEnv>,
  userId: string,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const d = db(c.env.DB);

  const existing = await d
    .select({ id: userBusinessCardTable.id })
    .from(userBusinessCardTable)
    .where(eq(userBusinessCardTable.id, userId))
    .limit(1);

  const data = {
    share_phone: params.share_phone as boolean | undefined,
    wechat: params.wechat as string | undefined,
    qq: params.qq as string | undefined,
    custom_content: params.custom_content as string | undefined,
    update_at: new Date(),
  };

  if (existing.length > 0) {
    await d
      .update(userBusinessCardTable)
      .set(data)
      .where(eq(userBusinessCardTable.id, userId));
  } else {
    await d.insert(userBusinessCardTable).values({ id: userId, ...data });
  }

  return {
    success: true,
    notification: `[通知] ✅ 名片${existing.length > 0 ? "更新" : "创建"}成功\n\n查看: ${SITE_LINKS.me()}`,
  };
}

async function executeSendSmsCode(
  c: Context<HonoCtxEnv>,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const env = c.env as any;
  const phone = params.phone as string;
  const kv = env.KV as KVNamespace;

  if (env.DEV_SMS_CODE) {
    await kv.put(`sms_code:${phone}`, env.DEV_SMS_CODE, { expirationTtl: 300 });
    return {
      success: true,
      notification: `[通知] ✅ 验证码已发送到 ${phone.slice(0, 3)}****${phone.slice(-4)}\n请在5分钟内回复验证码完成绑定`,
    };
  }

  const { customAlphabet } = await import("nanoid");
  const code = customAlphabet("0123456789", 6)();

  try {
    const aliyunClient = (c as any).get?.("aliyunClient") || env.aliyunClient;
    if (!aliyunClient) {
      return {
        success: false,
        notification: "❌ 短信服务未配置，请联系管理员",
      };
    }

    const { SendSmsRequest } = await import("@alicloud/dysmsapi20170525");
    const request = new SendSmsRequest({
      phoneNumbers: phone,
      signName: "武汉市奇兵文化创意",
      templateCode: "SMS_330260870",
      templateParam: JSON.stringify({ code }),
    });
    const response = await aliyunClient.sendSmsWithOptions(request, {});
    const body = response?.body;

    if (body?.code !== "OK") {
      if (body?.code === "isv.MOBILE_NUMBER_ILLEGAL") {
        return { success: false, notification: "❌ 手机号码格式错误" };
      }
      if (body?.code === "isv.BUSINESS_LIMIT_CONTROL") {
        return { success: false, notification: "❌ 发送次数过多，请稍后再试" };
      }
      return { success: false, notification: "❌ 无法发送短信，请联系管理员" };
    }

    await kv.put(`sms_code:${phone}`, code, { expirationTtl: 300 });

    return {
      success: true,
      notification: `[通知] ✅ 验证码已发送到 ${phone.slice(0, 3)}****${phone.slice(-4)}\n请在5分钟内回复验证码完成绑定`,
    };
  } catch (e) {
    console.error("[mutations:sms] error:", e);
    return { success: false, notification: "❌ 短信发送失败，请稍后再试" };
  }
}

async function executeVerifyPhone(
  c: Context<HonoCtxEnv>,
  userId: string,
  openId: string,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const env = c.env as any;
  const kv = env.KV as KVNamespace;
  const phone = params.phone as string;
  const code = params.code as string;

  const storedCode = env.DEV_SMS_CODE || (await kv.get(`sms_code:${phone}`));
  if (!storedCode || storedCode !== code) {
    return {
      success: false,
      notification: "❌ 验证码错误或已过期，请重新发送",
    };
  }

  await kv.delete(`sms_code:${phone}`);

  const d = db(c.env.DB);

  const existingAccount = await d
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(eq(accounts.provider, "SMS"), eq(accounts.providerAccountId, phone)),
    )
    .limit(1);

  if (existingAccount.length > 0 && existingAccount[0].userId !== userId) {
    return { success: false, notification: "❌ 该手机号已被其他账号使用" };
  }

  await d
    .update(userInfoTable)
    .set({ phone })
    .where(eq(userInfoTable.id, userId));

  if (existingAccount.length === 0) {
    await d.insert(accounts).values({
      userId,
      type: "credentials" as "credentials",
      provider: "SMS",
      providerAccountId: phone,
    } as any);
  }

  return {
    success: true,
    notification: `[通知] ✅ 手机号绑定成功\n已绑定: ${phone.slice(0, 3)}****${phone.slice(-4)}\n\n查看: ${SITE_LINKS.me()}`,
  };
}

async function executeBindGsz(
  c: Context<HonoCtxEnv>,
  userId: string,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const d = db(c.env.DB);
  const env = c.env as any;

  const existing = await d
    .select({ gsz_id: mahjongRegistrationsTable.gsz_id })
    .from(mahjongRegistrationsTable)
    .where(eq(mahjongRegistrationsTable.user_id, userId))
    .limit(1);

  if (existing.length > 0) {
    return {
      success: true,
      notification: `ℹ️ 您已绑定公式战账号（ID: ${existing[0].gsz_id}）\n\n查看: ${SITE_LINKS.myRiichi()}`,
    };
  }

  const userInfo = await d
    .select({ phone: userInfoTable.phone })
    .from(userInfoTable)
    .where(eq(userInfoTable.id, userId))
    .limit(1);

  const phone = (params.phone as string) || userInfo[0]?.phone;
  if (!phone) {
    return {
      success: false,
      notification: "❌ 绑定公式战需要手机号，请先绑定手机号",
    };
  }

  const gszName = (params.gsz_name as string) || "未命名";
  const gszToken = env.GSZ_TOKEN as string;

  if (!gszToken) {
    return {
      success: false,
      notification: "❌ 公式战服务未配置，请联系管理员",
    };
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
    const searchData = (await searchRes.json()) as any;

    if (searchData.code === 200 && searchData.data?.records?.length > 0) {
      gszId = searchData.data.records[0].id;
      actualGszName = searchData.data.records[0].name;
    } else {
      const regRes = await fetch(
        "https://gsz.rmlinking.com/gszapi/open/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", token: gszToken },
          body: JSON.stringify({ params: { username: gszName, phone } }),
        },
      );
      const regData = (await regRes.json()) as any;
      if (regData.code === 200) {
        gszId = regData.data;
      } else {
        gszError = regData.message || "注册失败";
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
    return {
      success: true,
      notification: `[通知] ✅ 公式战绑定成功\n公式战昵称: ${actualGszName}\nID: ${gszId}\n\n查看战绩: ${SITE_LINKS.myRiichi()}`,
    };
  }

  return {
    success: false,
    notification: `⚠️ 公式战注册信息已保存，但同步失败: ${gszError}\n后续会自动重试\n\n查看: ${SITE_LINKS.myRiichi()}`,
  };
}
