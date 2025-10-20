import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { ApiRouter } from "../types";

const trpcClient = createTRPCClient<ApiRouter>({
    links: [httpBatchLink({ url: "/api" })],
});

export default trpcClient;
