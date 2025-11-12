import { BoardGame } from "@lib/utils";
import { publicProcedure } from "./baseTRPC";

const sync = publicProcedure.mutation(({ ctx }) =>
  BoardGame.syncDb(ctx.env.DB)
);

export default {
  sync,
};
