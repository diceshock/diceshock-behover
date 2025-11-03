import active from "./active";
import { routerPublic } from "./trpc";

export const appRouterDash = routerPublic({
  active,
});
