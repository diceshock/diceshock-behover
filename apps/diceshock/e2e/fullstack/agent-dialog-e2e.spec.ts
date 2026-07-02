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

test.describe("极复杂多轮场景", () => {
  test.describe.configure({ timeout: 300_000 }); // 5min per test

  /**
   * 场景: 一个从未注册的新用户想约一局桌游，但信息不全。
   * 需要 agent 引导多轮收集: 游戏名→确认库存→人数→时间→店铺→手机注册→验证码→创建约局
   * 覆盖: boardgame.search + active.create + account(手机绑定) 多skill跨领域协作
   */
  test("新用户完整约局流程: 搜桌游→确认信息→注册手机→创建约局", async () => {
    const openId = `oComplex_newuser_${Date.now()}`;

    // Turn 1: 模糊请求，信息不全
    console.log("  [T1] 用户: 我想约一局桌游");
    await sendWechatMessage("我想约一局桌游，周末下午有人一起吗", openId);
    const r1 = await waitForReply(openId, 0, 60_000);
    console.log(`  [T1] Agent: ${r1.slice(0, 120)}...`);
    expect(r1).toMatch(/[\u4e00-\u9fff]/);
    expect(r1.length).toBeGreaterThan(20);
    // Agent should ask for more info (game, people count, which day)

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 2: 给出游戏但还缺时间/人数细节
    console.log("  [T2] 用户: 想玩阿瓦隆，大概6到8个人");
    await sendWechatMessage("想玩阿瓦隆，大概6到8个人", openId);
    const r2 = await waitForReply(openId, 1, 60_000);
    console.log(`  [T2] Agent: ${r2.slice(0, 120)}...`);
    expect(r2).toMatch(/[\u4e00-\u9fff]/);
    // Agent should confirm game found, ask for exact date/time/store

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 3: 补全时间和店铺
    console.log("  [T3] 用户: 这周六下午两点，光谷店");
    await sendWechatMessage("这周六下午两点，光谷店", openId);
    const r3 = await waitForReply(openId, 2, 60_000);
    console.log(`  [T3] Agent: ${r3.slice(0, 120)}...`);
    expect(r3).toMatch(/[\u4e00-\u9fff]/);
    // Agent should either ask to register or attempt to create
    // (user not registered → should prompt for phone)

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 4: 用户提供手机号
    console.log("  [T4] 用户: 好，我手机号 13912345678");
    await sendWechatMessage("好，我手机号 13912345678，帮我注册", openId);
    const r4 = await waitForReply(openId, 3, 60_000);
    console.log(`  [T4] Agent: ${r4.slice(0, 120)}...`);
    expect(r4).toMatch(/[\u4e00-\u9fff]/);
    // Agent should send SMS code (or try to) and ask for verification code

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 5: 提供验证码（模拟）
    console.log("  [T5] 用户: 验证码 8832");
    await sendWechatMessage("验证码 8832", openId);
    const r5 = await waitForReply(openId, 4, 60_000);
    console.log(`  [T5] Agent: ${r5.slice(0, 120)}...`);
    expect(r5).toMatch(/[\u4e00-\u9fff]/);

    // All 5 turns should have coherent context
    const allReplies = [r1, r2, r3, r4, r5];
    for (const r of allReplies) {
      expect(r).not.toContain("AI 服务未配置");
      expect(r.length).toBeGreaterThan(15);
    }
    // At least one reply should mention 阿瓦隆 (context retention)
    const mentionsGame = allReplies.some((r) => /阿瓦隆|抵抗组织/.test(r));
    expect(mentionsGame).toBe(true);
  });

  /**
   * 场景: 老用户想根据复杂条件推荐桌游并直接约局。
   * 条件逐步收紧: 机制→人数→时长→难度→确认一款→直接开约
   * 覆盖: boardgame.mechanism + boardgame.recommend + active.create 串联
   */
  test("条件渐进推荐+直接约局: 引擎构筑→4人→1h→低难度→选定→约局", async () => {
    const openId = `oComplex_recommend_${Date.now()}`;

    // Turn 1: 初始宽泛需求
    console.log("  [T1] 用户: 推荐个引擎构筑的桌游");
    await sendWechatMessage("推荐个引擎构筑的桌游，我们4个人", openId);
    const r1 = await waitForReply(openId, 0, 60_000);
    console.log(`  [T1] Agent: ${r1.slice(0, 150)}...`);
    expect(r1).toMatch(/[\u4e00-\u9fff]/);
    expect(r1.length).toBeGreaterThan(30);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 2: 加时长约束
    console.log("  [T2] 用户: 太重度了，有没有1小时左右能玩完的？");
    await sendWechatMessage("太重度了，有没有1小时左右能玩完的？新手也能上手那种", openId);
    const r2 = await waitForReply(openId, 1, 60_000);
    console.log(`  [T2] Agent: ${r2.slice(0, 150)}...`);
    expect(r2).toMatch(/[\u4e00-\u9fff]/);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 3: 选定一款，要求约局
    console.log("  [T3] 用户: 就璀璨宝石吧！帮我约个明天晚上7点的局");
    await sendWechatMessage("就璀璨宝石吧！帮我约个明天晚上7点的局，4个人，光谷店", openId);
    const r3 = await waitForReply(openId, 2, 60_000);
    console.log(`  [T3] Agent: ${r3.slice(0, 150)}...`);
    expect(r3).toMatch(/[\u4e00-\u9fff]/);
    // Should attempt to create or ask for confirmation
    const mentionsSplendor = /璀璨宝石|Splendor/.test(r3);
    expect(mentionsSplendor).toBe(true);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 4: 确认或补充
    console.log("  [T4] 用户: 确认，直接创建");
    await sendWechatMessage("确认，直接帮我创建吧", openId);
    const r4 = await waitForReply(openId, 3, 60_000);
    console.log(`  [T4] Agent: ${r4.slice(0, 150)}...`);
    expect(r4).toMatch(/[\u4e00-\u9fff]/);

    // Context should flow: first we searched mechanism, then narrowed, then created
    const allReplies = [r1, r2, r3, r4];
    for (const r of allReplies) {
      expect(r).not.toBe("抱歉，我暂时无法处理这个请求，请稍后再试。");
    }
  });

  /**
   * 场景: 用户跨越多个完全不同的功能域，验证 agent 不会混淆上下文。
   * 日麻段位查询 → 桌游推荐 → 修改名片 → 回头问之前的段位结果
   * 覆盖: mahjong + boardgame + account 三个skill域 + 长程记忆
   */
  test("跨域长程记忆: 日麻排行→桌游推荐→改名片→回忆日麻结果", async () => {
    const openId = `oComplex_crossdom_${Date.now()}`;

    // Turn 1: 问日麻排行
    console.log("  [T1] 用户: 最近日麻四人半庄排行榜前三名是谁？");
    await sendWechatMessage("最近日麻四人半庄排行榜前三名是谁？", openId);
    const r1 = await waitForReply(openId, 0, 60_000);
    console.log(`  [T1] Agent: ${r1.slice(0, 120)}...`);
    expect(r1).toMatch(/[\u4e00-\u9fff]/);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 2: 完全切换到桌游推荐
    console.log("  [T2] 用户: 另外想问下，你们有没有那种可以2人对战的抽象棋类？");
    await sendWechatMessage("另外想问下，你们有没有那种可以2人对战的抽象棋类游戏？", openId);
    const r2 = await waitForReply(openId, 1, 60_000);
    console.log(`  [T2] Agent: ${r2.slice(0, 120)}...`);
    expect(r2).toMatch(/[\u4e00-\u9fff]/);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 3: 再切到修改名片
    console.log("  [T3] 用户: 对了帮我改一下名片，微信号改成 boardgame_lover_2026");
    await sendWechatMessage("对了帮我改一下名片，微信号改成 boardgame_lover_2026", openId);
    const r3 = await waitForReply(openId, 2, 60_000);
    console.log(`  [T3] Agent: ${r3.slice(0, 120)}...`);
    expect(r3).toMatch(/[\u4e00-\u9fff]/);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 4: 回忆第一轮的日麻排行
    console.log("  [T4] 用户: 刚才那个日麻排行第一名的PP是多少来着？");
    await sendWechatMessage("刚才那个日麻排行第一名的PP是多少来着？", openId);
    const r4 = await waitForReply(openId, 3, 60_000);
    console.log(`  [T4] Agent: ${r4.slice(0, 120)}...`);
    expect(r4).toMatch(/[\u4e00-\u9fff]/);

    // All turns produce real answers
    for (const r of [r1, r2, r3, r4]) {
      expect(r).not.toBe("抱歉，我暂时无法处理这个请求，请稍后再试。");
      expect(r.length).toBeGreaterThan(15);
    }
  });

  /**
   * 场景: 用户要求 agent 查桌游规则的特定细节，多轮追问加深。
   * DND 5E 规则查询 → 追问细节 → 再追问组合情况 → 要求约跑团
   * 覆盖: trpg(search_rules AI Search) + active.create 串联
   */
  test("TRPG规则深度追问+约跑团: 职业查询→法术细节→组队建议→约DM", async () => {
    const openId = `oComplex_trpg_${Date.now()}`;

    // Turn 1: 规则问题
    console.log("  [T1] 用户: DND5E的游侠有什么特色能力？和战士比哪个适合新手？");
    await sendWechatMessage("DND5E的游侠有什么特色能力？和战士比哪个适合新手？", openId);
    const r1 = await waitForReply(openId, 0, 60_000);
    console.log(`  [T1] Agent: ${r1.slice(0, 150)}...`);
    expect(r1).toMatch(/[\u4e00-\u9fff]/);
    expect(r1.length).toBeGreaterThan(30);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 2: 追问法术细节
    console.log("  [T2] 用户: 游侠能学治疗术吗？最早几级能用？");
    await sendWechatMessage("游侠能学治疗术吗？最早几级能用？有没有什么实用的低级法术推荐", openId);
    const r2 = await waitForReply(openId, 1, 60_000);
    console.log(`  [T2] Agent: ${r2.slice(0, 150)}...`);
    expect(r2).toMatch(/[\u4e00-\u9fff]/);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 3: 组队问题
    console.log("  [T3] 用户: 如果我们4个人，1游侠1法师1牧师，第4人选什么好？");
    await sendWechatMessage("如果我们4个人组队，1游侠1法师1牧师，第4人选什么职业比较平衡？", openId);
    const r3 = await waitForReply(openId, 2, 60_000);
    console.log(`  [T3] Agent: ${r3.slice(0, 150)}...`);
    expect(r3).toMatch(/[\u4e00-\u9fff]/);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 4: 转向约跑团
    console.log("  [T4] 用户: 太好了，能帮我约个这周日下午的跑团吗？4个人在光谷店");
    await sendWechatMessage("太好了！能帮我约个这周日下午的DND跑团吗？4个人，光谷店", openId);
    const r4 = await waitForReply(openId, 3, 60_000);
    console.log(`  [T4] Agent: ${r4.slice(0, 150)}...`);
    expect(r4).toMatch(/[\u4e00-\u9fff]/);
    // Should mention DM/预约 or attempt to create activity
    const mentionsDMorBooking = /DM|说书|预约|约局|跑团/.test(r4);
    expect(mentionsDMorBooking).toBe(true);

    // All 4 turns should be substantive
    for (const r of [r1, r2, r3, r4]) {
      expect(r.length).toBeGreaterThan(20);
    }
  });

  /**
   * 场景: 用户要修改多个个人设置，每一步都需要确认或提供额外信息。
   * 改语言→改店铺→改昵称→改名片→最后确认所有修改
   * 覆盖: settings + account 多步串联，验证 agent 不会遗漏步骤
   */
  test("连续个人设置修改: 语言→店铺→昵称→名片→确认汇总", async () => {
    const openId = `oComplex_settings_${Date.now()}`;

    // Turn 1: 改语言
    console.log("  [T1] 用户: 我想把语言切换到英文");
    await sendWechatMessage("我想把语言切换到英文", openId);
    const r1 = await waitForReply(openId, 0, 60_000);
    console.log(`  [T1] Agent: ${r1.slice(0, 120)}...`);
    expect(r1).toMatch(/[\u4e00-\u9fff]|[a-zA-Z]/); // might reply in English
    expect(r1.length).toBeGreaterThan(10);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 2: 接着改店铺
    console.log("  [T2] 用户: 然后把常去的店铺改成街道口店");
    await sendWechatMessage("然后把我常去的店铺改成街道口店", openId);
    const r2 = await waitForReply(openId, 1, 60_000);
    console.log(`  [T2] Agent: ${r2.slice(0, 120)}...`);
    expect(r2.length).toBeGreaterThan(10);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 3: 改昵称
    console.log("  [T3] 用户: 顺便帮我把昵称改成「骰子大魔王」");
    await sendWechatMessage("顺便帮我把昵称改成「骰子大魔王」", openId);
    const r3 = await waitForReply(openId, 2, 60_000);
    console.log(`  [T3] Agent: ${r3.slice(0, 120)}...`);
    expect(r3.length).toBeGreaterThan(10);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 4: 改名片
    console.log("  [T4] 用户: 名片上微信号改成 dice_king_2026, QQ 是 88888888");
    await sendWechatMessage("名片上微信号改成 dice_king_2026，QQ 是 88888888，手机号不公开", openId);
    const r4 = await waitForReply(openId, 3, 60_000);
    console.log(`  [T4] Agent: ${r4.slice(0, 120)}...`);
    expect(r4.length).toBeGreaterThan(10);

    await new Promise((r) => setTimeout(r, 2000));

    // Turn 5: 要求汇总确认
    console.log("  [T5] 用户: 帮我确认下刚才改了哪些东西");
    await sendWechatMessage("帮我确认下刚才改了哪些东西，列个清单", openId);
    const r5 = await waitForReply(openId, 4, 60_000);
    console.log(`  [T5] Agent: ${r5.slice(0, 200)}...`);
    expect(r5).toMatch(/[\u4e00-\u9fff]|[a-zA-Z]/);
    expect(r5.length).toBeGreaterThan(30);

    // The summary should reference at least 2 of the changes made
    const mentionsChanges = [
      /英文|English|en/i.test(r5),
      /街道口/.test(r5),
      /骰子大魔王/.test(r5),
      /dice_king|名片|微信/.test(r5),
    ].filter(Boolean).length;
    expect(mentionsChanges).toBeGreaterThanOrEqual(2);
  });
});

