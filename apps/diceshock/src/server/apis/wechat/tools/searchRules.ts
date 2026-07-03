import { resolveSourceUrl } from "@/server/utils/rulesSourceUrl";
import type { ToolContext } from "./query";

export const SEARCH_RULES_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "search_rules",
    description:
      "搜索TRPG/DND5E跑团规则。查询职业、法术、怪物、物品、战斗规则等。返回最相关的规则片段。",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "搜索内容，如：火球术、野蛮人狂暴、隐匿检定",
        },
        message: {
          type: "string",
          description: "给用户看的进度说明，如：正在查找火球术的规则...",
        },
      },
      required: ["query"],
    },
  },
};

export async function executeSearchRules(
  args: { query: string },
  context: ToolContext,
): Promise<string> {
  // @ts-expect-error // AI_SEARCH not in ToolContext.env type from query.ts
  const aiSearch = context.env.AI_SEARCH;
  if (!aiSearch) {
    return "规则搜索服务未配置";
  }

  try {
    const results = await aiSearch.search({
      query: args.query,
      max_num_results: 5,
    });

    const chunks: Array<{
      text: string;
      source: string;
      originalUrl: string | null;
      score: number;
    }> = [];

    if (results?.chunks?.length) {
      for (const chunk of results.chunks) {
        const source = chunk.item?.key || "";
        chunks.push({
          text: (chunk.text || "").slice(0, 800),
          source,
          originalUrl: resolveSourceUrl(source),
          score: chunk.score || 0,
        });
      }
    } else if (results?.data?.length) {
      for (const d of results.data) {
        const source = d.filename || d.item?.key || "";
        chunks.push({
          text: (d.text || d.content || "").slice(0, 800),
          source,
          originalUrl: resolveSourceUrl(source),
          score: d.score || 0,
        });
      }
    }

    if (chunks.length === 0) {
      return JSON.stringify({ results: [], message: "未找到相关规则" });
    }

    return JSON.stringify({ results: chunks });
  } catch (e) {
    console.error("[search_rules] error:", e);
    return `规则搜索失败: ${String(e).slice(0, 100)}`;
  }
}
