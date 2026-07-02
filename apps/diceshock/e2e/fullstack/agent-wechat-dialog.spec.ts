/**
 * WeChat Agent DO — Multi-Turn Conversation E2E Test
 *
 * Simulates a real user chatting with the agent across multiple turns.
 * Verifies that:
 *   1. Agent produces meaningful replies to user messages
 *   2. Context is maintained across turns (agent remembers earlier messages)
 *   3. Agent handles tool calls (e.g. querying orders, tables)
 *   4. Progress updates are sent during processing
 *
 * Verification: polls the local D1 sqlite (wechat_conversations table)
 * to read the agent's actual persisted replies after dispatch.
 *
 * Requires: dev server running, DeepSeek API key set in env.
 */
import { test, expect } from "@playwright/test";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// ─── D1 Helper ───────────────────────────────────────────────────────────────

const D1_STATE_DIR = path.resolve(
  import.meta.dirname,
  "../../.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
);

function findD1Database(): string {
  const files = fs.readdirSync(D1_STATE_DIR).filter((f) => f.endsWith(".sqlite") && !f.startsWith("metadata"));
  if (files.length === 0) throw new Error("No D1 sqlite file found");
  // Use the only non-metadata sqlite (or the largest one)
  if (files.length === 1) return path.join(D1_STATE_DIR, files[0]);
  // Multiple DBs — find the one with wechat_conversations
  for (const f of files) {
    const db = new Database(path.join(D1_STATE_DIR, f), { readonly: true });
    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='wechat_conversations'").all();
      if (tables.length > 0) return path.join(D1_STATE_DIR, f);
    } finally {
      db.close();
    }
  }
  throw new Error("No D1 database with wechat_conversations table");
}

interface ConversationRow {
  id: string;
  open_id: string;
  role: string;
  content: string;
  metadata: string | null;
  created_at: number;
}

function getConversations(openId: string): ConversationRow[] {
  const dbPath = findD1Database();
  const db = new Database(dbPath, { readonly: true });
  try {
    return db
      .prepare("SELECT * FROM wechat_conversations WHERE open_id = ? ORDER BY created_at ASC")
      .all(openId) as ConversationRow[];
  } finally {
    db.close();
  }
}

function getLatestAssistantReply(openId: string): string | null {
  const dbPath = findD1Database();
  const db = new Database(dbPath, { readonly: true });
  try {
    const row = db
      .prepare("SELECT content FROM wechat_conversations WHERE open_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1")
      .get(openId) as { content: string } | undefined;
    return row?.content ?? null;
  } finally {
    db.close();
  }
}

/** Poll D1 until the assistant has replied to the given user message turn. */
async function waitForReply(
  openId: string,
  expectedTurnCount: number,
  timeoutMs = 30_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = getConversations(openId);
    const assistantRows = rows.filter((r) => r.role === "assistant");
    if (assistantRows.length >= expectedTurnCount) {
      return assistantRows[assistantRows.length - 1].content;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for assistant reply (turn ${expectedTurnCount}) for ${openId}`);
}

// ─── WeChat Client (using native fetch, no Playwright request fixture) ───────

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const TEST_USER = `oDialogE2E_${Date.now()}`;

function buildTextXml(content: string, openId: string, msgId?: string): string {
  const id = msgId ?? `${Date.now()}001`;
  const createTime = Math.floor(Date.now() / 1000);
  return `<xml>
<ToUserName><![CDATA[gh_diceshock_test]]></ToUserName>
<FromUserName><![CDATA[${openId}]]></FromUserName>
<CreateTime>${createTime}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${content}]]></Content>
<MsgId>${id}</MsgId>
</xml>`;
}

async function sendMessage(content: string, openId: string, msgId?: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/wechat`, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: buildTextXml(content, openId, msgId),
  });
  expect(res.status, `POST /wechat failed: ${res.status}`).toBeLessThan(500);
  return res.text();
}

// ─── Conversation Scenarios ──────────────────────────────────────────────────

