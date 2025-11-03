import { appRouterPublic } from "@/server/apis/trpc/router-public";
import { trpcServer } from "@hono/trpc-server";

const trpcServerPublic = trpcServer({ router: appRouterPublic });

export default trpcServerPublic;
