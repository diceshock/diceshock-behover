import { trpcServer } from "@hono/trpc-server";
import { appRouterPublic } from "../apis/trpc";

const trpcServerPublic = trpcServer({ router: appRouterPublic });

export default trpcServerPublic;
