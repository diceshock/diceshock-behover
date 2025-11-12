import { trpcServer } from "@hono/trpc-server";
import { appRouterDash } from "@/server/apis/trpc";

const trpcServerDash = trpcServer({
  router: appRouterDash,
  onError: console.error,
});

export default trpcServerDash;
