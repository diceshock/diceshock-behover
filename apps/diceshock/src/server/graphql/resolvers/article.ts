import type { Context } from "hono";
import type { GQLContext } from "../context";
import { requireStaff } from "../guards";
import { publishActivityArticle } from "../../apis/wechat/articlePipeline";
import type { HonoCtxEnv } from "@/shared/types";

// ─── Resolver ─────────────────────────────────────────────────────────────────

export const articleResolvers = {
  Mutation: {
    publishArticleToWechat: async (
      _source: unknown,
      args: {
        input: { type: "ACTIVE" | "EVENT"; id: string; autoPublish?: boolean };
      },
      ctx: GQLContext,
    ) => {
      requireStaff(ctx);

      const { type, id, autoPublish } = args.input;

      // Build a minimal Hono context for the pipeline
      const honoCtx = buildHonoContext(ctx.env);

      const result = await publishActivityArticle(honoCtx, {
        type: type.toLowerCase() as "active" | "event",
        id,
        autoPublish: autoPublish ?? false,
      });

      return {
        success: result.success,
        draftMediaId: result.draftMediaId ?? null,
        publishId: result.publishId ?? null,
        imageUrls: result.imageUrls ?? null,
        error: result.error ?? null,
      };
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal Hono-like context object for the pipeline.
 * The pipeline only needs c.env, so we create a thin adapter.
 */
function buildHonoContext(env: HonoCtxEnv["Bindings"]) {
  // The pipeline functions expect Context<HonoCtxEnv> but only access c.env
  // We create a minimal duck-typed context.
  return { env } as unknown as Context<HonoCtxEnv>;
}
