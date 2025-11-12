import { trpcServer } from "@hono/trpc-server";
import { appRouterPublic } from "../apis/trpc";

const trpcServerPublic = trpcServer({
  router: appRouterPublic,
  onError({ error, path, input, ctx, type }) {
    console.error(
      JSON.stringify(
        {
          level: "error",
          type,
          path,
          code: error.code,
          message: error.message,
          cause: error.cause,
          input,
        },
        null,
        2
      )
    );
  },
});

export default trpcServerPublic;
