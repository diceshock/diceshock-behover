import MemoryClient, { type Message } from "mem0ai";

const MAX_MEMORIES_PER_USER = 20;
const MEM0_TIMEOUT_MS = 5000; // 5s — WeChat has strict timing

function getClient(env: any): MemoryClient | null {
  const apiKey = env.MEM0_API_KEY;
  if (!apiKey) return null;
  return new MemoryClient({ apiKey });
}

/**
 * Search user's memories and return top-3 relevant results as formatted string.
 * Returns empty string on any failure (graceful degradation).
 */
export async function searchMemory(
  env: any,
  openId: string,
  query: string,
): Promise<string> {
  const client = getClient(env);
  if (!client) return "";

  try {
    const result = await Promise.race([
      client.search(query, {
        filters: { user_id: openId },
        topK: 3,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("mem0 search timeout")),
          MEM0_TIMEOUT_MS,
        ),
      ),
    ]);

    const memories = result.results ?? [];
    if (memories.length === 0) return "";

    const lines = memories.map((m) => `- ${m.memory}`);
    return `用户记忆：\n${lines.join("\n")}`;
  } catch (e) {
    console.error("[mem0] searchMemory failed:", e);
    return "";
  }
}

/**
 * Add conversation messages to user's memory store.
 * Skips if count >= 20 or Mem0 unavailable — never throws.
 */
export async function addMemory(
  env: any,
  openId: string,
  messages: Array<{ role: string; content: string }>,
): Promise<void> {
  const client = getClient(env);
  if (!client) return;

  try {
    // Check count first — enforce hard cap
    const count = await getMemoryCount(env, openId);
    if (count >= MAX_MEMORIES_PER_USER) {
      console.log("[mem0] addMemory skipped: user at cap", {
        openId: openId.slice(-8),
        count,
      });
      return;
    }

    const validMessages: Message[] = messages
      .filter(
        (m): m is { role: string; content: string } =>
          (m.role === "user" || m.role === "assistant") && m.content.length > 0,
      )
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    if (validMessages.length === 0) return;

    await Promise.race([
      client.add(validMessages, { userId: openId }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("mem0 add timeout")),
          MEM0_TIMEOUT_MS,
        ),
      ),
    ]);

    console.log("[mem0] addMemory ok", {
      openId: openId.slice(-8),
      messages: validMessages.length,
    });
  } catch (e) {
    console.error("[mem0] addMemory failed:", e);
    // Never throw — caller continues regardless
  }
}

/**
 * Return current memory count for a user.
 * Returns MAX on error (safe default: prevents new writes when status is unknown).
 */
export async function getMemoryCount(
  env: any,
  openId: string,
): Promise<number> {
  const client = getClient(env);
  if (!client) return MAX_MEMORIES_PER_USER;

  try {
    const result = await Promise.race([
      client.getAll({
        filters: { user_id: openId },
        page: 1,
        pageSize: 1, // Only need count, not results
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("mem0 getAll timeout")),
          MEM0_TIMEOUT_MS,
        ),
      ),
    ]);

    return typeof result.count === "number" ? result.count : 0;
  } catch (e) {
    console.error("[mem0] getMemoryCount failed:", e);
    return MAX_MEMORIES_PER_USER; // Safe default: treat as full
  }
}
