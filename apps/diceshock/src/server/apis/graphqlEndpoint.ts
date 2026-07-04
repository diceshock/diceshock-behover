import { getAuthUser } from "@hono/auth-js";
import db from "@lib/db";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import { executeGraphQL, type GraphQLContext } from "./wechat/graphql/index";
import { hasRole, type Role } from "./wechat/graphql/permissions";

const GRAPHIQL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diceshock GraphQL Playground</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { height: 100%; }
    body { background: #0f172a; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script crossorigin src="https://unpkg.com/graphiql@3/graphiql.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/graphiql@3/graphiql.min.css">
  <script>
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      React.createElement(GraphiQL, {
        fetcher: GraphiQL.createFetcher({ url: '/graphql' }),
        defaultEditorToolsVisibility: true,
      })
    );
  </script>
</body>
</html>`;

function resolveRole(authUser: Awaited<ReturnType<typeof getAuthUser>>): Role {
  if (!authUser) return "public";
  const tokenRole = authUser.token?.role as string;
  if (tokenRole === "admin" || tokenRole === "staff") return tokenRole;
  if (authUser.token?.sub) return "authenticated";
  return "public";
}

function resolveUserId(
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
): string | null {
  return authUser?.token?.sub || authUser?.user?.id || null;
}

function resolvePreferredStoreId(
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
): string | null {
  const prefs = (authUser?.token as Record<string, unknown>)
    ?.preferredStoreId as string | undefined;
  return prefs ?? null;
}

export async function graphqlHandler(
  c: Context<HonoCtxEnv>,
): Promise<Response> {
  try {
    if (c.req.method === "GET") {
      const authUser = await getAuthUser(c).catch(() => null);
      const role = resolveRole(authUser);
      const devRole = import.meta.env.DEV
        ? (c.req.header("X-Test-Role") as Role | undefined)
        : undefined;
      if (!hasRole(devRole ?? role, "staff")) {
        return c.text("Unauthorized", 401);
      }
      return c.html(GRAPHIQL_HTML);
    }

    if (c.req.method === "POST") {
      const authUser = await getAuthUser(c).catch(() => null);
      let role = resolveRole(authUser);
      let userId = resolveUserId(authUser);
      let preferredStoreId = resolvePreferredStoreId(authUser);

      if (import.meta.env.DEV) {
        const testRole = c.req.header("X-Test-Role") as Role | undefined;
        const testUserId = c.req.header("X-Test-UserId");
        if (testRole === "staff" || testRole === "admin") {
          role = testRole;
          userId = userId ?? "e2e-test-staff-001";
          preferredStoreId = preferredStoreId ?? "store-e2e-gg";
        } else if (testRole === "customer" && testUserId) {
          role = "customer";
          userId = testUserId;
          preferredStoreId = preferredStoreId ?? "store-e2e-gg";
        }
      }
      let body: { query?: string; variables?: Record<string, unknown> };
      try {
        body = await c.req.json();
      } catch (err) {
        console.error("[graphql] invalid JSON body:", err);
        return c.json({ errors: ["Invalid JSON body"] }, 400);
      }

      if (!body.query || typeof body.query !== "string") {
        return c.json({ errors: ["Missing or invalid 'query' field"] }, 400);
      }

      const operationName = body.query.match(/(?:mutation|query)\s+(\w+)/)?.[1] ?? "anonymous";
      console.log("[graphql] POST", operationName, "role:", role, "userId:", userId, "hasAliyunClient:", !!c.get("AliyunClient"));

      const database = db(c.env.DB);

      const context: GraphQLContext = {
        db: database,
        userId,
        openId: "",
        auth: { role, userId },
        env: { ...c.env, aliyunClient: c.get("AliyunClient") } as GraphQLContext["env"],
        role,
        preferredStoreId,
      };

      const result = await executeGraphQL(body.query, body.variables, context);
      if (result.errors?.length) {
        console.error("[graphql] errors in", operationName, ":", JSON.stringify(result.errors));
      }
      return c.json(result);
    }

    return c.text("Method Not Allowed", 405);
  } catch (err) {
    console.error("[graphql] handler error:", err);
    return c.json({ errors: [{ message: "Internal server error" }] }, 500);
  }
}

export default graphqlHandler;
