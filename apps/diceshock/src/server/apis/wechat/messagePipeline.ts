import type { AgentMessage } from "./types";
import {
  sendCustomerImageMessage,
  sendCustomerTextMessage,
  uploadImageToWechat,
} from "./wechatApi";

const MAX_MESSAGES = 5;

/**
 * Splits a text content into separate messages by paragraph boundaries.
 * Consecutive list items (lines starting with - or digit.) are kept together.
 */
function splitTextByParagraphs(content: string): string[] {
  const lines = content.split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n"));
        currentBlock = [];
      }
      continue;
    }

    const isListItem = /^[-•]\s|^\d+[.)]\s/.test(trimmed);
    const lastIsListItem =
      currentBlock.length > 0 &&
      /^[-•]\s|^\d+[.)]\s/.test(currentBlock[currentBlock.length - 1].trim());

    if (currentBlock.length > 0 && !isListItem && !lastIsListItem) {
      blocks.push(currentBlock.join("\n"));
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n"));
  }

  return blocks.filter((b) => b.trim().length > 0);
}

export function parseAgentOutput(rawOutput: string): AgentMessage[] {
  try {
    const parsed = JSON.parse(rawOutput);

    if (!Array.isArray(parsed)) {
      return expandTextMessages([{ type: "text", content: rawOutput }]);
    }

    const validMessages = parsed.filter(
      (item: unknown): item is AgentMessage =>
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        (item.type === "text" || item.type === "img" || item.type === "totp"),
    );

    if (validMessages.length === 0) {
      return expandTextMessages([{ type: "text", content: rawOutput }]);
    }

    return expandTextMessages(validMessages).slice(0, MAX_MESSAGES);
  } catch {
    return expandTextMessages([{ type: "text", content: rawOutput }]);
  }
}

function expandTextMessages(messages: AgentMessage[]): AgentMessage[] {
  const expanded: AgentMessage[] = [];

  for (const msg of messages) {
    if (msg.type === "text") {
      const paragraphs = splitTextByParagraphs(msg.content);
      for (const p of paragraphs) {
        expanded.push({ type: "text", content: p });
      }
    } else {
      expanded.push(msg);
    }
  }

  return expanded;
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
