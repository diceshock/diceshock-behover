import { getAuthUser } from "@hono/auth-js";
import db, { chatMessagesTable, chatSessionsTable } from "@lib/db";
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { type Context, Hono } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const chatSessions = new Hono<HonoCtxEnv>();

function resolveString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function resolveStaffUserId(c: Context<HonoCtxEnv>) {
  const authUser = await getAuthUser(c).catch(() => null);
  const role =
    authUser?.token?.role ??
    (authUser?.user as { role?: string } | undefined)?.role;
  const userId =
    resolveString(authUser?.token?.sub) ?? resolveString(authUser?.user?.id);

  if (!userId || (role !== "admin" && role !== "staff")) return null;
  return userId;
}

async function cleanupExpiredSessions(database: ReturnType<typeof db>) {
  const cutoff = Date.now() - RETENTION_MS;
  const expired = await database
    .select({ id: chatSessionsTable.id })
    .from(chatSessionsTable)
    .where(lt(chatSessionsTable.updated_at, cutoff));

  for (const session of expired) {
    await database
      .delete(chatMessagesTable)
      .where(eq(chatMessagesTable.session_id, session.id));
  }

  await database
    .delete(chatSessionsTable)
    .where(lt(chatSessionsTable.updated_at, cutoff));
}

async function ensureOwnedSession(
  database: ReturnType<typeof db>,
  userId: string,
  sessionId: string,
) {
  return database.query.chatSessionsTable.findFirst({
    where: and(
      eq(chatSessionsTable.id, sessionId),
      eq(chatSessionsTable.user_id, userId),
    ),
  });
}

chatSessions.get("/", async (c) => {
  const userId = await resolveStaffUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const database = db(c.env.DB);
  await cleanupExpiredSessions(database);

  const cutoff = Date.now() - RETENTION_MS;
  const sessions = await database
    .select({
      id: chatSessionsTable.id,
      title: chatSessionsTable.title,
      createdAt: chatSessionsTable.created_at,
      updatedAt: chatSessionsTable.updated_at,
    })
    .from(chatSessionsTable)
    .where(
      and(
        eq(chatSessionsTable.user_id, userId),
        gt(chatSessionsTable.updated_at, cutoff),
      ),
    )
    .orderBy(desc(chatSessionsTable.updated_at));

  return c.json({ sessions });
});

chatSessions.post("/", async (c) => {
  const userId = await resolveStaffUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const now = Date.now();
  const database = db(c.env.DB);
  const [session] = await database
    .insert(chatSessionsTable)
    .values({
      user_id: userId,
      title: "新对话",
      created_at: now,
      updated_at: now,
    })
    .returning({ id: chatSessionsTable.id, title: chatSessionsTable.title });

  return c.json(session, 201);
});

chatSessions.delete("/:id", async (c) => {
  const userId = await resolveStaffUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const sessionId = c.req.param("id");
  const database = db(c.env.DB);
  const session = await ensureOwnedSession(database, userId, sessionId);
  if (!session) return c.json({ error: "Not found" }, 404);

  await database
    .delete(chatMessagesTable)
    .where(eq(chatMessagesTable.session_id, sessionId));
  await database
    .delete(chatSessionsTable)
    .where(eq(chatSessionsTable.id, sessionId));

  return c.json({ ok: true });
});

chatSessions.patch("/:id", async (c) => {
  const userId = await resolveStaffUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const sessionId = c.req.param("id");
  const database = db(c.env.DB);
  const session = await ensureOwnedSession(database, userId, sessionId);
  if (!session) return c.json({ error: "Not found" }, 404);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const title = resolveString(body.title)?.slice(0, 50);
  if (!title) return c.json({ error: "Invalid title" }, 400);

  await database
    .update(chatSessionsTable)
    .set({ title, updated_at: Date.now() })
    .where(eq(chatSessionsTable.id, sessionId));

  return c.json({ id: sessionId, title });
});

chatSessions.get("/:id/messages", async (c) => {
  const userId = await resolveStaffUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const sessionId = c.req.param("id");
  const database = db(c.env.DB);
  const session = await ensureOwnedSession(database, userId, sessionId);
  if (!session) return c.json({ error: "Not found" }, 404);

  const messages = await database
    .select({
      id: chatMessagesTable.id,
      role: chatMessagesTable.role,
      content: chatMessagesTable.content,
      toolInvocations: chatMessagesTable.tool_invocations,
      createdAt: chatMessagesTable.created_at,
    })
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.session_id, sessionId))
    .orderBy(chatMessagesTable.created_at);

  return c.json({
    messages: messages.map((message) => ({
      ...message,
      toolInvocations: message.toolInvocations
        ? JSON.parse(message.toolInvocations)
        : undefined,
    })),
  });
});

chatSessions.post("/:id/messages", async (c) => {
  const userId = await resolveStaffUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const sessionId = c.req.param("id");
  const database = db(c.env.DB);
  const session = await ensureOwnedSession(database, userId, sessionId);
  if (!session) return c.json({ error: "Not found" }, 404);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const role = body.role;
  const content = body.content;
  if (
    (role !== "user" && role !== "assistant" && role !== "tool") ||
    typeof content !== "string"
  ) {
    return c.json({ error: "Invalid message" }, 400);
  }

  const now = Date.now();
  const title =
    session.title === "新对话" && role === "user"
      ? content.trim().slice(0, 20) || session.title
      : session.title;

  const [message] = await database
    .insert(chatMessagesTable)
    .values({
      session_id: sessionId,
      role,
      content,
      tool_invocations:
        body.toolInvocations === undefined
          ? null
          : JSON.stringify(body.toolInvocations),
      created_at: now,
    })
    .returning({ id: chatMessagesTable.id });

  await database
    .update(chatSessionsTable)
    .set({ title, updated_at: now })
    .where(eq(chatSessionsTable.id, sessionId));

  return c.json({ id: message.id, title }, 201);
});

export default chatSessions;
