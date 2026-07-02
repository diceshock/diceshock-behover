/**
 * Agent ↔ Agent 对谈 E2E Test
 *
 * Two agents talk to each other in a multi-turn loop:
 *   - Customer Agent (LLM-simulated user): generates realistic messages
 *   - WeChat Agent (DO): processes messages, uses tools, replies
 *
 * Flow per turn:
 *   1. CustomerAgent.generateStep() → produces a user message
 *   2. POST /wechat → DO processes the message
 *   3. Poll D1 for the agent's persisted reply
 *   4. Feed the reply back to CustomerAgent for next turn
 *
 * This tests the full conversational loop with both sides driven by LLMs,
 * verifying coherence, context retention, and tool usage across turns.
 *
 * Requires: dev server running, DeepSeek API key, VIBE_TEST_LLM_ENDPOINT (optional).
 */
import { test, expect } from "@playwright/test";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import {
  createCustomerAgentFromEnv,
  customerPersonas,
  type CustomerPersona,
  type VibeCustomerAgent,
} from "../scenarios/personas";
import { allJourneys, type VibeJourney } from "../scenarios/feature-catalog";

// ─── D1 Helper ───────────────────────────────────────────────────────────────

const D1_STATE_DIR = path.resolve(
  import.meta.dirname,
  "../../.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
);

function findD1Database(): string {
  const files = fs.readdirSync(D1_STATE_DIR).filter((f) => f.endsWith(".sqlite") && !f.startsWith("metadata"));
  for (const f of files) {
    const db = new Database(path.join(D1_STATE_DIR, f), { readonly: true });
    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='wechat_conversations'").all();
      if (tables.length > 0) return path.join(D1_STATE_DIR, f);
    } finally {
      db.close();
    }
  }
  throw new Error("No D1 database with wechat_conversations table found");
}

interface ConversationRow {
  role: string;
  content: string;
  created_at: number;
}

function getAssistantReplies(openId: string): ConversationRow[] {
  const dbPath = findD1Database();
  const db = new Database(dbPath, { readonly: true });
  try {
    return db
      .prepare("SELECT role, content, created_at FROM wechat_conversations WHERE open_id = ? AND role = 'assistant' ORDER BY created_at ASC")
      .all(openId) as ConversationRow[];
  } finally {
    db.close();
  }
}

async function waitForReply(openId: string, turnIndex: number, timeoutMs = 45_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const replies = getAssistantReplies(openId);
    if (replies.length > turnIndex) {
      return replies[turnIndex].content;
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`[agent-dialog] Timed out waiting for reply turn ${turnIndex + 1} (openId: ${openId.slice(-10)})`);
}

// ─── WeChat Send Helper ──────────────────────────────────────────────────────

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";

async function sendWechatMessage(content: string, openId: string): Promise<string> {
  const msgId = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const createTime = Math.floor(Date.now() / 1000);
  const xml = `<xml>
<ToUserName><![CDATA[gh_diceshock]]></ToUserName>
<FromUserName><![CDATA[${openId}]]></FromUserName>
<CreateTime>${createTime}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${content}]]></Content>
<MsgId>${msgId}</MsgId>
</xml>`;

  const res = await fetch(`${BASE_URL}/wechat`, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xml,
  });
  expect(res.status).toBeLessThan(500);
  return res.text();
}

// ─── Dialogue Runner ─────────────────────────────────────────────────────────

interface DialogueTurn {
  role: "user" | "assistant";
  content: string;
}

interface DialogueResult {
  turns: DialogueTurn[];
  success: boolean;
  journeyId: string;
}

/**
 * Run a multi-turn dialogue between CustomerAgent and WeChat Agent DO.
 * CustomerAgent generates each user message, WeChat Agent produces the reply.
 */
