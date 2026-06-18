import db, { boardGamesTable, drizzle } from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";

import { SITE_LINKS } from "../linkRegistry";
import type { ToolDefinition } from "../skills";

const { and, eq, gt, like } = drizzle;
const EPOCH = new Date(0);

// ============================================================================
// Tool Definitions
// ============================================================================

export const BOARDGAME_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "query_board_game_inventory",
      description:
        "搜索桌游库存，支持中文和英文名称模糊匹配。返回匹配的在架桌游列表，含库存状态和详情链接。",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "桌游名称（中文或英文），支持部分匹配",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_board_game_count",
      description: "查询桌游库存总数统计，包括当前在架数量和历史下架数量。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "query_board_game_detail",
      description:
        "根据桌游ID查询详细信息，包括名称、评分、推荐人数、分类、玩法模式等。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "桌游唯一ID" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_board_game_filter",
      description:
        "根据人数和/或标签筛选适合的桌游。标签可选 PARTY(聚会)、RPG(美式/角色扮演)、SCORE_RACE(德式/跑分/抽象)。",
      parameters: {
        type: "object",
        properties: {
          numOfPlayers: {
            type: "number",
            description: "玩家数量，筛选支持该人数的桌游",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description:
              "分类标签，可选: PARTY, RPG, SCORE_RACE。可多选（交集）。",
          },
        },
      },
    },
  },
];

// ============================================================================
// Tool Executor
// ============================================================================

export async function executeBoardgameTool(
  c: Context<HonoCtxEnv>,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    switch (toolName) {
      case "query_board_game_inventory":
        return await queryBoardGameInventory(c, args.name as string);
      case "query_board_game_count":
        return await queryBoardGameCount(c);
      case "query_board_game_detail":
        return await queryBoardGameDetail(c, args.id as string);
      case "query_board_game_filter":
        return await queryBoardGameFilter(
          c,
          args.numOfPlayers as number | undefined,
          args.tags as string[] | undefined,
        );
      default:
        return JSON.stringify({ error: "未知工具" });
    }
  } catch (e) {
    console.error("[boardgame:tools] execution error", {
      toolName,
      error: String(e),
    });
    return JSON.stringify({ error: `工具执行失败: ${String(e)}` });
  }
}

// ============================================================================
// Tool Implementations
// ============================================================================

/**
 * 按名称搜索桌游库存（中文优先，英文兜底），仅返回在架桌游。
 */
async function queryBoardGameInventory(
  c: Context<HonoCtxEnv>,
  name: string,
): Promise<string> {
  console.log("[boardgame:inventory] searching:", name);
  const d = db(c.env.DB);

  const columns = {
    id: boardGamesTable.id,
    sch_name: boardGamesTable.sch_name,
    eng_name: boardGamesTable.eng_name,
    player_num: boardGamesTable.player_num,
    removeDate: boardGamesTable.removeDate,
  };

  let results = await d
    .select(columns)
    .from(boardGamesTable)
    .where(
      and(
        like(boardGamesTable.sch_name, `%${name}%`),
        eq(boardGamesTable.removeDate, EPOCH),
      ),
    )
    .limit(10);

  console.log("[boardgame:inventory] cn results:", results.length);

  if (results.length === 0) {
    results = await d
      .select(columns)
      .from(boardGamesTable)
      .where(
        and(
          like(boardGamesTable.eng_name, `%${name}%`),
          eq(boardGamesTable.removeDate, EPOCH),
        ),
      )
      .limit(10);

    console.log("[boardgame:inventory] en results:", results.length);
  }

  if (results.length === 0) {
    return JSON.stringify({
      found: false,
      message: `未找到"${name}"相关桌游`,
    });
  }

  const games = results.map((g) => ({
    id: g.id,
    name: g.sch_name || g.eng_name || "未知",
    eng_name: g.eng_name,
    player_num: g.player_num,
    in_stock: true,
    detail_link: SITE_LINKS.inventoryDetail(g.id),
  }));

  return JSON.stringify({
    found: true,
    count: games.length,
    games,
    links: [{ url: SITE_LINKS.inventory(), title: "桌游库存" }],
  });
}

/**
 * 查询库存总数统计：当前在架数、历史下架数、最近下架时间。
 */
