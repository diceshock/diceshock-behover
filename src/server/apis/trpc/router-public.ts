import owned from "./owned";
import { routerPublic } from "./trpc";

export const appRouterPublic = routerPublic({
  owned,
});
