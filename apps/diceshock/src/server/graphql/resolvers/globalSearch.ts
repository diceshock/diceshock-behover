import dbFactory, {
  activesTable,
  eventsTable,
  mahjongMatchesTable,
  tableOccupancyTable,
  tablesTable,
  userInfoTable,
  users,
} from "@lib/db";
import { desc, eq, like, or, type SQL } from "drizzle-orm";
import type { GQLContext } from "../context";
import { requireStaff } from "../guards";
import { cfImageUrl } from "@/shared/utils/cfImage";

function db(ctx: GQLContext) {
  return dbFactory(ctx.env.DB);
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DashSearchResultItem {
  id: string;
  category: string;
  title: string;
  subtitle: string | null;
  detail: string | null;
  href: string;
  avatar: string | null;
  searchableFields: string | null;
}

export interface DashGlobalSearchResult {
  items: DashSearchResultItem[];
  category: string;
}

// ─── Per-category search logic ──────────────────────────────────────────────

async function searchUsers(
  ctx: GQLContext,
  query: string,
  limit: number,
): Promise<DashSearchResultItem[]> {
  const tdb = db(ctx);
  const term = `%${query}%`;

  // Search user_info (uid, nickname, phone) and users (name, email)
  const matchingInfos = await tdb
    .select({
      id: userInfoTable.id,
      uid: userInfoTable.uid,
      nickname: userInfoTable.nickname,
      phone: userInfoTable.phone,
      avatar_url: userInfoTable.avatar_url,
    })
    .from(userInfoTable)
    .where(
      or(
        like(userInfoTable.uid, term),
        like(userInfoTable.nickname, term),
        like(userInfoTable.phone, term),
      ),
    )
    .limit(limit);

  const matchingUsers = await tdb
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(or(like(users.name, term), like(users.email, term)))
    .limit(limit);

  // Merge, dedup by id
  const seen = new Set<string>();
  const results: DashSearchResultItem[] = [];

  for (const ui of matchingInfos) {
    if (seen.has(ui.id)) continue;
    seen.add(ui.id);
    results.push({
      id: ui.id,
      category: "users",
      title: ui.nickname || ui.uid,
      subtitle: ui.phone,
      detail: JSON.stringify({ uid: ui.uid, phone: ui.phone }),
      href: `/dash/users/${ui.id}`,
      avatar: ui.avatar_url ? cfImageUrl(ui.avatar_url) : null,
      searchableFields: [ui.nickname, ui.uid, ui.phone].filter(Boolean).join(" "),
    });
  }

  for (const u of matchingUsers) {
    if (seen.has(u.id)) continue;
    seen.add(u.id);
    results.push({
      id: u.id,
      category: "users",
      title: u.name || u.email || u.id,
      subtitle: u.email,
      detail: JSON.stringify({ name: u.name, email: u.email }),
      href: `/dash/users/${u.id}`,
      avatar: null,
      searchableFields: [u.name, u.email].filter(Boolean).join(" "),
    });
  }

  return results.slice(0, limit);
}

async function searchOrders(
  ctx: GQLContext,
  query: string,
  limit: number,
): Promise<DashSearchResultItem[]> {
  const tdb = db(ctx);
  const term = `%${query}%`;

  const rows = await tdb
    .select({
      id: tableOccupancyTable.id,
      table_id: tableOccupancyTable.table_id,
      user_id: tableOccupancyTable.user_id,
      status: tableOccupancyTable.status,
      start_at: tableOccupancyTable.start_at,
      tableName: tablesTable.name,
      tableCode: tablesTable.code,
      userName: users.name,
      userNickname: userInfoTable.nickname,
      userUid: userInfoTable.uid,
      userPhone: userInfoTable.phone,
    })
    .from(tableOccupancyTable)
    .leftJoin(tablesTable, eq(tableOccupancyTable.table_id, tablesTable.id))
    .leftJoin(users, eq(tableOccupancyTable.user_id, users.id))
    .leftJoin(userInfoTable, eq(tableOccupancyTable.user_id, userInfoTable.id))
    .where(
      or(
        eq(tableOccupancyTable.id, query),
        like(tablesTable.name, term),
        like(tablesTable.code, term),
        like(users.name, term),
        like(userInfoTable.nickname, term),
        like(userInfoTable.uid, term),
        like(userInfoTable.phone, term),
      ) as SQL,
    )
    .orderBy(desc(tableOccupancyTable.start_at))
    .limit(limit);

  return rows.map((r) => {
    const user = r.userNickname || r.userName || r.userUid || "未知";
    const table = r.tableName || "?";
    const startAt = r.start_at ? new Date(r.start_at as unknown as number).toLocaleDateString("zh-CN") : "";
    return {
      id: r.id,
      category: "orders",
      title: `${table} · ${user}`,
      subtitle: `${r.status} · ${startAt}`,
      detail: JSON.stringify({
        table: r.tableName,
        tableCode: r.tableCode,
        user,
        status: r.status,
      }),
      href: `/dash/orders/${r.id}/settle`,
      avatar: null,
      searchableFields: [r.tableName, r.tableCode, r.userNickname, r.userName, r.userUid, r.userPhone, r.id]
        .filter(Boolean)
        .join(" "),
    };
  });
}

async function searchTables(
  ctx: GQLContext,
  query: string,
  limit: number,
): Promise<DashSearchResultItem[]> {
  const tdb = db(ctx);
  const term = `%${query}%`;

  const rows = await tdb
    .select()
    .from(tablesTable)
    .where(or(like(tablesTable.name, term), like(tablesTable.code, term)))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    category: "tables",
    title: r.name,
    subtitle: `${r.type} · ${r.status} · ${r.code}`,
    detail: JSON.stringify({ name: r.name, code: r.code, type: r.type, status: r.status }),
    href: `/dash/tables/${r.id}`,
    avatar: null,
    searchableFields: [r.name, r.code, r.type].filter(Boolean).join(" "),
  }));
}

