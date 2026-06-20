import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { ApiRouterDash, ApiRouterPublic } from "../types";

function getAdminStoreCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("admin_store_filter");
    if (stored === "gg" || stored === "jdk") return stored;
  } catch {
    // localStorage unavailable
  }
  return null;
}

const trpcClientDash = createTRPCClient<ApiRouterDash>({
  links: [
    httpBatchLink({
      url: "/edge",
      headers() {
        const storeCode = getAdminStoreCode();
        if (storeCode) {
          return { "X-Store-Code": storeCode };
        }
        return {};
      },
    }),
  ],
});

const trpcClientPublic = createTRPCClient<ApiRouterPublic>({
  links: [httpBatchLink({ url: "/apis" })],
});

export { trpcClientDash };

export default trpcClientPublic;
