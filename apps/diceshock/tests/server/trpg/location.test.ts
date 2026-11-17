import { afterEach, beforeEach, expect, it } from "vitest";
import { operator } from "@/server/services/trpg/access";
import { findSession, listSessions } from "@/server/services/trpg/queries";
import {
  createSession,
  scheduleSession,
  transition,
} from "@/server/services/trpg/sessions";
import { createDatabase } from "./database";

let fixture: ReturnType<typeof createDatabase>;
beforeEach(() => {
  fixture = createDatabase();
});
afterEach(() => fixture.sqlite.close());

function draft() {
  return {
    requestId: crypto.randomUUID(),
    storeId: null,
    tableId: null,
    title: "地点待定团",
    description: "人齐后协商地点",
    moduleName: "",
    gameSystem: "COC",
    startsAt: null,
    deadline: null,
    timeHint: "周末晚上",
    tags: [],
    capacity: 6,
    minimum: 4,
    durationMinutes: 180,
    sessionType: "test" as const,
    feeCents: 0,
  };
}

it("lets a host recruit without a store and any store manager review it", async () => {
  const { db } = fixture;
  const created = await createSession(db, await operator(db, "host"), draft());
  expect(created.storeId).toBeNull();
  expect(created.status).toBe("pending");
  expect(created.storeName).toBe("地点待定");

  await transition(
    db,
    await operator(db, "staff"),
    created.id,
    created.revision!,
    "approve",
    "",
  );
  const published = await findSession(db, created.id);
  expect(published.status).toBe("published");
  expect(published.storeId).toBeNull();
});

it("shows pending-location sessions in every store's public list", async () => {
  const { db } = fixture;
  const host = await operator(db, "host");
  const created = await createSession(db, host, draft());
  await transition(
    db,
    await operator(db, "admin"),
    created.id,
    created.revision!,
    "approve",
    "",
  );
  const publicA = await listSessions(db, { storeId: "a", offset: 0 });
  const publicB = await listSessions(db, { storeId: "b", offset: 0 });
  expect(publicA.items.map((s) => s.id)).toContain(created.id);
  expect(publicB.items.map((s) => s.id)).toContain(created.id);
  expect(publicA.items[0].storeName).toBe("地点待定");
});

it("lets the host pick a venue later, keeping the published status", async () => {
  const { db } = fixture;
  const host = await operator(db, "host");
  const created = await createSession(db, host, draft());
  await transition(
    db,
    await operator(db, "admin"),
    created.id,
    created.revision!,
    "approve",
    "",
  );
  const approved = await findSession(db, created.id);
  const start = Date.now() + 7 * 86_400_000;
  const startIso = new Date(start).toISOString();
  const cutoffIso = new Date(start - 3_600_000).toISOString();

  await scheduleSession(
    db,
    host,
    created.id,
    approved.revision,
    "tb",
    startIso,
    cutoffIso,
    "b",
  );
  const scheduled = await findSession(db, created.id);
  expect(scheduled.storeId).toBe("b");
  expect(scheduled.tableId).toBe("tb");
  expect(scheduled.status).toBe("published");
});
