import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { operator, setAccess } from "@/server/services/trpg/access";
import { mergeTrpgAccount } from "@/server/services/trpg/mergeAccount";
import {
  listSessions,
  playerRecords,
  publicSession,
  roster,
} from "@/server/services/trpg/queries";
import {
  joinSession,
  reviewBooking,
  withdraw,
} from "@/server/services/trpg/registrations";
import {
  createSession,
  resubmitSession,
  scheduleSession,
  transition,
} from "@/server/services/trpg/sessions";
import { type SessionInput, sessionInput } from "@/shared/trpg/validation";
import { createDatabase } from "./database";

let fixture: ReturnType<typeof createDatabase>;
const input = (overrides: Partial<SessionInput> = {}): SessionInput => ({
  requestId: crypto.randomUUID(),
  storeId: "a",
  tableId: "ta",
  hostId: "host",
  title: "Test session",
  description: "Description",
  moduleName: "Module",
  gameSystem: "COC",
  startsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
  deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
  capacity: 1,
  minimum: 1,
  durationMinutes: 300,
  feeCents: 100,
  timeHint: "",
  tags: ["新手友好"],
  ...overrides,
});
beforeEach(() => {
  fixture = createDatabase();
});
afterEach(() => fixture.sqlite.close());
async function create(
  overrides: Partial<SessionInput> = {},
  actorId = "admin",
) {
  return createSession(
    fixture.db,
    await operator(fixture.db, actorId),
    input(overrides),
  );
}
describe("TRPG workflow", () => {
  it("enforces store permissions and does not expose pending sessions", async () => {
    const session = await create({}, "host");
    await expect(publicSession(fixture.db, session.id)).rejects.toThrow(
      "场次未发布",
    );
    expect((await listSessions(fixture.db, { offset: 0 })).items).toEqual([]);
    expect(
      (
        await listSessions(
          fixture.db,
          { offset: 0 },
          await operator(fixture.db, "outsider"),
        )
      ).items,
    ).toEqual([]);
    await expect(
      createSession(
        fixture.db,
        await operator(fixture.db, "staff"),
        input({ storeId: "b", tableId: "tb" }),
      ),
    ).rejects.toThrow();
    await expect(
      roster(fixture.db, session.id, await operator(fixture.db, "outsider")),
    ).rejects.toThrow();
  });
  it("reserves the final seat atomically and releases it on withdrawal", async () => {
    const session = await create();
    const results = await Promise.allSettled([
      joinSession(fixture.db, session.id, "p1"),
      joinSession(fixture.db, session.id, "p2"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const winner = fixture.sqlite
      .prepare("SELECT user_id FROM trpg_registrations WHERE status='pending'")
      .get()?.user_id as string;
    await joinSession(fixture.db, session.id, winner); // retry is idempotent
    expect(
      fixture.sqlite
        .prepare("SELECT count(*) AS n FROM trpg_registrations")
        .get()?.n,
    ).toBe(1);
    await withdraw(fixture.db, session.id, winner);
    await joinSession(fixture.db, session.id, winner === "p1" ? "p2" : "p1");
    expect((await publicSession(fixture.db, session.id)).remaining).toBe(0);
  });
  it("prevents cross-store host overlap and stale review", async () => {
    await create();
    await expect(create({ storeId: "b", tableId: "tb" })).rejects.toThrow(
      "冲突",
    );
    const pending = await create({ storeId: "b", tableId: "tb" }, "host");
    const admin = await operator(fixture.db, "admin");
    await expect(
      transition(fixture.db, admin, pending.id, 1, "approve", ""),
    ).rejects.toThrow("冲突");
    await transition(fixture.db, admin, pending.id, 1, "return", "请调整排期");
    await expect(
      transition(fixture.db, admin, pending.id, 1, "approve", ""),
    ).rejects.toThrow();
  });
  it("rejects conflicting retries but accepts the same create request", async () => {
    const request = input();
    const admin = await operator(fixture.db, "admin");
    await createSession(fixture.db, admin, request);
    await createSession(fixture.db, admin, request);
    await expect(
      createSession(fixture.db, admin, { ...request, title: "Changed" }),
    ).rejects.toThrow();
  });
  it("preserves interested players and enforces their priority window", async () => {
    const session = await create({
      tableId: null,
      startsAt: null,
      deadline: null,
    });
    await joinSession(fixture.db, session.id, "p1");
    const admin = await operator(fixture.db, "admin");
    const scheduled = input();
    await scheduleSession(
      fixture.db,
      admin,
      session.id,
      1,
      "ta",
      scheduled.startsAt!,
      scheduled.deadline!,
    );
    await expect(joinSession(fixture.db, session.id, "p2")).rejects.toThrow(
      "优先",
    );
    await joinSession(fixture.db, session.id, "p1");
    expect(
      fixture.sqlite.prepare("SELECT status FROM trpg_registrations").get()
        ?.status,
    ).toBe("pending");
  });
  it("requires deposit confirmation and hides player contact data from hosts", async () => {
    const session = await create();
    await joinSession(fixture.db, session.id, "p1");
    const staff = await operator(fixture.db, "staff");
    const rows = await roster(fixture.db, session.id, staff);
    expect(rows.items[0].phone).toBe("13800000000");
    expect(
      (await roster(fixture.db, session.id, await operator(fixture.db, "host")))
        .items[0].phone,
    ).toBeNull();
    await expect(
      reviewBooking(
        fixture.db,
        staff,
        session.id,
        rows.items[0].id,
        "approve",
        false,
        "",
      ),
    ).rejects.toThrow("定金");
    await reviewBooking(
      fixture.db,
      staff,
      session.id,
      rows.items[0].id,
      "approve",
      true,
      "",
    );
    expect(
      (await playerRecords(fixture.db, "p1", false, 0)).items[0].booking
        ?.status,
    ).toBe("confirmed");
  });
  it("validates schedule, capacity, active store and returned-session edits", async () => {
    expect(
      sessionInput.safeParse(input({ minimum: 2, capacity: 1 })).success,
    ).toBe(false);
    expect(sessionInput.safeParse(input({ startsAt: null })).success).toBe(
      false,
    );
    const pending = await create({}, "host");
    const admin = await operator(fixture.db, "admin");
    await transition(fixture.db, admin, pending.id, 1, "return", "修改说明");
    await resubmitSession(
      fixture.db,
      await operator(fixture.db, "host"),
      pending.id,
      2,
      input({ requestId: pending.id, title: "New title" }),
    );
    expect(
      (await listSessions(fixture.db, { offset: 0 }, admin)).items[0].status,
    ).toBe("pending");
    fixture.sqlite.exec("UPDATE stores SET is_active=0 WHERE id='a'");
    await expect(
      transition(fixture.db, admin, pending.id, 3, "approve", ""),
    ).rejects.toThrow();
  });
  it("does not allow regular users to grant permissions", async () => {
    await expect(
      setAccess(fixture.db, await operator(fixture.db, "host"), {
        id: "p1",
        storeId: "a",
        staff: false,
        host: true,
      }),
    ).rejects.toThrow();
  });
  it("merges duplicate accounts without losing a confirmed seat", async () => {
    const s = await create({ capacity: 2 });
    await joinSession(fixture.db, s.id, "p1");
    await joinSession(fixture.db, s.id, "p2");
    fixture.sqlite.exec(
      "UPDATE trpg_registrations SET status='confirmed' WHERE user_id='p1'",
    );
    await mergeTrpgAccount(fixture.db, "p1", "p2");
    const rows = fixture.sqlite
      .prepare("SELECT status,user_id FROM trpg_registrations ORDER BY status")
      .all();
    expect(rows.map((r) => r.status)).toEqual(["confirmed", "withdrawn"]);
    expect(rows.every((r) => r.user_id === "p2")).toBe(true);
  });
  it("paginates large interest lists without dropping registrations", async () => {
    const session = await create({
      tableId: null,
      startsAt: null,
      deadline: null,
    });
    for (let i = 0; i < 35; i++) {
      fixture.sqlite
        .prepare('INSERT INTO "user"(id,name) VALUES (?,?)')
        .run("guest" + i, "Guest " + i);
      fixture.sqlite
        .prepare(
          "INSERT INTO user_info(id,uid,nickname,phone) VALUES (?,?,?,?)",
        )
        .run("guest" + i, "g" + i, "Guest " + i, "13900000000");
      await joinSession(fixture.db, session.id, "guest" + i);
    }
    const host = await operator(fixture.db, "host");
    const first = await roster(fixture.db, session.id, host, 0);
    const second = await roster(fixture.db, session.id, host, 30);
    expect(first.items).toHaveLength(30);
    expect(first.hasMore).toBe(true);
    expect(second.items).toHaveLength(5);
    expect(second.hasMore).toBe(false);
    expect(
      new Set([...first.items, ...second.items].map((r) => r.id)).size,
    ).toBe(35);
  });
  it("rolls back all TRPG account changes when a merge step fails", async () => {
    const session = await create();
    await joinSession(fixture.db, session.id, "p1");
    fixture.sqlite.exec(
      "INSERT INTO trpg_access(user_id,store_id,host) VALUES ('p1','a',1); CREATE TRIGGER fail_merge BEFORE INSERT ON trpg_access WHEN NEW.user_id='p2' BEGIN SELECT RAISE(ABORT,'test failure'); END;",
    );
    await expect(mergeTrpgAccount(fixture.db, "p1", "p2")).rejects.toThrow();
    expect(
      fixture.sqlite.prepare("SELECT user_id FROM trpg_registrations").get()
        ?.user_id,
    ).toBe("p1");
  });
});
