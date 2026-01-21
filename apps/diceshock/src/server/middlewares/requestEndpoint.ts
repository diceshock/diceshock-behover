import { FACTORY } from "../factory";

const requestEndpoint = FACTORY.createMiddleware(async (c, next) => {
  c.set("InjectCrossData", { RequestId: crypto.randomUUID() });

  return await next();
});

export default requestEndpoint;
