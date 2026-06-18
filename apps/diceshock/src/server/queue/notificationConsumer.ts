import {
  type NotificationMessage,
  notifyGszSync,
  notifyMahjongStart,
  notifyMembershipChange,
  notifyOrderSettled,
  notifyOrderStart,
  notifyPassExpiring,
  notifyPhoneBound,
  notifyTableTransfer,
  resolveUserOpenId,
  resolveUsersOpenIds,
} from "@/server/apis/wechat/templateMessage";

export type { NotificationMessage };

export async function handleNotificationQueue(
  batch: MessageBatch<NotificationMessage>,
  env: Cloudflare.Env,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      await dispatchNotification(env, msg.body);
      msg.ack();
    } catch (e) {
      console.error("[notification:queue] failed", {
        type: msg.body.type,
        error: e instanceof Error ? e.message : String(e),
      });
      msg.retry();
    }
  }
}

async function dispatchNotification(
  env: Cloudflare.Env,
  message: NotificationMessage,
): Promise<void> {
  switch (message.type) {
    case "order_start": {
      const openId = await resolveUserOpenId(env, message.userId);
      if (!openId) return;
      await notifyOrderStart(env, openId, message.data);
      return;
    }
    case "table_transfer": {
      const openId = await resolveUserOpenId(env, message.userId);
      if (!openId) return;
      await notifyTableTransfer(env, openId, message.data);
      return;
    }
    case "mahjong_start": {
      const openIdMap = await resolveUsersOpenIds(env, message.userIds);
      for (const [, openId] of openIdMap) {
        await notifyMahjongStart(env, openId, message.data);
      }
      return;
    }
    case "gsz_sync": {
      const openIdMap = await resolveUsersOpenIds(env, message.userIds);
      for (const [, openId] of openIdMap) {
        await notifyGszSync(env, openId, message.data);
      }
      return;
    }
    case "phone_bound": {
      const openId = await resolveUserOpenId(env, message.userId);
      if (!openId) return;
      await notifyPhoneBound(env, openId, message.data);
      return;
    }
    case "order_settled": {
      const openId = await resolveUserOpenId(env, message.userId);
      if (!openId) return;
      await notifyOrderSettled(env, openId, message.data);
      return;
    }
    case "membership_change": {
      const openId = await resolveUserOpenId(env, message.userId);
      if (!openId) return;
      await notifyMembershipChange(env, openId, message.data);
      return;
    }
    case "pass_expiring": {
      const openId =
        message.openId ?? (await resolveUserOpenId(env, message.userId));
      if (!openId) return;
      await notifyPassExpiring(env, openId, message.data);
      return;
    }
  }
}
