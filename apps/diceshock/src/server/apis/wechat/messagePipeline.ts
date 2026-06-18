import type { AgentMessage } from "./types";
import {
  sendCustomerImageMessage,
  sendCustomerTextMessage,
  uploadImageToWechat,
} from "./wechatApi";

const MAX_MESSAGES = 5;

function stripCodeBlock(raw: string): string {
  const match = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (match) return match[1].trim();
  return raw.trim();
}

export function parseAgentOutput(rawOutput: string): AgentMessage[] {
  if (!rawOutput?.trim()) return [];

  const trimmed = stripCodeBlock(rawOutput);

  try {
    const parsed = JSON.parse(trimmed);

    const messages: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.messages)
        ? parsed.messages
        : null;

    if (!messages) {
      return [{ type: "text", content: trimmed }];
    }

    const validMessages = messages.filter(
      (item: unknown): item is AgentMessage =>
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        (item.type === "text" || item.type === "img" || item.type === "totp"),
    );

    if (validMessages.length === 0) {
      return [{ type: "text", content: trimmed }];
    }

    return validMessages.slice(0, MAX_MESSAGES);
  } catch {
    return [{ type: "text", content: trimmed }];
  }
}

export async function dispatchMessages(
  env: any,
  openId: string,
  messages: AgentMessage[],
): Promise<void> {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    try {
      switch (msg.type) {
        case "text":
          await sendCustomerTextMessage(env, openId, msg.content);
          break;
        case "img": {
          const mediaId = await uploadImageToWechat(env, msg.url);
          if (mediaId) {
            await sendCustomerImageMessage(env, openId, mediaId);
          }
          break;
        }
        case "totp": {
          const totpMediaId = await uploadImageToWechat(env, msg.qrcode_url);
          if (totpMediaId) {
            await sendCustomerImageMessage(env, openId, totpMediaId);
          }
          break;
        }
      }

      // 200ms delay between messages to avoid WeChat throttling
      if (i < messages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (e) {
      console.error("[pipeline] dispatch failed for message:", msg.type, e);
      // Continue to next message — don't block on individual failures
    }
  }
}

export async function sendStatusMessage(
  env: any,
  openId: string,
  status: string,
): Promise<void> {
  try {
    await sendCustomerTextMessage(env, openId, status);
  } catch (e) {
    console.error("[pipeline] status message failed:", e);
  }
}
