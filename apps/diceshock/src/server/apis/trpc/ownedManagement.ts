import { BoardGame } from "@lib/utils";
import z from "zod";
import { publicProcedure } from "./baseTRPC";

const syncInpuZ = z.object({
  pageFrom: z.number(),
  pageTo: z.number(),
  date: z.number(),
});

const sync = publicProcedure
  .input(syncInpuZ)
  .mutation(({ ctx, input }) =>
    BoardGame.fetchToDb(ctx.env.DB, input.pageFrom, input.pageTo, input.date)
  );

const wakeInpuZ = z.object({
  date: z.number(),
});

const wake = publicProcedure
  .input(wakeInpuZ)
  .mutation(({ ctx, input }) =>
    BoardGame.setDateToCurry(ctx.env.DB, input.date)
  );

export default {
  sync,
  wake,
};