async function searchActives(
  ctx: GQLContext,
  query: string,
  limit: number,
): Promise<DashSearchResultItem[]> {
  const tdb = db(ctx);
  const term = `%${query}%`;

  const rows = await tdb
    .select({
      id: activesTable.id,
      title: activesTable.title,
      date: activesTable.date,
      time: activesTable.time,
      creatorNickname: userInfoTable.nickname,
      creatorUid: userInfoTable.uid,
    })
    .from(activesTable)
    .leftJoin(userInfoTable, eq(activesTable.creator_id, userInfoTable.id))
    .where(
      or(
        like(activesTable.title, term),
        like(userInfoTable.nickname, term),
        like(userInfoTable.uid, term),
      ),
    )
    .orderBy(desc(activesTable.create_at))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    category: "actives",
    title: r.title,
    subtitle: `${r.creatorNickname || "?"} · ${r.date}${r.time ? ` ${r.time}` : ""}`,
    detail: JSON.stringify({ title: r.title, creator: r.creatorNickname, date: r.date }),
    href: `/dash/actives/${r.id}`,
    avatar: null,
    searchableFields: [r.title, r.creatorNickname, r.creatorUid, r.date].filter(Boolean).join(" "),
  }));
}

async function searchEvents(
  ctx: GQLContext,
  query: string,
  limit: number,
): Promise<DashSearchResultItem[]> {
  const tdb = db(ctx);
  const term = `%${query}%`;

  const rows = await tdb
    .select()
    .from(eventsTable)
    .where(or(like(eventsTable.title, term), like(eventsTable.description, term)))
    .orderBy(desc(eventsTable.create_at))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    category: "events",
    title: r.title,
    subtitle: r.description?.slice(0, 50) || null,
    detail: JSON.stringify({ title: r.title, description: r.description?.slice(0, 100) }),
    href: `/dash/events/${r.id}`,
    avatar: r.cover_image_url ? cfImageUrl(r.cover_image_url) : null,
    searchableFields: [r.title, r.description?.slice(0, 100)].filter(Boolean).join(" "),
  }));
}

