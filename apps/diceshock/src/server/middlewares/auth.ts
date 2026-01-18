import { FACTORY } from "../factory";

const auth = FACTORY.createMiddleware(async (c, next) => {

  return await next();
});

export default auth;
