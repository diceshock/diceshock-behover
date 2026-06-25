import { getAuthUser } from "@hono/auth-js";
import { type Context, Hono } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { type ChatToolContext, executeConfirmedMutation } from "./tools";

const confirmMutation = new Hono<HonoCtxEnv>();

function resolveString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function resolveToolContext(
  c: Context<HonoCtxEnv>,
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
): ChatToolContext | null {
  const role =
    authUser?.token?.role ??
    (authUser?.user as { role?: string } | undefined)?.role;
  const userId =
    resolveString(authUser?.token?.sub) ?? resolveString(authUser?.user?.id);

  if (!userId || (role !== "admin" && role !== "staff")) return null;

  return {
    env: c.env as ChatToolContext["env"],
    identity: {
      userId,
      role,
      preferredStoreId:
        resolveString(
          (authUser?.token as Record<string, unknown> | undefined)
            ?.preferredStoreId,
        ) ?? null,
    },
  };
}

confirmMutation.post("/", async (c) => {
  const authUser = await getAuthUser(c).catch(() => null);
  const toolContext = resolveToolContext(c, authUser);
  if (!toolContext) return c.json({ error: "Unauthorized" }, 401);

  let body: { mutationId?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const mutationId = resolveString(body.mutationId);
  if (!mutationId) {
    return c.json({ error: "Missing or invalid 'mutationId' field" }, 400);
  }

  const result = await executeConfirmedMutation({
    mutationId,
    context: toolContext,
  });
  return c.json(result.body, result.status as 200 | 400 | 403 | 404);
});

export default confirmMutation;
