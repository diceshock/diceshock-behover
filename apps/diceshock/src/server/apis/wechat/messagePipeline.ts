import type { AgentMessage } from "./types";
import {
  sendCustomerImageMessage,
  sendCustomerTextMessage,
  uploadImageToWechat,
} from "./wechatApi";

interface PipelineEnv {
  KV: KVNamespace;
  WECHAT_MP_APP_ID: string;
  WECHAT_MP_APP_SECRET: string;
}

const MAX_MESSAGES = 5;

function stripCodeBlock(raw: string): string {
  const match = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (match) return match[1].trim();
  return raw.trim();
}

function extractObjects(raw: string): AgentMessage[] {
  const results: AgentMessage[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        const slice = raw.slice(start, i + 1);
        try {
          const obj = JSON.parse(slice);
          if (obj?.type && obj?.content) {
            results.push(obj as AgentMessage);
          }
        } catch {
          const fixed = slice
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t");
          try {
            const obj = JSON.parse(fixed);
            if (obj?.type && obj?.content) {
              results.push(obj as AgentMessage);
            }
          } catch {}
        }
        start = -1;
      }
    }
  }

  return results;
}

export function parseAgentOutput(rawOutput: string): AgentMessage[] {
  if (!rawOutput?.trim()) return [];

  const trimmed = stripCodeBlock(rawOutput);
  const messages = extractObjects(trimmed);

  if (messages.length > 0) return messages.slice(0, MAX_MESSAGES);

  return [{ type: "text", content: trimmed }];
}

export async function dispatchMessages(
  env: PipelineEnv,
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
  env: PipelineEnv,
  openId: string,
  status: string,
): Promise<void> {
  try {
    await sendCustomerTextMessage(env, openId, status);
  } catch (e) {
    console.error("[pipeline] status message failed:", e);
  }
}
