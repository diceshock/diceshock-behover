import { trpcServer } from "@hono/trpc-server";
import { appRouterDash } from "@/server/apis/trpc";

const trpcServerDash = trpcServer({ router: appRouterDash });

export default trpcServerDash;