test.describe("桌游机制查询", () => {
  test.describe.configure({ timeout: 120_000 });

  test("引擎构筑/滚雪球类 4~5人桌游推荐", async () => {
    const openId = `oMech_engine_${Date.now()}`;

    console.log("  [Turn 1] 用户: 有没有引擎构筑或者滚雪球类的桌游，4到5个人能玩的？");
    await sendWechatMessage(
      "有没有引擎构筑或者滚雪球类的桌游，4到5个人能玩的？",
      openId,
    );
    const reply1 = await waitForReply(openId, 0, 60_000);
    console.log(`  [Turn 1] Agent: ${reply1.slice(0, 200)}...`);

    // Must be substantive Chinese text (not just a 5-char error)
    expect(reply1).toMatch(/[\u4e00-\u9fff]/);
    expect(reply1.length).toBeGreaterThan(30);

    // Should NOT be a generic unconfigured error
    expect(reply1).not.toContain("AI 服务未配置");

    // Agent should engage with the query — mention games, recommendations,
    // or acknowledge DB limitations. The key signal: NOT the bare fallback.
    expect(reply1).not.toBe("抱歉，我暂时无法处理这个请求，请稍后再试。");

    // Should reference something game-related
    const engagesWithQuery = /桌游|游戏|推荐|引擎|构筑|策略|人|玩/.test(reply1);
    expect(engagesWithQuery).toBe(true);

    // Follow-up: narrow down
    await new Promise((r) => setTimeout(r, 2000));
    console.log("  [Turn 2] 用户: 难度不要太高，最好1小时内能玩完的");
    await sendWechatMessage("难度不要太高，最好1小时内能玩完的", openId);
    const reply2 = await waitForReply(openId, 1, 60_000);
    console.log(`  [Turn 2] Agent: ${reply2.slice(0, 200)}...`);

    expect(reply2).toMatch(/[\u4e00-\u9fff]/);
    expect(reply2.length).toBeGreaterThan(20);
  });

  test("按人数精确筛选: 正好5人的合作桌游", async () => {
    const openId = `oMech_coop5_${Date.now()}`;

    console.log("  [Turn 1] 用户: 5个人玩的合作类桌游有什么？");
    await sendWechatMessage("5个人玩的合作类桌游有什么？", openId);
    const reply1 = await waitForReply(openId, 0, 60_000);
    console.log(`  [Turn 1] Agent: ${reply1.slice(0, 200)}...`);

    expect(reply1).toMatch(/[\u4e00-\u9fff]/);
    expect(reply1.length).toBeGreaterThan(20);
    expect(reply1).not.toContain("AI 服务未配置");

    // Should attempt to query and give game-related info
    const mentionsGames = /桌游|游戏|合作|人/.test(reply1);
    expect(mentionsGames).toBe(true);
  });

  test("组合条件: 德式+竞争+3~4人+高评分", async () => {
    const openId = `oMech_euro_${Date.now()}`;

    console.log("  [Turn 1] 用户: 有没有评分高的德式竞争桌游，3到4个人玩的？");
    await sendWechatMessage(
      "有没有评分高的德式竞争桌游，3到4个人玩的？",
      openId,
    );
    const reply1 = await waitForReply(openId, 0, 60_000);
    console.log(`  [Turn 1] Agent: ${reply1.slice(0, 200)}...`);

    expect(reply1).toMatch(/[\u4e00-\u9fff]/);
    expect(reply1.length).toBeGreaterThan(20);
    expect(reply1).not.toContain("AI 服务未配置");
  });
});
