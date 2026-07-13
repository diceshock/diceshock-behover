import dbFactory, {
  drizzle as drizzleOp,
  eventsTable,
  gstoneDb,
  gstoneGamesTable,
  pricingSnapshotsTable,
} from "@lib/db";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  like,
  lte,
  sql,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  notifyGszSync,
  notifyMahjongStart,
  notifyMembershipChange,
  notifyOrderSettled,
  notifyOrderStart,
  notifyPassExpiring,
  notifyPhoneBound,
  notifyTableTransfer,
  resolveUserOpenId,
} from "@/server/apis/wechat/templateMessage";
import { getWechatAccessToken } from "@/server/apis/wechat/wechatApi";
import { GSTONE_MAX_GAME_ID } from "@/server/cron/gstoneCrawl";
import type { GQLContext } from "../context";
import { forbidden, internalError, notFound, validationError } from "../errors";
import { requireAuth, requireStaff } from "../guards";
import { zodToGraphQLError } from "../validate";

// ─── Helpers ──────────────────────────────────────────────────────────────

function db(ctx: GQLContext) {
  return dbFactory(ctx.env.DB);
}

const ALLOWED_HOSTS = new Set([
  "diceshock.com",
  "www.diceshock.com",
  "runespark.fun",
  "www.runespark.fun",
  "origin.runespark.fun",
]);

function isAllowedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

function storeCondition(
  tableColumn: unknown,
  storeId: string | null | undefined,
) {
  if (storeId) return eq(tableColumn as Parameters<typeof eq>[0], storeId);
  return undefined;
}

function mapEventRow(row: typeof eventsTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    content: row.content,
    storeId: row.store_id,
    isPublished: row.is_published,
    createdAt: row.create_at?.toISOString() ?? null,
    updatedAt: row.update_at?.toISOString() ?? null,
  };
}

// ─── Media constants ──────────────────────────────────────────────────────

const UPLOAD_PREFIX = "up/";
const CDN_BASE = "https://assets.runespark.fun/";

// ─── Shortlink constants ──────────────────────────────────────────────────

const KV_PREFIX = "sk:";
const KV_INDEX_PREFIX = "shortlink-index:";

interface ShortlinkData {
  url: string;
  createdAt: number;
  expiresAt?: number;
  clicks?: number;
}

async function getShortlinkSnapshot(env: GQLContext["env"], slug: string) {
  const raw = await env.KV.get(`${KV_PREFIX}${slug}`);
  const indexRaw = await env.KV.get(`${KV_INDEX_PREFIX}${slug}`);
  let index: {
    slug: string;
    url: string;
    createdAt: number;
    expiresAt?: number;
  } | null = null;
  try {
    index = indexRaw ? JSON.parse(indexRaw) : null;
  } catch {
    /* ignore parse errors */
  }
  return {
    active: !!raw,
    slug,
    url: index?.url ?? "",
    createdAt: index?.createdAt ?? 0,
    expiresAt: index?.expiresAt,
  };
}

// ─── Pricing helpers ──────────────────────────────────────────────────────

type PricingPlan = {
  plan_type: "conditional" | "fallback";
  enabled?: boolean;
  price?: number;
  [key: string]: unknown;
};

type PricingConfigData = { daytime_start: string; daytime_end: string };
type SnapshotData = { config: PricingConfigData; plans: PricingPlan[] };

const EMPTY_DATA: SnapshotData = {
  config: { daytime_start: "10:00", daytime_end: "18:00" },
  plans: [],
};

