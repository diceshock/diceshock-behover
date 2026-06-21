import { z } from "zod";
import { publicProcedure } from "./baseTRPC";

const searchRules = publicProcedure
  .input(
    z.object({
      query: z.string().min(1).max(200),
      limit: z.number().min(1).max(10).default(5),
    }),
  )
  .query(async ({ input, ctx }) => {
    const aiSearch = (ctx.env as any).AI_SEARCH;
    if (!aiSearch) {
      return { results: [], message: "规则搜索服务未配置" };
    }

    const results = await aiSearch.search({
      query: input.query,
      max_num_results: input.limit,
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
    } else if (results?.data?.length) {
      for (const d of results.data) {
        chunks.push({
          text: (d.text || d.content || "").slice(0, 1000),
          source: d.filename || d.item?.key || "",
          score: d.score || 0,
        });
      }
    }

    return { results: chunks };
  });

export default { searchRules };
