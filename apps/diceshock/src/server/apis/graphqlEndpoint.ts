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

function resolvePhone(
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
  c: Context<HonoCtxEnv>,
): string | null {
  // Prefer InjectCrossData (set by userInjMiddleware from DB) over JWT token
  // because phone may be bound after login and JWT won't update until next session
  const crossData = c.get("InjectCrossData");
  if (crossData?.UserInfo?.phone) return crossData.UserInfo.phone;
  return (
    ((authUser?.token as Record<string, unknown>)?.phone as
      | string
      | null
      | undefined) ?? null
  );
}

export async function graphqlHandler(
  c: Context<HonoCtxEnv>,
): Promise<Response> {
  try {
    if (c.req.method === "GET") {
      const authUser = await getAuthUser(c).catch(() => null);
      const role = resolveRole(authUser);
      if (!hasRole(role, "staff")) {
        return c.text("Unauthorized", 401);
      }
      return c.html(GRAPHIQL_HTML);
    }

    if (c.req.method === "POST") {
      const authUser = await getAuthUser(c).catch(() => null);
      const role = resolveRole(authUser);
      const userId = resolveUserId(authUser);

      let body: { query?: string; variables?: Record<string, unknown> };
      try {
        body = await c.req.json();
      } catch {
        return c.json({ errors: ["Invalid JSON body"] }, 400);
      }

      if (!body.query || typeof body.query !== "string") {
        return c.json({ errors: ["Missing or invalid 'query' field"] }, 400);
      }

      const database = db(c.env.DB);

      const context: GraphQLContext = {
        db: database,
        userId,
        openId: "",
        auth: { role, userId },
        env: c.env,
        role,
        preferredStoreId: resolvePreferredStoreId(authUser),
        phone: resolvePhone(authUser, c),
      };

      const result = await executeGraphQL(body.query, body.variables, context);
      return c.json(result);
    }

    return c.text("Method Not Allowed", 405);
  } catch (err) {
    console.error("[graphql] handler error:", err);
    return c.json({ errors: [{ message: "Internal server error" }] }, 500);
  }
}

export default graphqlHandler;
