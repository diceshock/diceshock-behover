import { trpcServer } from "@hono/trpc-server";
import { getAuthUser } from "@hono/auth-js";
import { appRouterDash } from "@/server/apis/trpc";

const trpcServerDash = trpcServer({
  router: appRouterDash,
  createContext: async (_opts, c) => {
    const authUser = await getAuthUser(c);
    const id = authUser?.token?.sub || authUser?.user?.id;
    const { UserInfo } = c.get("InjectCrossData") ?? {};

    return {
      env: c.env,
      aliyunClient: c.get("AliyunClient"),
      userInfo: UserInfo,
      userId: id,
    };
  },
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
