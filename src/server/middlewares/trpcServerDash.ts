import { appRouterDash } from "@/server/apis/trpc/router-dash";
import { trpcServer } from "@hono/trpc-server";

const trpcServerDash = trpcServer({ router: appRouterDash });

export default trpcServerDash;