async function searchGsz(
  ctx: GQLContext,
  query: string,
  limit: number,
): Promise<DashSearchResultItem[]> {
  const tdb = db(ctx);
  const term = `%${query}%`;

  // Search by table name or player nicknames (stored in JSON)
  const rows = await tdb
    .select({
      id: mahjongMatchesTable.id,
      mode: mahjongMatchesTable.mode,
      format: mahjongMatchesTable.format,
      started_at: mahjongMatchesTable.started_at,
      players: mahjongMatchesTable.players,
      tableName: tablesTable.name,
      tableCode: tablesTable.code,
    })
    .from(mahjongMatchesTable)
    .leftJoin(tablesTable, eq(mahjongMatchesTable.table_id, tablesTable.id))
    .where(or(like(tablesTable.name, term), like(tablesTable.code, term)))
    .orderBy(desc(mahjongMatchesTable.started_at))
    .limit(limit);

  // Also search by player nickname in JSON (D1 supports json_extract but it's slow;
  // fallback: pull recent and filter client-side)
  const results: DashSearchResultItem[] = rows.map((r) => {
    const playerNames = (r.players as Array<{ nickname: string }> | null)
      ?.map((p) => p.nickname)
      .join(", ") || "";
    const dateStr = r.started_at
      ? new Date(r.started_at as unknown as number).toLocaleDateString("zh-CN")
      : "";
    return {
      id: r.id,
      category: "gsz",
      title: `${r.tableName || "?"} · ${r.mode === "3p" ? "三麻" : "四麻"} ${r.format === "tonpuu" ? "东风" : "半庄"}`,
      subtitle: `${playerNames} · ${dateStr}`,
      detail: JSON.stringify({ table: r.tableName, players: playerNames, mode: r.mode, format: r.format }),
      href: `/dash/gsz/${r.id}`,
      avatar: null,
      searchableFields: [r.tableName, r.tableCode, playerNames].filter(Boolean).join(" "),
    };
  });

  // If query might match a player name but no table match, do a broader scan
  if (results.length < limit) {
    const recentRows = await tdb
      .select({
        id: mahjongMatchesTable.id,
        mode: mahjongMatchesTable.mode,
        format: mahjongMatchesTable.format,
        started_at: mahjongMatchesTable.started_at,
        players: mahjongMatchesTable.players,
        tableName: tablesTable.name,
        tableCode: tablesTable.code,
      })
      .from(mahjongMatchesTable)
      .leftJoin(tablesTable, eq(mahjongMatchesTable.table_id, tablesTable.id))
      .orderBy(desc(mahjongMatchesTable.started_at))
      .limit(200);

    const lowerQuery = query.toLowerCase();
    const existingIds = new Set(results.map((r) => r.id));

    for (const r of recentRows) {
      if (existingIds.has(r.id)) continue;
      const players = r.players as Array<{ nickname: string }> | null;
      const playerNames = players?.map((p) => p.nickname).join(", ") || "";
      if (!playerNames.toLowerCase().includes(lowerQuery)) continue;

      const dateStr = r.started_at
        ? new Date(r.started_at as unknown as number).toLocaleDateString("zh-CN")
        : "";
      results.push({
        id: r.id,
        category: "gsz",
        title: `${r.tableName || "?"} · ${r.mode === "3p" ? "三麻" : "四麻"} ${r.format === "tonpuu" ? "东风" : "半庄"}`,
        subtitle: `${playerNames} · ${dateStr}`,
        detail: JSON.stringify({ table: r.tableName, players: playerNames, mode: r.mode, format: r.format }),
        href: `/dash/gsz/${r.id}`,
        avatar: null,
        searchableFields: [r.tableName, r.tableCode, playerNames].filter(Boolean).join(" "),
      });
      if (results.length >= limit) break;
    }
  }

  return results.slice(0, limit);
}

// ─── Category dispatch ──────────────────────────────────────────────────────

const CATEGORY_SEARCHERS: Record<
  string,
  (ctx: GQLContext, query: string, limit: number) => Promise<DashSearchResultItem[]>
> = {
  users: searchUsers,
  orders: searchOrders,
  tables: searchTables,
  actives: searchActives,
  events: searchEvents,
  gsz: searchGsz,
};

const ALL_CATEGORIES = Object.keys(CATEGORY_SEARCHERS);

// ─── Resolver ───────────────────────────────────────────────────────────────

export const globalSearchResolvers = {
  Query: {
    dashGlobalSearch: async (
      _: unknown,
      args: { query: string; categories?: string[] | null; limit?: number | null },
      ctx: GQLContext,
    ): Promise<DashGlobalSearchResult[]> => {
      requireStaff(ctx);

      const query = args.query.trim();
      if (!query) return [];

      const limit = Math.min(args.limit ?? 10, 30);
      const categories = args.categories?.length
        ? args.categories.filter((c) => c in CATEGORY_SEARCHERS)
        : ALL_CATEGORIES;

      // Run all category searches in parallel
      const results = await Promise.all(
        categories.map(async (category) => {
          const searcher = CATEGORY_SEARCHERS[category];
          if (!searcher) return { items: [], category };
          const items = await searcher(ctx, query, limit);
          return { items, category };
        }),
      );

      return results.filter((r) => r.items.length > 0);
    },
  },
};
