import type {
  Response as CfResponse,
  ExportedHandlerFetchHandler,
} from "@cloudflare/workers-types";
import type { app as mainApp } from "@/main";

const fetchMapper: (
  app: typeof mainApp,
) => ExportedHandlerFetchHandler<Cloudflare.Env> =
  (app) => async (request, env, ctx) => {
    const url = new URL(request.url);
    const { hostname, pathname } = url;

    console.log(hostname, pathname);

    let prefix: string | null = null;

    if (hostname === "api.diceshock.com" || hostname === "api.runespark.org")
      prefix = "/apis";

    if (hostname === "edge.diceshock.com" || hostname === "edge.runespark.org")
      prefix = "/edge";

    if (hostname === "diceshock.com") prefix = "/diceshock";

    if (hostname === "runespark.org") prefix = "/runespark";

    if (pathname.startsWith("/apis") || pathname.startsWith("/edge"))
      prefix = "";

    if (import.meta.env.DEV) prefix = "/";

    if (prefix === null)
      return new Response(`Unknown host: ${hostname}`, {
        status: 404,
      }) as unknown as CfResponse;

    // 若未带前缀则补全，避免重复添加
    if (!url.pathname.startsWith(prefix)) {
      url.pathname = `${prefix}${url.pathname}`;
    }

    const forwardedRequest = new Request(
      url.toString(),
      request as unknown as RequestInit,
    );

    try {
      const response = await app.fetch(forwardedRequest, env, ctx);
      return response as unknown as CfResponse;
    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Internal Server Error", {
        status: 500,
      }) as unknown as CfResponse;
    }
  };

export default fetchMapper;
