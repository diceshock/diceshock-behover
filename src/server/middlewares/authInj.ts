import { getAuthUser } from "@hono/auth-js";
import { FACTORY } from "../factory";

const authInj = FACTORY.createMiddleware(async (c, next) => {
    const UserInfo = await getAuthUser(c);

    if (!UserInfo) return await next();

    c.set("InjectCrossData", { UserInfo });

    return await next();
});

export default authInj;
