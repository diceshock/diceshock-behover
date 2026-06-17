import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { handleMenuEvent, handleTextMessage } from "./messageHandler";
import { buildEmptyReply, buildTextReply, parseXml } from "./xmlUtils";

export async function wechatVerify(c: Context<HonoCtxEnv>) {
  const { signature, timestamp, nonce, echostr } = c.req.query();
  const token = (c.env as any).WECHAT_MP_TOKEN as string;

  if (!signature || !timestamp || !nonce || !echostr || !token) {
    return c.text("missing params", 400);
  }

  const items = [token, timestamp, nonce].sort();
  const raw = items.join("");
  const buf = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(raw),
  );
  const hash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (hash === signature) {
    return c.text(echostr);
  }
  return c.text("invalid signature", 403);
}

export async function wechatMessage(c: Context<HonoCtxEnv>) {
  const body = await c.req.text();
  const msg = parseXml(body);

  const toUser = msg.FromUserName;
  const fromUser = msg.ToUserName;

  if (!toUser || !fromUser) {
    return c.text(buildEmptyReply());
  }

  const msgType = msg.MsgType;

  if (msgType === "text") {
    const reply = await handleTextMessage(c, msg);
    return c.body(buildTextReply(toUser, fromUser, reply), 200, {
      "Content-Type": "application/xml",
    });
  }

  if (msgType === "event") {
    const eventType = msg.Event;
    if (eventType === "CLICK") {
      const result = await handleMenuEvent(c, msg);
      if (result) {
        return c.body(result.xml, 200, { "Content-Type": "application/xml" });
      }
    }
    return c.text(buildEmptyReply());
  }

  return c.text(buildEmptyReply());
}
