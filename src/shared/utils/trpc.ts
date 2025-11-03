import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { ApiRouterPublic, ApiRouterDash } from "../types";

const trpcClientDash = createTRPCClient<ApiRouterDash>({
  links: [httpBatchLink({ url: "/apis/dash" })],
});

const trpcClientPublic = createTRPCClient<ApiRouterPublic>({
  links: [httpBatchLink({ url: "/apis" })],
});

export { trpcClientDash };

export default trpcClientPublic;
