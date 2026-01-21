import { trpcServer } from "@hono/trpc-server";
import { appRouterPublic } from "../apis/trpc";

const trpcServerPublic = trpcServer({
  router: appRouterPublic,
  createContext: (_opts, c) => ({
    env: c.env,
    aliyunClient: c.get("AliyunClient"),
  }),
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

export default trpcServerPublic;