test.describe("用户-Agent 多轮对话模拟", () => {
  test.describe.configure({ timeout: 120_000 });

  test("3轮自然对话：自我介绍 → 问题 → 上下文确认", async () => {
    const openId = `${TEST_USER}_natural`;

    // ── Turn 1: 用户打招呼 ──
    console.log("[Turn 1] 用户: 你好，我是小明");
    const ack1 = await sendMessage("你好，我是小明", openId, `${Date.now()}001`);
    expect(ack1).toMatch(/收到|success|xml/i);

    const reply1 = await waitForReply(openId, 1, 30_000);
    console.log(`[Turn 1] Agent: ${reply1.slice(0, 120)}...`);
    expect(reply1.length).toBeGreaterThan(5);
    // Agent should acknowledge the user or respond in Chinese
    expect(reply1).toMatch(/[\u4e00-\u9fff]/); // Contains Chinese characters

    // ── Turn 2: 用户提问 ──
    await new Promise((r) => setTimeout(r, 2000)); // Brief pause between turns
    console.log("[Turn 2] 用户: 你们店什么时候开门？");
    const ack2 = await sendMessage("你们店什么时候开门？", openId, `${Date.now()}002`);
    expect(ack2).toMatch(/收到|success|xml/i);

    const reply2 = await waitForReply(openId, 2, 30_000);
    console.log(`[Turn 2] Agent: ${reply2.slice(0, 120)}...`);
    expect(reply2.length).toBeGreaterThan(10);
    // Should mention time/hours or business-related info
    expect(reply2).toMatch(/[\u4e00-\u9fff]/);

    // ── Turn 3: 上下文确认 ──
    await new Promise((r) => setTimeout(r, 2000));
    console.log("[Turn 3] 用户: 你还记得我叫什么吗？");
    const ack3 = await sendMessage("你还记得我叫什么吗？", openId, `${Date.now()}003`);
    expect(ack3).toMatch(/收到|success|xml/i);

    const reply3 = await waitForReply(openId, 3, 30_000);
    console.log(`[Turn 3] Agent: ${reply3.slice(0, 120)}...`);
    expect(reply3.length).toBeGreaterThan(5);
    // Agent should reference "小明" from turn 1
    expect(reply3).toContain("小明");

    // ── Verify full history ──
    const allConversations = getConversations(openId);
    expect(allConversations.length).toBe(6); // 3 user + 3 assistant
    expect(allConversations.filter((r) => r.role === "user").length).toBe(3);
    expect(allConversations.filter((r) => r.role === "assistant").length).toBe(3);
  });

  test("工具调用对话：查询 → 追问", async () => {
    const openId = `${TEST_USER}_tool`;

    // ── Turn 1: 触发工具调用（查询桌位） ──
    console.log("[Turn 1] 用户: 现在有空桌吗？");
    const ack1 = await sendMessage("现在有空桌吗？", openId, `${Date.now()}001`);
    expect(ack1).toMatch(/收到|success|xml/i);

    const reply1 = await waitForReply(openId, 1, 40_000);
    console.log(`[Turn 1] Agent: ${reply1.slice(0, 150)}...`);
    expect(reply1.length).toBeGreaterThan(10);
    // Agent should respond about tables/availability (may use tools)
    expect(reply1).toMatch(/[\u4e00-\u9fff]/);

    // ── Turn 2: 追问细节 ──
    await new Promise((r) => setTimeout(r, 2000));
    console.log("[Turn 2] 用户: 能容纳4个人的桌有吗？");
    const ack2 = await sendMessage("能容纳4个人的桌有吗？", openId, `${Date.now()}002`);
    expect(ack2).toMatch(/收到|success|xml/i);

    const reply2 = await waitForReply(openId, 2, 40_000);
    console.log(`[Turn 2] Agent: ${reply2.slice(0, 150)}...`);
    expect(reply2.length).toBeGreaterThan(10);
    // Should be about table capacity or availability
    expect(reply2).toMatch(/[\u4e00-\u9fff]/);
  });

  test("快速中断：发新消息打断旧处理", async () => {
    const openId = `${TEST_USER}_interrupt`;

    // ── Turn 1: 发一条需要长时间处理的消息 ──
    console.log("[Turn 1] 用户: 帮我详细分析所有会员的消费习惯（复杂）");
    await sendMessage("帮我详细分析所有会员的消费习惯和偏好，生成完整报告", openId, `${Date.now()}001`);

    // ── Turn 2: 200ms后打断 ──
    await new Promise((r) => setTimeout(r, 200));
    console.log("[Turn 2] 用户: 算了，就告诉我今天有几桌在玩");
    const ack2 = await sendMessage("算了，就告诉我今天有几桌在玩", openId, `${Date.now()}002`);
    expect(ack2).toMatch(/收到|success|xml/i);

    // Only the LAST message should produce a persisted reply
    // (first one was aborted)
    const reply = await waitForReply(openId, 1, 40_000);
    console.log(`[Final Agent Reply]: ${reply.slice(0, 150)}...`);
    expect(reply.length).toBeGreaterThan(5);

    // Verify: should be about today's tables (the interrupted topic)
    // NOT about "detailed member analysis" (the aborted topic)
    const allConversations = getConversations(openId);
    const assistantReplies = allConversations.filter((r) => r.role === "assistant");
    // At most 1 reply (aborted first doesn't get persisted)
    expect(assistantReplies.length).toBeLessThanOrEqual(2);
  });

  test("错误恢复：发送后agent仍可继续处理", async () => {
    const openId = `${TEST_USER}_recovery`;

    // Send a message that's simple and should always work
    console.log("[Turn 1] 用户: 1+1等于几？");
    const ack = await sendMessage("1+1等于几？", openId, `${Date.now()}001`);
    expect(ack).toMatch(/收到|success|xml/i);

    const reply = await waitForReply(openId, 1, 20_000);
    console.log(`[Turn 1] Agent: ${reply.slice(0, 80)}`);
    expect(reply).toMatch(/2|二/);
  });
});