async function queryBoardGameCount(c: Context<HonoCtxEnv>): Promise<string> {
  const d = db(c.env.DB);

  const [{ current }] = await d
    .select({ current: drizzle.count(boardGamesTable.id) })
    .from(boardGamesTable)
    .where(eq(boardGamesTable.removeDate, EPOCH));

  const [{ removed }] = await d
    .select({ removed: drizzle.count(boardGamesTable.id) })
    .from(boardGamesTable)
    .where(gt(boardGamesTable.removeDate, EPOCH));

  const latest = await d
    .select({ removeDate: boardGamesTable.removeDate })
    .from(boardGamesTable)
    .where(gt(boardGamesTable.removeDate, EPOCH))
    .orderBy(drizzle.desc(boardGamesTable.removeDate))
    .limit(1);

  return JSON.stringify({
    current,
    removed,
    latestRemoveDate: latest[0]?.removeDate ?? null,
    links: [{ url: SITE_LINKS.inventory(), title: "桌游库存" }],
  });
}

/**
 * 根据 ID 查询桌游详细信息（评分、人数、分类、玩法等）。
 */
async function queryBoardGameDetail(
  c: Context<HonoCtxEnv>,
  id: string,
): Promise<string> {
  console.log("[boardgame:detail] looking up:", id);
  const d = db(c.env.DB);

  const result = await d
    .select()
    .from(boardGamesTable)
    .where(eq(boardGamesTable.id, id))
    .limit(1);

  if (result.length === 0) {
    return JSON.stringify({
      found: false,
      message: `未找到ID为"${id}"的桌游`,
    });
  }

  const game = result[0];
  const inStock = (game.removeDate?.getTime() ?? 0) === 0;

  return JSON.stringify({
    found: true,
    game: {
      id: game.id,
      name: game.sch_name,
      eng_name: game.eng_name,
      gstone_id: game.gstone_id,
      rating: game.gstone_rating,
      player_num: game.player_num,
      best_player_num: game.best_player_num,
      category: game.category,
      mode: game.mode,
      in_stock: inStock,
      detail_link: SITE_LINKS.inventoryDetail(game.id),
    },
    links: [
      { url: SITE_LINKS.inventory(), title: "桌游库存" },
      { url: SITE_LINKS.inventoryDetail(game.id), title: "查看详情" },
    ],
  });
}

/**
 * 按人数和/或标签筛选在架桌游。标签之间取交集（同时满足所有标签）。
 */
async function queryBoardGameFilter(
  c: Context<HonoCtxEnv>,
  numOfPlayers?: number,
  tags?: string[],
): Promise<string> {
  console.log("[boardgame:filter]", { numOfPlayers, tags });

  const conditions: ReturnType<typeof eq>[] = [
    eq(boardGamesTable.removeDate, EPOCH),
  ];

  if (numOfPlayers !== undefined) {
    conditions.push(like(boardGamesTable.player_num, `%${numOfPlayers}%`));
  }

  if (tags && tags.length > 0) {
    for (const tag of tags) {
      conditions.push(like(boardGamesTable.category, `%${tag}%`));
    }
  }

  const d = db(c.env.DB);
  const results = await d
    .select({
      id: boardGamesTable.id,
      sch_name: boardGamesTable.sch_name,
      eng_name: boardGamesTable.eng_name,
      player_num: boardGamesTable.player_num,
      category: boardGamesTable.category,
    })
    .from(boardGamesTable)
    .where(and(...conditions))
    .limit(20);

  if (results.length === 0) {
    const filterDesc = [
      numOfPlayers ? `${numOfPlayers}人` : "",
      tags?.length ? tags.join(" / ") : "",
    ]
      .filter(Boolean)
      .join(" + ");

    return JSON.stringify({
      found: false,
      message: filterDesc
        ? `未找到符合"${filterDesc}"条件的桌游`
        : "未找到符合条件的桌游",
    });
  }

  const games = results.map((g) => ({
    id: g.id,
    name: g.sch_name || g.eng_name || "未知",
    eng_name: g.eng_name,
    player_num: g.player_num,
    category: g.category,
    detail_link: SITE_LINKS.inventoryDetail(g.id),
  }));

  return JSON.stringify({
    found: true,
    count: games.length,
    games,
    links: [{ url: SITE_LINKS.inventory(), title: "桌游库存" }],
  });
}
