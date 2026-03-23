import { createRouter as createTanstackRouter } from "@tanstack/react-router";
import GlobalError from "../client/components/GlobalError";
import GlobalNotFound from "../client/components/GlobalNotFound";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  const router = createTanstackRouter({
    routeTree,
    defaultErrorComponent: GlobalError,
    defaultNotFoundComponent: GlobalNotFound,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
