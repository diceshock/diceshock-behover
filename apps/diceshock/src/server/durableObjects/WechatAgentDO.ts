/**
 * WechatAgentDO — one instance per openId.
 *
 * Design:
 * - User sends message → DO runs agent loop with progress pushes
 * - Each round pushes status to user via customer service API
 * - If user sends a new message mid-processing → abort current loop, restart
 * - 3-min inactivity alarm: discard unsent output
 * - Only dispatched messages get persisted to D1 sessions
 */
import { DurableObject } from "cloudflare:workers";
import db, { wechatConversationsTable } from "@lib/db";
import {
  type AgentEnv,
  type AgentLoopParams,
  runAgentLoop,
  searchKnowledgeBase,
} from "../apis/wechat/agentLoop";
import { getRecentHistoryRaw } from "../apis/wechat/conversationContext";
import { createReference } from "../apis/referenceCreate";
import { addMemory, searchMemory } from "../apis/wechat/memory";
import { dispatchMessages, parseAgentOutput } from "../apis/wechat/messagePipeline";
import { sendCustomerTextMessage } from "../apis/wechat/wechatApi";

const ACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

interface TaskState {
  openId: string;
  userMessage: string;
  generation: number; // increments on each new message, used to detect stale completions
}

export class WechatAgentDO extends DurableObject<Cloudflare.Env> {
  private currentGeneration = 0;
  private abortController: AbortController | null = null;
  private lastActivityAt = 0;
  private processing = false;

  /**
   * Called by the Worker to submit a new message for processing.
   * RPC-style: pass openId + message content.
   */
  async submitMessage(openId: string, userMessage: string): Promise<void> {
    console.log(`[WechatAgentDO:${openId.slice(-6)}] submitMessage gen=${this.currentGeneration + 1}`);
    this.lastActivityAt = Date.now();
    this.currentGeneration++;
    const gen = this.currentGeneration;

    // Cancel any in-flight task
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Schedule inactivity alarm
    await this.ctx.storage.setAlarm(Date.now() + ACTIVITY_TIMEOUT_MS);

    // Start processing in background — catch to surface errors in logs
    this.ctx.waitUntil(
      this.processTask(openId, userMessage, gen).catch((e) => {
        console.error(`[WechatAgentDO:${openId.slice(-6)}] uncaught in processTask`, e);
      }),
    );
  }

  /**
   * Alarm fires when user has been inactive for 3 minutes.
   * Discard any unsent state.
   */
  async alarm(): Promise<void> {
    if (Date.now() - this.lastActivityAt >= ACTIVITY_TIMEOUT_MS) {
      console.log("[WechatAgentDO] inactivity timeout, cleaning up");
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      this.processing = false;
    }
  }

  private async processTask(
    openId: string,
    userMessage: string,
    generation: number,
  ): Promise<void> {
    console.log(`[WechatAgentDO:${openId.slice(-6)}] processTask gen=${generation}`);
    if (this.processing) {
      // Previous task should have been aborted above; guard against races
      console.log("[WechatAgentDO] overlapping task detected, waiting for abort...");
      // Small yield to let the abort propagate
      await scheduler.wait(50);
    }

    this.processing = true;
    const abort = new AbortController();
    this.abortController = abort;

    const env = this.env as unknown as AgentEnv;

    try {
      // Gather context
      const [history, memory, ragContext] = await Promise.all([
        getRecentHistoryRaw(env.DB, openId),
        searchMemory(env, openId, userMessage),
        searchKnowledgeBase(env, userMessage),
      ]);

      if (this.isStale(generation)) return;

      const params: AgentLoopParams = {
        userMessage,
        openId,
        conversationHistory: history,
        memory: memory || undefined,
        ragContext,
      };

      // Run agent loop with progress pushes
      const result = await runAgentLoop(
        env,
        params,
        abort.signal,
        (status) => {
          // Fire-and-forget progress push
          if (!this.isStale(generation)) {
            sendCustomerTextMessage(env, openId, status).catch(() => {});
          }
        },
      );

      if (this.isStale(generation)) return;

      // Parse and dispatch final reply
      const messages = parseAgentOutput(result.rawOutput);
      if (messages.length === 0) {
        messages.push({
          type: "text",
          content: "抱歉，我暂时无法生成回复。请稍后再试。",
        });
      }

      // Add reference link
      if (result.collectedReferences.length > 0) {
        const agentReplyText = messages
          .filter((m) => m.type === "text")
          .map((m) => m.content)
          .join("\n");
        try {
          const { url } = await createReference(env.KV, {
            userQuery: userMessage,
            agentReply: agentReplyText,
            references: result.collectedReferences,
          });
          messages.push({ type: "text", content: `📖 查看引用原文: ${url}` });
        } catch {}
      }

      if (this.isStale(generation)) return;

      // Dispatch to user (this is the "sent" boundary)
      await dispatchMessages(env, openId, messages);

      // Only persist after successful dispatch
      await this.persistConversation(env.DB, openId, userMessage, result.rawOutput);

      // Memory (fire-and-forget)
      addMemory(env, openId, [
        { role: "user", content: userMessage },
        { role: "assistant", content: result.rawOutput },
      ]).catch(() => {});

      console.log(`[WechatAgentDO:${openId.slice(-6)}] complete`);
    } catch (e) {
      if (abort.signal.aborted) {
        console.log(`[WechatAgentDO:${openId.slice(-6)}] aborted`);
        return;
      }
      console.error(`[WechatAgentDO:${openId.slice(-6)}] error`, e);
      try {
        await sendCustomerTextMessage(env, openId, "处理失败，请稍后重试。");
      } catch {}
    } finally {
      if (this.currentGeneration === generation) {
        this.processing = false;
        this.abortController = null;
      }
    }
  }

  private isStale(generation: number): boolean {
    return generation !== this.currentGeneration;
  }

  private async persistConversation(
    d1: D1Database,
    openId: string,
    userMessage: string,
    assistantOutput: string,
  ): Promise<void> {
    const d = db(d1);
    const now = Date.now();
    await d.insert(wechatConversationsTable).values([
      { open_id: openId, role: "user", content: userMessage, metadata: null, created_at: now },
      { open_id: openId, role: "assistant", content: assistantOutput, metadata: null, created_at: now + 1 },
    ]);
  }
}
