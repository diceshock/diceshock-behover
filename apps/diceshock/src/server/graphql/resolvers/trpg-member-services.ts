import { z } from "zod/v4";
import { operator, requireDirectoryReviewer } from "../../services/trpg/access";
import * as service from "../../services/trpg/member-services";
import type { GQLContext } from "../context";
import { requireAuth } from "../guards";
import type { ResolverMap } from "../schema";
import { zodToGraphQLError as parse } from "../validate";

const id = z.string().min(1).max(100);
const offset = z.number().int().min(0).max(100000).default(0);
const https = z
  .string()
  .max(1000)
  .refine((s) => !s || /^https:\/\/[^\s]+$/.test(s), "图片必须使用 HTTPS");
async function actor(ctx: GQLContext) {
  requireAuth(ctx);
  return operator(ctx.db, ctx.userId);
}
const ok = () => ({ success: true });
export const trpgMemberResolvers: ResolverMap = {
  Query: {
    trpgRewards: async (_, args, ctx) => {
      if (args.managed) requireDirectoryReviewer(await actor(ctx));
      return service.catalog(ctx.db, !!args.managed);
    },
    trpgVouchers: async (_, args, ctx) =>
      service.vouchers(
        ctx.db,
        (await actor(ctx)).id,
        parse(offset, args.offset),
      ),
    trpgMail: async (_, args, ctx) =>
      service.mailbox(
        ctx.db,
        await actor(ctx),
        !!args.managed,
        parse(offset, args.offset),
      ),
  },
  Mutation: {
    saveTrpgReward: async (_, args, ctx) => {
      await service.saveReward(
        ctx.db,
        await actor(ctx),
        parse(
          z.object({
            id,
            title: z.string().trim().min(1).max(80),
            description: z.string().trim().max(1000),
            cover: https,
            points: z.number().int().min(1).max(1000000),
            stock: z.number().int().min(0).max(100000),
            active: z.boolean(),
            revision: z.number().int().min(0),
          }),
          args.input,
        ),
      );
      return ok();
    },
    redeemTrpgReward: async (_, args, ctx) => {
      const input = parse(z.object({ id, requestId: id }), args);
      return service.redeem(
        ctx.db,
        await actor(ctx),
        input.id,
        input.requestId,
      );
    },
    consumeTrpgVoucher: async (_, args, ctx) => {
      const input = parse(z.object({ id, storeId: id }), args);
      await service.consume(ctx.db, await actor(ctx), input.id, input.storeId);
      return ok();
    },
    sendTrpgMail: async (_, args, ctx) => {
      const input = parse(
        z.object({
          kind: z.enum(["suggestion", "wish"]),
          message: z.string().trim().min(2).max(2000),
          requestId: id,
        }),
        args,
      );
      await service.sendMail(
        ctx.db,
        await actor(ctx),
        input.kind,
        input.message,
        input.requestId,
      );
      return ok();
    },
    replyTrpgMail: async (_, args, ctx) => {
      const input = parse(
        z.object({ id, reply: z.string().trim().min(1).max(2000) }),
        args,
      );
      await service.replyMail(ctx.db, await actor(ctx), input.id, input.reply);
      return ok();
    },
  },
};
