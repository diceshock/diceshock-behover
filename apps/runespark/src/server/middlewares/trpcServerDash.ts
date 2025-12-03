import { trpcServer } from "@hono/trpc-server";
import { appRouterDash } from "@/server/apis/trpc";

const trpcServerDash = trpcServer({
  router: appRouterDash,
  onError({ error, path, input, ctx: _ctx, type }) {
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
        2,
      ),
    );
  },
});

export default trpcServerDash;
