import { afterEach, beforeEach, expect, it } from "vitest";
import {
  executeGraphQL,
  type GraphQLContext,
} from "@/server/apis/wechat/graphql";
import { operator } from "@/server/services/trpg/access";
import { createSession } from "@/server/services/trpg/sessions";
import { createDatabase } from "./database";

let fixture: ReturnType<typeof createDatabase>;
beforeEach(() => {
  fixture = createDatabase();
});
afterEach(() => fixture.sqlite.close());
function context(id: string | null): GraphQLContext {
  return {
    db: fixture.db,
    userId: id,
    openId: "",
    auth: { role: id ? "authenticated" : "public", userId: id },
    role: id ? "authenticated" : "public",
    preferredStoreId: null,
    env: { DB: fixture.d1 } as GraphQLContext["env"],
  };
}
it("does not expose domain tables through generated CRUD or leak pending sessions", async () => {
  const session = await createSession(
    fixture.db,
    await operator(fixture.db, "host"),
    {
      requestId: crypto.randomUUID(),
      storeId: "a",
      tableId: null,
      title: "Private draft",
      description: "Draft",
      moduleName: "",
      gameSystem: "COC",
      startsAt: null,
      deadline: null,
      timeHint: "",
      tags: [],
      capacity: 6,
      minimum: 4,
      durationMinutes: 300,
      feeCents: 0,
    },
  );
  const query = await executeGraphQL(
    "{ trpgSessions { items { id title } hasMore } }",
    {},
    context(null),
  );
  expect(query.errors).toBeUndefined();
  expect(query.data).toEqual({ trpgSessions: { items: [], hasMore: false } });
  const detail = await executeGraphQL(
    "query($id:ID!){trpgSession(id:$id){title}}",
    { id: session.id },
    context(null),
  );
  expect(detail.errors?.length).toBeGreaterThan(0);
  const raw = await executeGraphQL(
    "{ trpgAccess { userId } trpgRegistrations { userId } }",
    {},
    context("admin"),
  );
  expect(raw.errors?.length).toBeGreaterThan(0);
  const managed = await executeGraphQL(
    "{ trpgSessions(managed:true){items{id}} }",
    {},
    context(null),
  );
  expect(managed.errors?.length).toBeGreaterThan(0);
  const own = await executeGraphQL(
    "{ trpgSessions(managed:true){items{id}} }",
    {},
    context("host"),
  );
  expect(own.errors).toBeUndefined();
  expect(own.data).toEqual({ trpgSessions: { items: [{ id: session.id }] } });
});
it("denies role escalation through custom mutations", async () => {
  const result = await executeGraphQL(
    'mutation { setTrpgAccess(id:"outsider",storeId:"a",staff:false,host:true){success} }',
    {},
    context("outsider"),
  );
  expect(result.errors?.length).toBeGreaterThan(0);
  expect(
    fixture.sqlite
      .prepare("SELECT count(*) AS n FROM trpg_access WHERE user_id='outsider'")
      .get()?.n,
  ).toBe(0);
});
