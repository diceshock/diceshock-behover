import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { decryptMessage, encryptMessage } from "./crypto";
import { handleMenuEvent, handleTextMessage } from "./messageHandler";
import { buildEmptyReply, buildTextReply, parseXml } from "./xmlUtils";

function extractCdataContent(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`);
  const match = xml.match(re);
  return match?.[1];
}

export async function wechatVerify(c: Context<HonoCtxEnv>) {
  const { signature, timestamp, nonce, echostr } = c.req.query();
  const token = (c.env as any).WECHAT_MP_TOKEN as string;

  if (!signature || !timestamp || !nonce || !echostr || !token) {
    console.log("[wechat:verify] missing params", {
      signature: !!signature,
      timestamp: !!timestamp,
      nonce: !!nonce,
      echostr: !!echostr,
      token: !!token,
    });
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
  console.log("[wechat:verify] signature mismatch", {
    expected: hash,
    got: signature,
  });
  return c.text("invalid signature", 403);
}

export async function wechatMessage(c: Context<HonoCtxEnv>) {
  const env = c.env as any;
  const body = await c.req.text();
  const encryptType = c.req.query("encrypt_type");

  console.log("[wechat:msg] received", {
    encryptType,
    bodyLen: body.length,
    body: body.slice(0, 300),
  });

  let msg: Record<string, string>;

  if (encryptType === "aes") {
    const aesKey = env.WECHAT_MP_ENCODING_AES_KEY as string;
    const appId = env.WECHAT_MP_APP_ID as string;

    if (!aesKey || !appId) {
      console.log("[wechat:msg] missing AES config", {
        aesKey: !!aesKey,
        appId: !!appId,
      });
      return c.text(buildEmptyReply());
    }

    const outerXml = parseXml(body);
    const encrypted = outerXml.Encrypt || extractCdataContent(body, "Encrypt");
    if (!encrypted) {
      console.log("[wechat:msg] no Encrypt field in XML");
      return c.text(buildEmptyReply());
    }

    console.log("[wechat:msg] encrypt field", {
      len: encrypted.length,
      first30: encrypted.slice(0, 30),
      last30: encrypted.slice(-30),
      mod4: encrypted.length % 4,
    });

    try {
      const decrypted = await decryptMessage(encrypted, aesKey);
      console.log("[wechat:msg] decrypted ok, len:", decrypted.length);
      msg = parseXml(decrypted);
    } catch (e) {
      console.error("[wechat:msg] decrypt failed:", e);
      console.error("[wechat:msg] encrypted raw (full):", encrypted);
      return c.text(buildEmptyReply());
    }
  } else {
    msg = parseXml(body);
  }

  const toUser = msg.FromUserName;
  const fromUser = msg.ToUserName;

  console.log("[wechat:msg] parsed", {
    msgType: msg.MsgType,
    toUser: !!toUser,
    fromUser: !!fromUser,
    content: msg.Content?.slice(0, 50),
  });

  if (!toUser || !fromUser) {
    return c.text(buildEmptyReply());
  }

  const msgType = msg.MsgType;

  if (msgType === "text") {
    const reply = await handleTextMessage(c, msg);
    console.log("[wechat:msg] reply len:", reply.length);
    return c.body(buildTextReply(toUser, fromUser, reply), 200, {
      "Content-Type": "application/xml",
    });
  }

  if (msgType === "event") {
    const eventType = msg.Event;
    console.log("[wechat:msg] event:", eventType, msg.EventKey);
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
