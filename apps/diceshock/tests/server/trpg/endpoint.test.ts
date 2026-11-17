import { Hono } from "hono";
import { afterEach, beforeEach, expect, it } from "vitest";
import { graphqlHandler } from "@/server/apis/graphqlEndpoint";
import type { HonoCtxEnv } from "@/shared/types";
import { createDatabase } from "./database";

let fixture: ReturnType<typeof createDatabase>;
beforeEach(() => {
  fixture = createDatabase();
});
afterEach(() => fixture.sqlite.close());
const app = new Hono<HonoCtxEnv>();
app.post("/graphql", graphqlHandler);
function request(
  headers: Record<string, string>,
  query = "{ trpgProfile { id } }",
) {
  return app.request(
    "https://app.test/graphql",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ query }),
    },
    { DB: fixture.d1, AUTH_URL: "https://app.test" } as unknown as Cloudflare.Env,
  );
}
it("returns standard GraphQL error objects for Apollo", async () => {
  const response = await request({});
  const body = (await response.json()) as { errors: { message: string }[] };
  expect(response.status).toBe(200);
  expect(body.errors[0].message).toContain("Authentication required");
});
it("rejects expired or invalid bearer credentials", async () => {
  const response = await request({ Authorization: "Bearer invalid" });
  expect(response.status).toBe(401);
  const body = (await response.json()) as {
    errors: { extensions: { code: string } }[];
  };
  expect(body.errors[0].extensions.code).toBe("UNAUTHORIZED");
});
it("rejects cross-origin requests before executing business mutations", async () => {
  const response = await request(
    { Origin: "https://untrusted.test" },
    'mutation { setTrpgAccess(id:"outsider",storeId:"a",staff:false,host:true){success} }',
  );
  expect(response.status).toBe(403);
  expect(
    fixture.sqlite
      .prepare("SELECT count(*) AS n FROM trpg_access WHERE user_id='outsider'")
      .get()?.n,
  ).toBe(0);
});
