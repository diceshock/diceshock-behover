import db, { drizzle, eventsTable } from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { SITE_LINKS } from "../linkRegistry";
import type { ToolDefinition } from "../skills";
import type { PageLink } from "../types";

const { and, eq, desc } = drizzle;

const EVENT_LINKS: PageLink[] = [];

function result<T>(data: T, extraLinks?: PageLink[]): string {
  const links = extraLinks ? [...EVENT_LINKS, ...extraLinks] : EVENT_LINKS;
  if (!links.length) return JSON.stringify(data);
  return JSON.stringify({ ...(data as object), links });
}

function notFound(message: string): string {
  return JSON.stringify({ found: false, message });
}

async function queryEventsList(c: Context<HonoCtxEnv>): Promise<string> {
  const d = db(c.env.DB);
  const events = await d
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      description: eventsTable.description,
      cover_image_url: eventsTable.cover_image_url,
      create_at: eventsTable.create_at,
    })
    .from(eventsTable)
    .where(eq(eventsTable.is_published, true))
    .orderBy(desc(eventsTable.create_at))
    .limit(20);

  const items = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    cover_image_url: e.cover_image_url,
    create_at: e.create_at,
    link: SITE_LINKS.eventDetail(e.id),
  }));

  return result({ found: true, count: items.length, events: items });
}

async function queryEventDetail(
  c: Context<HonoCtxEnv>,
  args: { id: string },
): Promise<string> {
  const d = db(c.env.DB);

  const event = await d
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.id, args.id), eq(eventsTable.is_published, true)))
    .limit(1);

  if (event.length === 0) {
    return notFound("活动不存在或尚未发布");
  }

  const e = event[0];
  return result(
    {
      found: true,
      event: {
        id: e.id,
        title: e.title,
        description: e.description,
        cover_image_url: e.cover_image_url,
        content: e.content,
        create_at: e.create_at,
      },
    },
    [{ url: SITE_LINKS.eventDetail(e.id), title: "活动详情" }],
  );
}

export const EVENT_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "query_events_list",
      description: "查询已发布的最新活动列表",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_event_detail",
      description: "查询活动详细内容，包括标题、描述、封面图和正文",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "活动 ID" },
        },
        required: ["id"],
      },
    },
  },
];

export async function executeEventTool(
  c: Context<HonoCtxEnv>,
  toolName: string,
  args: Record<string, unknown>,
  _openId: string,
): Promise<string> {
  console.log("[tools:event] execute", { toolName });
  try {
    switch (toolName) {
      case "query_events_list":
        return await queryEventsList(c);
      case "query_event_detail":
        return await queryEventDetail(c, args as { id: string });
      default:
        console.error("[tools:event] unknown tool:", toolName);
        return JSON.stringify({ error: "未知工具" });
    }
  } catch (e) {
    console.error("[tools:event] execution error", {
      toolName,
      error: String(e),
    });
    return JSON.stringify({
      error: `工具执行失败: ${String(e)}`,
    });
  }
}
