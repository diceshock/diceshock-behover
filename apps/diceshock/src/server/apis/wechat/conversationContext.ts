import type { R2Bucket } from "@cloudflare/workers-types";
import db, { drizzle, wechatConversationsTable } from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import type { ChatMessage } from "./types";

const { and, eq, lt, gt, desc } = drizzle;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const DEFAULT_MAX_TOKENS = 2000;

export function estimateTokens(text: string): number {
  // Chinese chars ~1.5 tokens, ASCII ~0.25 tokens per char
  let tokens = 0;
  for (const char of text) {
    tokens += char.charCodeAt(0) > 127 ? 1.5 : 0.25;
  }
  return Math.ceil(tokens);
}

export async function saveMessage(
  c: Context<HonoCtxEnv>,
  openId: string,
  role: "user" | "assistant" | "tool",
  content: string,
  metadata?: string,
): Promise<void> {
  const d = db(c.env.DB);

  await d.insert(wechatConversationsTable).values({
    open_id: openId,
    role,
    content,
    metadata: metadata ?? null,
    created_at: Date.now(),
  });

  archiveOldMessages(c, openId).catch((e) =>
    console.error("[context] archive error:", e),
  );
}

export async function getRecentHistory(
  c: Context<HonoCtxEnv>,
  openId: string,
  maxTokens: number = DEFAULT_MAX_TOKENS,
): Promise<ChatMessage[]> {
  const d = db(c.env.DB);
  const cutoff = Date.now() - TWELVE_HOURS_MS;

  const rows = await d
    .select({
      role: wechatConversationsTable.role,
      content: wechatConversationsTable.content,
      metadata: wechatConversationsTable.metadata,
    })
    .from(wechatConversationsTable)
    .where(
      and(
        eq(wechatConversationsTable.open_id, openId),
        gt(wechatConversationsTable.created_at, cutoff),
      ),
    )
    .orderBy(desc(wechatConversationsTable.created_at))
    .limit(50);

  const result: ChatMessage[] = [];
  let totalTokens = 0;

  for (const row of rows) {
    const tokens = estimateTokens(row.content);
    if (totalTokens + tokens > maxTokens) break;
    totalTokens += tokens;
    result.push({
      role: row.role as ChatMessage["role"],
      content: row.content,
      metadata: row.metadata ?? undefined,
    });
  }

  return result.reverse();
}

async function archiveOldMessages(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<void> {
  const d = db(c.env.DB);
  const cutoff = Date.now() - TWELVE_HOURS_MS;

  const oldMessages = await d
    .select()
    .from(wechatConversationsTable)
    .where(
      and(
        eq(wechatConversationsTable.open_id, openId),
        lt(wechatConversationsTable.created_at, cutoff),
      ),
    );

  if (oldMessages.length === 0) return;

  await archiveToR2(
    c,
    openId,
    oldMessages.map((m) => ({
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      created_at: m.created_at,
    })),
  );

  for (const msg of oldMessages) {
    await d
      .delete(wechatConversationsTable)
      .where(eq(wechatConversationsTable.id, msg.id));
  }
}

export async function archiveToR2(
  c: Context<HonoCtxEnv>,
  openId: string,
  messages: Array<{
    role: string;
    content: string;
    metadata?: string | null;
    created_at: number;
  }>,
): Promise<void> {
  const r2 = (c.env as unknown as { R2?: R2Bucket }).R2;
  if (!r2 || messages.length === 0) return;

  const date = new Date().toISOString().split("T")[0];
  const key = `conversations/${openId}/${date}.json`;

  const existing = await r2.get(key);
  let archive: unknown[] = [];

  if (existing) {
    try {
      archive = JSON.parse(await existing.text()) as unknown[];
    } catch {
      /* start fresh if corrupted */
    }
  }

  archive.push(...messages);

  await r2.put(key, JSON.stringify(archive), {
    httpMetadata: { contentType: "application/json" },
  });

  console.log("[context] archived", {
    openId: openId.slice(-8),
    count: messages.length,
    key,
  });
}

export async function clearConversationHistory(
  c: Context<HonoCtxEnv>,
  openId: string,
): Promise<void> {
  const d = db(c.env.DB);
  await d
    .delete(wechatConversationsTable)
    .where(eq(wechatConversationsTable.open_id, openId));
}