function parseConfig(raw: string): PricingConfigData | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        daytime_start: String(
          parsed.daytimeStart ?? parsed.daytime_start ?? "10:00",
        ),
        daytime_end: String(parsed.daytimeEnd ?? parsed.daytime_end ?? "18:00"),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function parsePlans(raw: string): PricingPlan[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function mapPricingSnapshot<
  T extends {
    id: string;
    name: string;
    status: string;
    created_at?: Date | null;
    published_at?: Date | null;
    data?: unknown;
  },
>(row: T) {
  const data = row.data as SnapshotData | null;
  return {
    id: row.id,
    name: row.name,
    status: row.status.toUpperCase(),
    createdAt: row.created_at?.toISOString() ?? null,
    publishedAt: row.published_at?.toISOString() ?? null,
    summary: buildPricingSummary(data),
    data: data
      ? {
          config: {
            daytimeStart: data.config?.daytime_start ?? "10:00",
            daytimeEnd: data.config?.daytime_end ?? "18:00",
          },
          plans: JSON.stringify(data.plans ?? []),
        }
      : { config: { daytimeStart: "10:00", daytimeEnd: "18:00" }, plans: "[]" },
  };
}

function buildPricingSummary(d: SnapshotData | null): string {
  if (!d) return "Empty snapshot";
  const parts: string[] = [];
  if (d.config) {
    parts.push(`${d.config.daytime_start}-${d.config.daytime_end}`);
  }
  const fallback = d.plans.find((p) => p.plan_type === "fallback");
  if (fallback && fallback.price != null) {
    parts.push(`Fallback ${(fallback.price / 100).toFixed(0)}/hr`);
  }
  const conds = d.plans.filter((p) => p.plan_type === "conditional");
  if (conds.length > 0) {
    const enabled = conds.filter((p) => p.enabled).length;
    parts.push(
      `${conds.length} conditional` +
        (enabled < conds.length ? ` (${enabled} on)` : ""),
    );
  }
  return parts.join(" | ") || "Empty snapshot";
}

// ─── Wechat Template helpers ──────────────────────────────────────────────

const WECHAT_API_BASE = "https://diceshock.com/wx-proxy";
const TEMPLATE_KV_PREFIX = "wechat:template:";

const SLOT_KEYS = [
  "order_start",
  "table_transfer",
  "mahjong_start",
  "mahjong_gsz_sync",
  "phone_bound",
  "order_settled",
  "membership_change",
  "pass_expiring",
] as const;

type SlotKey = (typeof SLOT_KEYS)[number];

const SLOT_LABELS: Record<SlotKey, string> = {
  order_start: "Start clock",
  table_transfer: "Table transfer",
  mahjong_start: "Start mahjong",
  mahjong_gsz_sync: "Score sync",
  phone_bound: "Phone bound",
  order_settled: "Order settled",
  membership_change: "Membership change",
  pass_expiring: "Pass expiring",
};

const GQL_SLOT_MAP: Record<string, SlotKey> = {
  ORDER_START: "order_start",
  TABLE_TRANSFER: "table_transfer",
  MAHJONG_START: "mahjong_start",
  MAHJONG_GSZ_SYNC: "mahjong_gsz_sync",
  PHONE_BOUND: "phone_bound",
  ORDER_SETTLED: "order_settled",
  MEMBERSHIP_CHANGE: "membership_change",
  PASS_EXPIRING: "pass_expiring",
};

const KV_SLOT_MAP: Record<SlotKey, string> = {
  order_start: "ORDER_START",
  table_transfer: "TABLE_TRANSFER",
  mahjong_start: "MAHJONG_START",
  mahjong_gsz_sync: "MAHJONG_GSZ_SYNC",
  phone_bound: "PHONE_BOUND",
  order_settled: "ORDER_SETTLED",
  membership_change: "MEMBERSHIP_CHANGE",
  pass_expiring: "PASS_EXPIRING",
};

// ─── TypeDefs ─────────────────────────────────────────────────────────────

export const adminTypeDefs = `
  # No additional types — all types are defined in schema.graphql.
  # Resolver map attaches to Query and Mutation types.
`;

// ─── Resolvers ────────────────────────────────────────────────────────────

export const adminResolvers = {
  Query: {
    // ── Events (public) ──────────────────────────────────────────────────
    async events(
      _source: unknown,
      args: { storeId?: string },
      ctx: GQLContext,
    ) {
      const tdb = db(ctx);
      const rows = await tdb.query.eventsTable.findMany({
        where: (e, { and, eq }) => {
          const conditions = [eq(e.is_published, true)];
          if (args.storeId) conditions.push(eq(e.store_id, args.storeId));
          return and(...conditions) as ReturnType<typeof and>;
        },
        orderBy: (e, { desc }) => desc(e.create_at),
      });
      return rows.map(mapEventRow);
    },

    async event(_source: unknown, args: { id: string }, ctx: GQLContext) {
      const tdb = db(ctx);
      const row = await tdb.query.eventsTable.findFirst({
        where: (e, { and, eq }) =>
          and(eq(e.id, args.id), eq(e.is_published, true)),
      });
      if (!row) throw notFound("Event not found");
      return mapEventRow(row);
    },

    // ── Events (staff) ───────────────────────────────────────────────────
    async managedEvents(
      _source: unknown,
      args: {
        storeId?: string;
        filter?: {
          search?: string | null;
          status?: (string | null)[] | null;
          dateFrom?: string | null;
          dateTo?: string | null;
          store?: string | null;
          type?: string | null;
          sortBy?: string | null;
          sortOrder?: "ASC" | "DESC" | null;
          pagination?: { offset?: number | null; limit?: number | null } | null;
        };
      },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);

      // ── No filter: legacy behavior ──────────────────────────────────
      if (!args.filter) {
        const storeId = args.storeId ?? ctx.preferredStoreId;
        const rows = await tdb.query.eventsTable.findMany({
          where: (e, { eq }) => storeCondition(e.store_id, storeId),
          orderBy: (e, { desc }) => desc(e.create_at),
        });
        return rows.map(mapEventRow);
      }

      const { filter } = args;

      // ── DB-level filtering (SQL builder API) ─────────────────────────
      const conditions: ReturnType<typeof eq>[] = [];

      if (filter.search) {
        conditions.push(like(eventsTable.title, `%${filter.search}%`));
      }
      if (filter.dateFrom) {
        conditions.push(gte(eventsTable.create_at, new Date(filter.dateFrom)));
      }
      if (filter.dateTo) {
        conditions.push(lte(eventsTable.create_at, new Date(filter.dateTo)));
      }
      const storeId = filter.store || args.storeId || ctx.preferredStoreId;
      if (storeId) {
        conditions.push(eq(eventsTable.store_id, storeId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const pagination = filter.pagination ?? { offset: 0, limit: 20 };
      const limit = pagination.limit ?? 20;
      const offset = pagination.offset ?? 0;

      const orderFn = filter.sortOrder === "ASC" ? asc : desc;

      // Build query with explicit column selection
      let query = tdb.select().from(eventsTable).$dynamic();
      if (where) query = query.where(where);

      const base = filter.sortBy ?? "create_at";
      const q = (() => {
        switch (base) {
          case "title":
            return query.orderBy(orderFn(eventsTable.title));
          case "id":
            return query.orderBy(orderFn(eventsTable.id));
          case "store_id":
            return query.orderBy(orderFn(eventsTable.store_id));
          case "is_published":
            return query.orderBy(orderFn(eventsTable.is_published));
          case "update_at":
            return query.orderBy(orderFn(eventsTable.update_at));
          default:
            return query.orderBy(orderFn(eventsTable.create_at));
        }
      })();

      const rows = await q.limit(limit).offset(offset);

      return rows.map(mapEventRow);
    },

    async managedEvent(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const row = await tdb.query.eventsTable.findFirst({
        where: (e, { eq }) => eq(e.id, args.id),
      });
      if (!row) throw notFound("Event not found");
      return mapEventRow(row);
    },

    // ── Media (staff) ────────────────────────────────────────────────────
    async mediaObjects(
      _source: unknown,
      args: {
        input?: {
          search?: string;
          contentTypeFilter?: string;
          cursor?: string;
          limit?: number;
        };
      },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const input = args.input ?? {};
      const listed = await ctx.env.R2.list({
        prefix: UPLOAD_PREFIX,
        limit: input.limit ?? 200,
        cursor: input.cursor,
        include: ["httpMetadata", "customMetadata"],
      });

      let items = listed.objects.map((obj) => ({
        key: obj.key,
        name: obj.key.slice(UPLOAD_PREFIX.length),
        contentType:
          obj.httpMetadata?.contentType ?? "application/octet-stream",
        size: obj.size,
        uploaded: obj.uploaded.toISOString(),
        url: `${CDN_BASE}${obj.key}`,
      }));

      if (input.search) {
        const q = input.search.toLowerCase();
        items = items.filter((i) => i.name.toLowerCase().includes(q));
      }
      if (input.contentTypeFilter) {
        const f = input.contentTypeFilter;
        items = items.filter((i) => i.contentType.startsWith(f));
      }

      return {
        items,
        truncated: listed.truncated,
        cursor: listed.truncated ? listed.cursor : undefined,
      };
    },

    // ── Shortlinks (staff) ───────────────────────────────────────────────
    async shortlinks(
      _source: unknown,
      args: { cursor?: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const result = await ctx.env.KV.list({
        prefix: KV_INDEX_PREFIX,
        cursor: args.cursor,
        limit: 100,
      });

      const items = await Promise.all(
        result.keys.map(async (key) => {
          const indexRaw = await ctx.env.KV.get(key.name);
          if (!indexRaw) return null;
          const index = JSON.parse(indexRaw) as {
            slug: string;
            url: string;
            createdAt: number;
            expiresAt?: number;
          };
          const raw = await ctx.env.KV.get(`${KV_PREFIX}${index.slug}`);
          const active = !!raw;
          return {
            slug: index.slug,
            shortUrl: `https://diceshock.com/x/${index.slug}`,
            url: index.url,
            createdAt: new Date(index.createdAt).toISOString(),
            expiresAt: index.expiresAt
              ? new Date(index.expiresAt).toISOString()
              : null,
            active,
          };
        }),
      );

      return {
        items: items.filter(Boolean),
        cursor: result.list_complete ? undefined : result.cursor,
      };
    },

    // ── Settings (public) ────────────────────────────────────────────────
    async captchaSettings(
      _source: unknown,
      _args: Record<string, never>,
      ctx: GQLContext,
    ) {
      const KV_KEY = "settings:captcha_disabled_until";
      const disabledUntil = await ctx.env.KV.get(KV_KEY);
      const env = ctx.env as Record<string, unknown>;
      const prefix = (env.CAPTCHA_PREFIX as string) || null;
      const sceneId = (env.CAPTCHA_SCENE_ID as string) || null;
      if (!disabledUntil) {
        return { enabled: true, disabledUntil: null, prefix, sceneId };
      }
      return {
        enabled: false,
        disabledUntil: new Date(Number(disabledUntil)).toISOString(),
        prefix,
        sceneId,
      };
    },

    async wechatOpenConfig(
      _source: unknown,
      _args: Record<string, never>,
      ctx: GQLContext,
    ) {
      const appId = ctx.env.WECHAT_OPEN_APP_ID || null;
      return { appId };
    },

    // ── Crawler (staff) ──────────────────────────────────────────────────
    async crawlerStats(
      _source: unknown,
      _args: Record<string, never>,
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const gdb = gstoneDb(ctx.env.GSTONE_DB);

      const [totalRow, crawledRow, errorsRow, imagedRow, maxIdRow] =
        await Promise.all([
          gdb.select({ c: sql<number>`count(*)` }).from(gstoneGamesTable),
          gdb
            .select({ c: sql<number>`count(*)` })
            .from(gstoneGamesTable)
            .where(isNotNull(gstoneGamesTable.crawled_at)),
          gdb
            .select({ c: sql<number>`count(*)` })
            .from(gstoneGamesTable)
            .where(
              and(
                isNotNull(gstoneGamesTable.error),
                isNull(gstoneGamesTable.crawled_at),
              ),
            ),
          gdb
            .select({ c: sql<number>`count(*)` })
            .from(gstoneGamesTable)
            .where(isNotNull(gstoneGamesTable.r2_cover_url)),
          gdb
            .select({ m: sql<number>`max(${gstoneGamesTable.gstone_id})` })
            .from(gstoneGamesTable),
        ]);

      return {
        total: totalRow[0]?.c ?? 0,
        crawled: crawledRow[0]?.c ?? 0,
        errors: errorsRow[0]?.c ?? 0,
        imagesCached: imagedRow[0]?.c ?? 0,
        maxId: maxIdRow[0]?.m ?? 0,
        estimatedMax: GSTONE_MAX_GAME_ID,
      };
    },

    async crawlerErrors(
      _source: unknown,
      args: { limit?: number },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const gdb = gstoneDb(ctx.env.GSTONE_DB);
      const rows = await gdb
        .select({
          gstone_id: gstoneGamesTable.gstone_id,
          error: gstoneGamesTable.error,
          retry_count: gstoneGamesTable.retry_count,
          updated_at: gstoneGamesTable.updated_at,
        })
        .from(gstoneGamesTable)
        .where(
          and(
            isNotNull(gstoneGamesTable.error),
            isNull(gstoneGamesTable.crawled_at),
          ),
        )
        .orderBy(desc(gstoneGamesTable.updated_at))
        .limit(args.limit ?? 20);

      return rows.map((r) => ({
        gstoneId: r.gstone_id,
        error: r.error,
        retryCount: r.retry_count,
        updatedAt: r.updated_at,
      }));
    },

    // ── Wechat Templates (staff) ─────────────────────────────────────────
    async wechatTemplates(
      _source: unknown,
      _args: Record<string, never>,
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const token = await getWechatAccessToken(ctx.env);
      const url = `${WECHAT_API_BASE}/cgi-bin/template/get_all_private_template?access_token=${token}`;

      const res = await fetch(url, { method: "GET" });
      const data = (await res.json()) as {
        errcode?: number;
        errmsg?: string;
        template_list?: Array<{
          template_id: string;
          title: string;
          primary_industry: string;
          deputy_industry: string;
          content: string;
          example: string;
        }>;
      };

      if (data.errcode && data.errcode !== 0) {
        return {
          success: false,
          error: `${data.errcode}: ${data.errmsg}`,
          templates: [],
        };
      }

      return {
        success: true,
        templates: (data.template_list ?? []).map((t) => ({
          templateId: t.template_id,
          title: t.title,
          primaryIndustry: t.primary_industry,
          deputyIndustry: t.deputy_industry,
          content: t.content,
          example: t.example,
        })),
      };
    },

    async wechatTemplateSlots(
      _source: unknown,
      _args: Record<string, never>,
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const slots: Array<{
        key: string;
        label: string;
        templateId: string | null;
      }> = [];

      for (const slotKey of SLOT_KEYS) {
        const templateId = await ctx.env.KV.get(
          `${TEMPLATE_KV_PREFIX}${slotKey}`,
        );
        slots.push({
          key: KV_SLOT_MAP[slotKey],
          label: SLOT_LABELS[slotKey],
          templateId,
        });
      }

      return slots;
    },

    // ── Rules (public) ───────────────────────────────────────────────────
    async searchRules(
      _source: unknown,
      args: { query: string; limit?: number },
      ctx: GQLContext,
    ) {
      const aiSearch = ctx.env.AI_SEARCH;
      if (!aiSearch) {
        return {
          results: [],
          message: "Rule search service is not configured",
        };
      }

      const results = await aiSearch.search({
        query: args.query,
        ai_search_options: {
          retrieval: { max_num_results: args.limit ?? 5 },
        },
      });

      const chunks: Array<{ text: string; source: string; score: number }> = [];

      if (results?.chunks?.length) {
        for (const chunk of results.chunks) {
          chunks.push({
            text: (chunk.text || "").slice(0, 1000),
            source: chunk.item?.key || "",
            score: chunk.score || 0,
          });
        }
      }

      return { results: chunks };
    },

    // ── Pricing (public + staff) ─────────────────────────────────────────
    async pricingDraft(
      _source: unknown,
      args: { storeId?: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const storeId = args.storeId ?? ctx.preferredStoreId;
      const latest = await tdb.query.pricingSnapshotsTable.findFirst({
        where: (s, { eq }) => storeCondition(s.store_id, storeId),
        orderBy: (s, { desc }) => desc(s.created_at),
      });
      return {
        data: latest?.data
          ? {
              config: {
                daytimeStart:
                  (latest.data as SnapshotData).config?.daytime_start ??
                  "10:00",
                daytimeEnd:
                  (latest.data as SnapshotData).config?.daytime_end ?? "18:00",
              },
              plans: JSON.stringify((latest.data as SnapshotData).plans ?? []),
            }
          : {
              config: { daytimeStart: "10:00", daytimeEnd: "18:00" },
              plans: "[]",
            },
        snapshotId: latest?.id ?? null,
        snapshotName: latest?.name ?? null,
        status: latest?.status ? (latest.status as string).toUpperCase() : null,
      };
    },

    async pricingSnapshots(
      _source: unknown,
      args: { storeId?: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const storeId = args.storeId ?? ctx.preferredStoreId;
      const rows = await tdb.query.pricingSnapshotsTable.findMany({
        where: (s, { eq }) => storeCondition(s.store_id, storeId),
        orderBy: (s, { desc }) => desc(s.created_at),
      });
      return rows.map(mapPricingSnapshot);
    },

    async pricingSnapshot(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const row = await tdb.query.pricingSnapshotsTable.findFirst({
        where: (s, { eq }) => eq(s.id, args.id),
      });
      if (!row) throw notFound("Snapshot not found");
      return mapPricingSnapshot(row);
    },

    async publishedPricing(
      _source: unknown,
      args: { storeId?: string },
      ctx: GQLContext,
    ) {
      const tdb = db(ctx);
      const storeId = args.storeId ?? ctx.preferredStoreId;
      const published = await tdb.query.pricingSnapshotsTable.findFirst({
        where: (s, { and, eq }) =>
          and(
            eq(s.status, "published"),
            storeCondition(s.store_id, storeId) ?? isNull(s.store_id),
          ),
        orderBy: (s, { desc }) => desc(s.created_at),
      });
      if (!published) return null;
      return {
        id: published.id,
        data: {
          config: {
            daytimeStart:
              (published.data as SnapshotData).config?.daytime_start ?? "10:00",
            daytimeEnd:
              (published.data as SnapshotData).config?.daytime_end ?? "18:00",
          },
          plans: JSON.stringify((published.data as SnapshotData).plans ?? []),
        },
      };
    },
  },

  Mutation: {
    // ── Events (staff) ───────────────────────────────────────────────────
    async createEvent(
      _source: unknown,
      args: {
        input: {
          title: string;
          description?: string;
          coverImageUrl?: string;
          content?: string;
          storeId?: string;
        };
      },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const [event] = await tdb
        .insert(eventsTable)
        .values({
          title: args.input.title,
          description: args.input.description ?? null,
          cover_image_url: args.input.coverImageUrl ?? null,
          content: args.input.content ?? null,
          store_id: args.input.storeId ?? ctx.preferredStoreId ?? undefined,
          is_published: false,
        })
        .returning();
      return mapEventRow(event);
    },

    async updateEvent(
      _source: unknown,
      args: {
        input: {
          id: string;
          title: string;
          description?: string;
          coverImageUrl?: string;
          content?: string;
        };
      },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const [event] = await tdb
        .update(eventsTable)
        .set({
          title: args.input.title,
          description: args.input.description ?? null,
          cover_image_url: args.input.coverImageUrl ?? null,
          content: args.input.content ?? null,
          update_at: new Date(),
        })
        .where(drizzleOp.eq(eventsTable.id, args.input.id))
        .returning();
      if (!event) throw notFound("Event not found");
      return mapEventRow(event);
    },

    async removeEvent(_source: unknown, args: { id: string }, ctx: GQLContext) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const event = await tdb.query.eventsTable.findFirst({
        where: (e, { eq }) => eq(e.id, args.id),
      });
      if (!event) throw notFound("Event not found");
      await tdb
        .delete(eventsTable)
        .where(drizzleOp.eq(eventsTable.id, args.id));
      return mapEventRow(event);
    },

    async toggleEventPublish(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const event = await tdb.query.eventsTable.findFirst({
        where: (e, { eq }) => eq(e.id, args.id),
      });
      if (!event) throw notFound("Event not found");
      const [updated] = await tdb
        .update(eventsTable)
        .set({
          is_published: !event.is_published,
          update_at: new Date(),
        })
        .where(drizzleOp.eq(eventsTable.id, args.id))
        .returning();
      return mapEventRow(updated);
    },

    // ── Media (staff) ────────────────────────────────────────────────────
    async renameMediaObject(
      _source: unknown,
      args: { oldKey: string; newName: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const src = await ctx.env.R2.get(args.oldKey);
      if (!src) throw notFound("File not found");

      const newKey = `${UPLOAD_PREFIX}${args.newName}`;

      const existing = await ctx.env.R2.head(newKey);
      if (existing)
        throw validationError("newName", "Target filename already exists");

      await ctx.env.R2.put(newKey, src.body, {
        httpMetadata: src.httpMetadata,
        customMetadata: src.customMetadata,
      });
      await ctx.env.R2.delete(args.oldKey);

      return {
        key: newKey,
        name: args.newName,
        contentType:
          src.httpMetadata?.contentType ?? "application/octet-stream",
        size: src.size,
        uploaded: src.uploaded.toISOString(),
        url: `${CDN_BASE}${newKey}`,
      };
    },

    async removeMediaObject(
      _source: unknown,
      args: { key: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const head = await ctx.env.R2.head(args.key);
      await ctx.env.R2.delete(args.key);
      return {
        key: args.key,
        name: args.key.startsWith(UPLOAD_PREFIX)
          ? args.key.slice(UPLOAD_PREFIX.length)
          : args.key,
        contentType:
          head?.httpMetadata?.contentType ?? "application/octet-stream",
        size: head?.size ?? 0,
        uploaded: head?.uploaded?.toISOString() ?? new Date().toISOString(),
        url: `${CDN_BASE}${args.key}`,
      };
    },

    // ── Settings (staff) ─────────────────────────────────────────────────
    async setCaptchaEnabled(
      _source: unknown,
      args: { enabled: boolean },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const KV_KEY = "settings:captcha_disabled_until";
      const CAPTCHA_DISABLE_TTL = 60 * 60 * 2;
      if (args.enabled) {
        await ctx.env.KV.delete(KV_KEY);
        return { enabled: true, disabledUntil: null };
      }
      const disabledUntil = Date.now() + CAPTCHA_DISABLE_TTL * 1000;
      await ctx.env.KV.put(KV_KEY, String(disabledUntil), {
        expirationTtl: CAPTCHA_DISABLE_TTL,
      });
      return {
        enabled: false,
        disabledUntil: new Date(disabledUntil).toISOString(),
      };
    },

    // ── Shortlinks (staff) ───────────────────────────────────────────────
    async createShortlink(
      _source: unknown,
      args: {
        input: { url: string; slug?: string; expiresInSeconds?: number };
      },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      if (!isAllowedHost(args.input.url)) {
        throw validationError(
          "url",
          `Disallowed target domain. Allowed: ${[...ALLOWED_HOSTS].join(", ")}`,
        );
      }

      const slug = args.input.slug || nanoid(8);
      const existing = await ctx.env.KV.get(`${KV_PREFIX}${slug}`);
      if (existing)
        throw validationError("slug", `Shortlink "${slug}" is already taken`);

      const now = Date.now();
      const data: ShortlinkData = { url: args.input.url, createdAt: now };
      if (args.input.expiresInSeconds) {
        data.expiresAt = now + args.input.expiresInSeconds * 1000;
      }

      const kvOptions: KVNamespacePutOptions = {};
      if (args.input.expiresInSeconds) {
        kvOptions.expirationTtl = args.input.expiresInSeconds;
      }

      await ctx.env.KV.put(
        `${KV_PREFIX}${slug}`,
        JSON.stringify(data),
        kvOptions,
      );
      await ctx.env.KV.put(
        `${KV_INDEX_PREFIX}${slug}`,
        JSON.stringify({
          slug,
          url: args.input.url,
          createdAt: now,
          expiresAt: data.expiresAt,
        }),
      );

      return {
        slug,
        shortUrl: `https://diceshock.com/x/${slug}`,
        url: args.input.url,
        createdAt: new Date(now).toISOString(),
        expiresAt: data.expiresAt
          ? new Date(data.expiresAt).toISOString()
          : null,
        active: true,
      };
    },

    async closeShortlink(
      _source: unknown,
      args: { slug: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const snapshot = await getShortlinkSnapshot(ctx.env, args.slug);
      await ctx.env.KV.delete(`${KV_PREFIX}${args.slug}`);
      const indexRaw = await ctx.env.KV.get(`${KV_INDEX_PREFIX}${args.slug}`);
      if (indexRaw) {
        const index = JSON.parse(indexRaw);
        index.expiresAt = Date.now();
        await ctx.env.KV.put(
          `${KV_INDEX_PREFIX}${args.slug}`,
          JSON.stringify(index),
        );
      }
      return {
        slug: args.slug,
        shortUrl: `https://diceshock.com/x/${args.slug}`,
        url: snapshot.url,
        createdAt: new Date(snapshot.createdAt).toISOString(),
        expiresAt: new Date(Date.now()).toISOString(),
        active: false,
      };
    },

    async updateShortlinkExpiry(
      _source: unknown,
      args: { slug: string; expiresInSeconds?: number },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const raw = await ctx.env.KV.get(`${KV_PREFIX}${args.slug}`);
      if (!raw) throw notFound("Shortlink not found or expired");

      const data: ShortlinkData = JSON.parse(raw);
      const now = Date.now();

      if (args.expiresInSeconds) {
        data.expiresAt = now + args.expiresInSeconds * 1000;
      } else {
        delete data.expiresAt;
      }

      const kvOptions: KVNamespacePutOptions = {};
      if (args.expiresInSeconds) {
        kvOptions.expirationTtl = args.expiresInSeconds;
      }

      await ctx.env.KV.put(
        `${KV_PREFIX}${args.slug}`,
        JSON.stringify(data),
        kvOptions,
      );

      const indexRaw = await ctx.env.KV.get(`${KV_INDEX_PREFIX}${args.slug}`);
      if (indexRaw) {
        const index = JSON.parse(indexRaw);
        index.expiresAt = data.expiresAt;
        await ctx.env.KV.put(
          `${KV_INDEX_PREFIX}${args.slug}`,
          JSON.stringify(index),
        );
      }

      return {
        slug: args.slug,
        shortUrl: `https://diceshock.com/x/${args.slug}`,
        url: data.url,
        createdAt: new Date(data.createdAt).toISOString(),
        expiresAt: data.expiresAt
          ? new Date(data.expiresAt).toISOString()
          : null,
        active: true,
      };
    },

    // ── Crawler (staff) ──────────────────────────────────────────────────
    async resetCrawlerErrors(
      _source: unknown,
      _args: Record<string, never>,
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const gdb = gstoneDb(ctx.env.GSTONE_DB);
      await gdb
        .update(gstoneGamesTable)
        .set({
          error: null,
          retry_count: 0,
          updated_at: new Date().toISOString(),
        })
        .where(
          and(
            isNotNull(gstoneGamesTable.error),
            isNull(gstoneGamesTable.crawled_at),
          ),
        );

      // Return updated stats
      const [totalRow, crawledRow, errorsRow, imagedRow, maxIdRow] =
        await Promise.all([
          gdb.select({ c: sql<number>`count(*)` }).from(gstoneGamesTable),
          gdb
            .select({ c: sql<number>`count(*)` })
            .from(gstoneGamesTable)
            .where(isNotNull(gstoneGamesTable.crawled_at)),
          gdb
            .select({ c: sql<number>`count(*)` })
            .from(gstoneGamesTable)
            .where(
              and(
                isNotNull(gstoneGamesTable.error),
                isNull(gstoneGamesTable.crawled_at),
              ),
            ),
          gdb
            .select({ c: sql<number>`count(*)` })
            .from(gstoneGamesTable)
            .where(isNotNull(gstoneGamesTable.r2_cover_url)),
          gdb
            .select({ m: sql<number>`max(${gstoneGamesTable.gstone_id})` })
            .from(gstoneGamesTable),
        ]);

      return {
        total: totalRow[0]?.c ?? 0,
        crawled: crawledRow[0]?.c ?? 0,
        errors: errorsRow[0]?.c ?? 0,
        imagesCached: imagedRow[0]?.c ?? 0,
        maxId: maxIdRow[0]?.m ?? 0,
        estimatedMax: GSTONE_MAX_GAME_ID,
      };
    },

    // ── Wechat Templates (staff) ─────────────────────────────────────────
    async addWechatTemplateFromLibrary(
      _source: unknown,
      args: {
        input: {
          templateIdShort: string;
          keywordNameList?: string[];
          slot: string;
        };
      },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const slotKey = GQL_SLOT_MAP[args.input.slot];
      if (!slotKey) throw validationError("slot", "Invalid slot key");

      const token = await getWechatAccessToken(ctx.env);
      const url = `${WECHAT_API_BASE}/cgi-bin/template/api_add_template?access_token=${token}`;

      const body: Record<string, unknown> = {
        template_id_short: args.input.templateIdShort,
      };
      if (args.input.keywordNameList?.length) {
        body.keyword_name_list = args.input.keywordNameList;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        errcode?: number;
        errmsg?: string;
        template_id?: string;
      };

      if (data.errcode && data.errcode !== 0) {
        return {
          success: false,
          error: `${data.errcode}: ${data.errmsg}`,
          templateId: null,
          slot: args.input.slot,
          label: null,
        };
      }

      const templateId = data.template_id!;
      await ctx.env.KV.put(`${TEMPLATE_KV_PREFIX}${slotKey}`, templateId);

      return {
        success: true,
        templateId,
        slot: args.input.slot,
        label: SLOT_LABELS[slotKey],
      };
    },

    async assignWechatTemplateSlot(
      _source: unknown,
      args: { slot: string; templateId: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const slotKey = GQL_SLOT_MAP[args.slot];
      if (!slotKey) throw validationError("slot", "Invalid slot key");

      await ctx.env.KV.put(`${TEMPLATE_KV_PREFIX}${slotKey}`, args.templateId);

      return {
        key: args.slot,
        label: SLOT_LABELS[slotKey],
        templateId: args.templateId,
      };
    },

    async removeWechatTemplate(
      _source: unknown,
      args: { templateId: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const token = await getWechatAccessToken(ctx.env);
      const url = `${WECHAT_API_BASE}/cgi-bin/template/del_private_template?access_token=${token}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: args.templateId }),
      });
      const data = (await res.json()) as { errcode?: number; errmsg?: string };

      if (data.errcode && data.errcode !== 0) {
        return {
          success: false,
          error: `${data.errcode}: ${data.errmsg}`,
          templateId: null,
          slot: null,
          label: null,
        };
      }

      for (const key of SLOT_KEYS) {
        const stored = await ctx.env.KV.get(`${TEMPLATE_KV_PREFIX}${key}`);
        if (stored === args.templateId) {
          await ctx.env.KV.delete(`${TEMPLATE_KV_PREFIX}${key}`);
        }
      }

      return { success: true, templateId: null, slot: null, label: null };
    },

    async sendWechatTemplateTest(
      _source: unknown,
      args: { userId: string; slot: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const slotKey = GQL_SLOT_MAP[args.slot];
      if (!slotKey) throw validationError("slot", "Invalid slot key");

      const openId = await resolveUserOpenId(ctx.env, args.userId);
      if (!openId) {
        return {
          success: false,
          error: "User not bound to WeChat",
          templateId: null,
          slot: args.slot,
          label: null,
        };
      }

      const now = new Date().toISOString().slice(0, 16).replace("T", " ");
      let result: { success: boolean; errmsg?: string } | null = null;

      switch (slotKey) {
        case "order_start":
          result = await notifyOrderStart(ctx.env, openId, {
            tableName: "Table A1",
            startTime: now,
            seats: 4,
          });
          break;
        case "table_transfer":
          result = await notifyTableTransfer(ctx.env, openId, {
            fromTable: "Table A1",
            toTable: "Table B2",
            transferTime: now,
          });
          break;
        case "mahjong_start":
          result = await notifyMahjongStart(ctx.env, openId, {
            mode: "4p",
            format: "Hanchan",
            tableName: "MJ Table 1",
            startTime: now,
          });
          break;
        case "mahjong_gsz_sync":
          result = await notifyGszSync(ctx.env, openId, {
            success: true,
            matchInfo: "Test match #0",
          });
          break;
        case "phone_bound":
          result = await notifyPhoneBound(ctx.env, openId, {
            phone: "138****0000",
            bindTime: now,
          });
          break;
        case "order_settled":
          result = await notifyOrderSettled(ctx.env, openId, {
            tableName: "Table A1",
            duration: "2h30m",
            price: "¥45.00",
            settledTime: now,
            payMethod: "WeChat Pay",
          });
          break;
        case "membership_change":
          result = await notifyMembershipChange(ctx.env, openId, {
            action: "Activate",
            planName: "Table Pass",
            detail: "30 days",
          });
          break;
        case "pass_expiring":
          result = await notifyPassExpiring(ctx.env, openId, {
            planName: "Table Pass",
            endDate: "2025-01-01",
            status: "expiring_5d",
          });
          break;
      }

      if (!result)
        return {
          success: false,
          error: "Template not configured",
          templateId: null,
          slot: args.slot,
          label: null,
        };
      if (!result.success)
        return {
          success: false,
          error: result.errmsg || "Send failed",
          templateId: null,
          slot: args.slot,
          label: null,
        };
      return { success: true, templateId: null, slot: args.slot, label: null };
    },

    // ── Pricing (staff) ──────────────────────────────────────────────────
    async savePricingSnapshot(
      _source: unknown,
      args: {
        input: {
          name: string;
          data: { config: string; plans: string };
          storeId?: string;
        };
      },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const storeId = args.input.storeId ?? ctx.preferredStoreId;

      const configParsed = parseConfig(args.input.data.config);
      if (!configParsed)
        throw validationError("data.config", "Invalid config JSON");

      const plansParsed = parsePlans(args.input.data.plans);
      const data: SnapshotData = { config: configParsed, plans: plansParsed };

      // Deduplicate name
      const existing = await tdb.query.pricingSnapshotsTable.findFirst({
        where: (s, { eq }) =>
          storeCondition(s.store_id, storeId) ?? eq(s.name, ""),
        columns: { id: true },
      });
      const finalName = existing
        ? `${args.input.name}-${nanoid(4)}`
        : args.input.name;

      const [row] = await tdb
        .insert(pricingSnapshotsTable)
        // @ts-expect-error - PricingPlan has [key: string]: unknown index signature,
        // incompatible with Drizzle's strict inline $type for the data column
        .values({
          name: finalName,
          store_id: storeId ?? undefined,
          data: data,
          status: "draft",
          created_at: new Date(),
        })
        .returning();

      return mapPricingSnapshot(row);
    },

    async publishPricingSnapshot(
      _source: unknown,
      args: { storeId?: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const storeId = args.storeId ?? ctx.preferredStoreId;

      const latestDraft = await tdb.query.pricingSnapshotsTable.findFirst({
        where: (s, { and, eq }) =>
          and(
            eq(s.status, "draft"),
            storeCondition(s.store_id, storeId) ?? isNull(s.store_id),
          ),
        orderBy: (s, { desc }) => desc(s.created_at),
      });
      if (!latestDraft) throw notFound("No draft to publish. Save first.");

      const [updated] = await tdb
        .update(pricingSnapshotsTable)
        .set({ status: "published", published_at: new Date() })
        .where(drizzleOp.eq(pricingSnapshotsTable.id, latestDraft.id))
        .returning();

      return mapPricingSnapshot(updated);
    },

    async restorePricingSnapshot(
      _source: unknown,
      args: { id: string },
      ctx: GQLContext,
    ) {
      requireStaff(ctx);
      const tdb = db(ctx);
      const storeId = ctx.preferredStoreId;

      const snapshot = await tdb.query.pricingSnapshotsTable.findFirst({
        where: (s, { eq }) => eq(s.id, args.id),
      });
      if (!snapshot?.data) throw notFound("Snapshot not found");

      const existing = await tdb.query.pricingSnapshotsTable.findFirst({
        where: (s, { eq }) =>
          storeCondition(s.store_id, storeId) ?? eq(s.name, ""),
        columns: { id: true },
      });
      const finalName = existing
        ? `${snapshot.name}-${nanoid(4)}`
        : snapshot.name;

      const [row] = await tdb
        .insert(pricingSnapshotsTable)
        .values({
          name: finalName,
          store_id: storeId ?? undefined,
          data: snapshot.data,
          status: "draft",
          created_at: new Date(),
        })
        .returning();

      return mapPricingSnapshot(row);
    },
  },
};
