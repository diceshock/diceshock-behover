import { trpcServer } from "@hono/trpc-server";
import { getAuthUser } from "@hono/auth-js";
import db, { userInfoTable } from "@lib/db";
import { appRouterPublic } from "../apis/trpc";

const trpcServerPublic = trpcServer({
  router: appRouterPublic,
  createContext: async (_opts, c) => {
    const authUser = await getAuthUser(c);
    const id = authUser?.token?.sub || authUser?.user?.id;

    // 尝试从 InjectCrossData 获取用户信息
    let userInfo = c.get("InjectCrossData")?.UserInfo;

    // 如果没有从 InjectCrossData 获取到，且用户已登录，则直接从数据库查询
    if (!userInfo && id) {
      const userInfoRaw = await db(c.env.DB).query.userInfoTable.findFirst({
        where: (userInfo, { eq }) => eq(userInfo.id, id),
      });

      if (userInfoRaw) {
        userInfo = {
          uid: userInfoRaw.uid,
          nickname: userInfoRaw.nickname,
        };
      }
    }

    return {
      env: c.env,
      aliyunClient: c.get("AliyunClient"),
      userInfo,
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

export default trpcServerPublic;