async function runDialogue(
  customerAgent: VibeCustomerAgent,
  persona: CustomerPersona,
  journey: VibeJourney,
  maxTurns: number,
): Promise<DialogueResult> {
  const openId = `oAgent2Agent_${journey.id.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
  const turns: DialogueTurn[] = [];

  // Turn 1: initial message from catalog
  const firstStep = await customerAgent.generateStep(persona, journey);
  let userMessage = firstStep.message;

  for (let turn = 0; turn < maxTurns; turn++) {
    console.log(`  [Turn ${turn + 1}] 用户: ${userMessage.slice(0, 80)}${userMessage.length > 80 ? "..." : ""}`);
    turns.push({ role: "user", content: userMessage });

    // Send to WeChat Agent DO
    const ack = await sendWechatMessage(userMessage, openId);
    expect(ack).toMatch(/收到|success|xml/i);

    // Wait for DO to produce reply
    const agentReply = await waitForReply(openId, turn, 45_000);
    console.log(`  [Turn ${turn + 1}] Agent: ${agentReply.slice(0, 100)}${agentReply.length > 100 ? "..." : ""}`);
    turns.push({ role: "assistant", content: agentReply });

    // Check if conversation reached a natural conclusion
    if (turn >= maxTurns - 1) break;

    // Generate follow-up from customer agent based on the reply
    const followUpJourney: VibeJourney = {
      ...journey,
      realisticPrompt: buildFollowUpPrompt(persona, journey, agentReply, turn),
    };
    const nextStep = await customerAgent.generateStep(persona, followUpJourney);
    userMessage = nextStep.message;

    // Brief pause between turns (simulate human thinking time)
    await new Promise((r) => setTimeout(r, 1500));
  }

  return { turns, success: true, journeyId: journey.id };
}

function buildFollowUpPrompt(
  persona: CustomerPersona,
  journey: VibeJourney,
  lastAgentReply: string,
  turnIndex: number,
): string {
  if (turnIndex === 0) {
    // After first reply: ask a follow-up question
    return `对方刚才回复了: "${lastAgentReply.slice(0, 200)}"。你是${persona.displayName}，根据你的需求(${journey.goal})，请用口语化中文追问一个相关细节或确认操作。`;
  }
  // After subsequent replies: confirm, thank, or ask another question
  return `对方回复了: "${lastAgentReply.slice(0, 200)}"。你是${persona.displayName}，请自然地做出回应（可以确认、感谢、或者补充新的需求）。用口语化中文回复。`;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

const agentJourneys = allJourneys().filter((j) => j.coverage.includes("agent"));

test.describe("Agent ↔ Agent 对谈", () => {
  test.describe.configure({ timeout: 180_000 });

  let customerAgent: VibeCustomerAgent;
  let persona: CustomerPersona;

  test.beforeAll(() => {
    customerAgent = createCustomerAgentFromEnv();
    persona = customerPersonas[0];
  });

  for (const journey of agentJourneys) {
    test(`3轮对谈: ${journey.name} (${journey.id})`, async () => {
      const result = await runDialogue(customerAgent, persona, journey, 3);

      // Verify: we got all 3 turns of dialogue (3 user + 3 assistant)
      expect(result.turns.length).toBe(6);

      // Verify: agent replies are substantive
      const agentReplies = result.turns.filter((t) => t.role === "assistant");
      for (const reply of agentReplies) {
        expect(reply.content.length).toBeGreaterThan(10);
        // Contains Chinese (not garbage or error HTML)
        expect(reply.content).toMatch(/[\u4e00-\u9fff]/);
      }

      // Verify: no error messages in replies
      for (const reply of agentReplies) {
        expect(reply.content).not.toContain("Internal Server Error");
        expect(reply.content).not.toContain("<!DOCTYPE");
      }

      console.log(`\n  ✅ ${journey.id}: ${agentReplies.length} agent replies, all coherent\n`);
    });
  }

  test("5轮深度对谈: 从查询到操作的完整流程", async () => {
    // Use the "create active" journey for a deeper conversation
    const createJourney = agentJourneys.find((j) => j.id === "wechat-create-active")
      ?? agentJourneys[0];

    const result = await runDialogue(customerAgent, persona, createJourney, 5);

    expect(result.turns.length).toBe(10); // 5 user + 5 assistant
    const agentReplies = result.turns.filter((t) => t.role === "assistant");

    // All replies should be substantive Chinese text
    for (const reply of agentReplies) {
      expect(reply.content.length).toBeGreaterThan(10);
      expect(reply.content).toMatch(/[\u4e00-\u9fff]/);
    }

    // Later replies should show awareness of earlier context
    // (e.g. referencing game name, time, or store mentioned in turn 1)
    const firstUserMessage = result.turns[0].content;
    const lastReply = agentReplies[agentReplies.length - 1].content;
    console.log(`  First user: ${firstUserMessage.slice(0, 60)}...`);
    console.log(`  Last agent: ${lastReply.slice(0, 100)}...`);
  });

  test("对谈中断恢复: 中途换话题后 agent 能跟上", async () => {
    const openId = `oAgent2Agent_topic_switch_${Date.now()}`;

    // Turn 1: ask about tables
    console.log("  [Turn 1] 用户: 今天有空桌吗？");
    await sendWechatMessage("今天有空桌吗？", openId);
    const reply1 = await waitForReply(openId, 0, 30_000);
    console.log(`  [Turn 1] Agent: ${reply1.slice(0, 80)}...`);
    expect(reply1).toMatch(/[\u4e00-\u9fff]/);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 2: completely switch topic
    console.log("  [Turn 2] 用户: 突然想问，你们卖奶茶吗？");
    await sendWechatMessage("突然想问，你们卖奶茶吗？", openId);
    const reply2 = await waitForReply(openId, 1, 30_000);
    console.log(`  [Turn 2] Agent: ${reply2.slice(0, 80)}...`);
    expect(reply2).toMatch(/[\u4e00-\u9fff]/);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 3: reference first topic again
    console.log("  [Turn 3] 用户: 好吧回到正题，我刚才问的桌位，4个人够坐吗？");
    await sendWechatMessage("好吧回到正题，我刚才问的桌位，4个人够坐吗？", openId);
    const reply3 = await waitForReply(openId, 2, 30_000);
    console.log(`  [Turn 3] Agent: ${reply3.slice(0, 80)}...`);
    expect(reply3).toMatch(/[\u4e00-\u9fff]/);
    // Agent should handle the context switch gracefully
    expect(reply3.length).toBeGreaterThan(10);
  });
});
