import { afterEach, beforeEach, expect, it } from "vitest";
import { canHost, operator, setAccess, setHost } from "@/server/services/trpg/access";
import { directory, listSessions } from "@/server/services/trpg/queries";
import { createDatabase } from "./database";

let fixture: ReturnType<typeof createDatabase>;
beforeEach(() => { fixture = createDatabase(); });
afterEach(() => fixture.sqlite.close());

it("shares the directory across stores while restricting it to reviewers", async () => {
  const { db } = fixture;
  const input = { storeId: "a", search: "", hostsOnly: false, offset: 0 };
  await expect(directory(db, await operator(db, "host"), input)).rejects.toThrow();
  expect((await directory(db, await operator(db, "staff"), { ...input, storeId: "b" })).items).toHaveLength(6);
  const staff = await directory(db, await operator(db, "staff"), input);
  expect(staff.items).toHaveLength(6);
  const admin = await directory(db, await operator(db, "admin"), input);
  expect(admin.items).toHaveLength(6);
  expect(admin.items.find((m) => m.id === "host")).toMatchObject({ host: true, staff: false, points: 0, balanceCents: 0 });
});

it("paginates the directory and preserves staff access when changing hosts", async () => {
  const { db, sqlite } = fixture;
  for (let i = 0; i < 35; i++) {
    sqlite.prepare("INSERT INTO user(id,name) VALUES (?,?)").run(`member${i}`, `Member ${i}`);
    sqlite.prepare("INSERT INTO user_info(id,uid,nickname) VALUES (?,?,?)").run(`member${i}`, `number${i}`, `Member ${i}`);
  }
  const admin = await operator(db, "admin");
  const input = { storeId: "a", search: "Member", hostsOnly: false, offset: 0 };
  const first = await directory(db, admin, input);
  const next = await directory(db, admin, { ...input, offset: 30 });
  expect(first.items).toHaveLength(30);
  expect(first.hasMore).toBe(true);
  expect(next.items).toHaveLength(5);
  expect(next.hasMore).toBe(false);
  await setAccess(db, admin, { id: "staff", storeId: "a", host: true, staff: true });
  const member = (await directory(db, admin, { ...input, search: "Staff", hostsOnly: true })).items[0];
  await setAccess(db, admin, { id: member.id, storeId: "a", host: false, staff: member.staff });
  expect((await operator(db, "staff")).access[0]).toMatchObject({ staff: true, host: false });
});

function session(id: string, store: string, start: string | null, status = "published") {
  fixture.sqlite.prepare(`INSERT INTO trpg_sessions(id,store_id,host_id,table_id,title,description,module_name,game_system,status,starts_at,deadline,duration_minutes,fee_cents,capacity,minimum,created_at,updated_at)
  VALUES (?,?, 'host', ?, ?, 'description','module','COC',?,?,?,120,100,6,2,0,0)`)
    .run(id, store, start ? `t${store}` : null, id, status, start ? Date.parse(start) : null, start ? Date.parse(start) - 3600000 : null);
}

it("shows week overlaps in Beijing time, includes end-of-day sessions and excludes next week", async () => {
  session("overnight", "a", "2030-06-02T23:30:00+08:00");
  session("within", "a", "2030-06-09T23:00:00+08:00");
  session("next", "a", "2030-06-10T00:00:00+08:00");
  session("undated", "a", null);
  const result = await listSessions(fixture.db, { offset: 0, dateFrom: "2030-06-03", dateTo: "2030-06-10" }, await operator(fixture.db, "admin"));
  expect(result.items.map((s) => s.id)).toEqual(["overnight", "within"]);
});

it("filters review queues and host sessions without broadening store permissions", async () => {
  session("pending-a", "a", null, "pending");
  session("pending-b", "b", null, "pending");
  session("published-a", "a", "2030-06-04T14:00:00+08:00");
  const staff = await operator(fixture.db, "staff");
  const pending = await listSessions(fixture.db, { offset: 0, status: "pending", unscheduled: true, hostId: "host" }, staff);
  expect(pending.items.map((s) => s.id)).toEqual(["pending-a"]);
  const other = await listSessions(fixture.db, { offset: 0, storeId: "b", hostId: "host" }, staff);
  expect(other.items).toEqual([]);
});

it("shares host identity across both stores and preserves local staff grants", async () => {
  const { db } = fixture;
  const admin = await operator(db, "admin");
  await setHost(db, admin, "staff", true);
  const host = await operator(db, "staff");
  expect(canHost(host, "a")).toBe(true);
  expect(canHost(host, "b")).toBe(true);
  expect(host.access.find(a => a.storeId === "a")?.staff).toBe(true);
  const list = await directory(db, admin, { search: "Staff", hostsOnly: true, offset: 0 });
  expect(list.items).toHaveLength(1);
  await setHost(db, admin, "staff", false);
  const after = await operator(db, "staff");
  expect(after.access.some(a => a.host)).toBe(false);
  expect(after.access.find(a => a.storeId === "a")?.staff).toBe(true);
  await expect(setHost(db, after, "p1", true)).rejects.toThrow();
});

it("returns shared balances and all time-card periods without duplicating members", async () => {
 const { db, sqlite } = fixture;
 const insert = sqlite.prepare("INSERT INTO user_membership_plans(id,user_id,plan_type,amount,start_date,end_date) VALUES (?,?,?,?,?,?)");
 insert.run("deposit", "p1", "stored_value", 10000, 0, null);
 insert.run("spend", "p1", "stored_value", -2500, 0, null);
 insert.run("past", "p1", "monthly", null, Date.parse("2020-01-01"), Date.parse("2020-02-01"));
 insert.run("future", "p1", "monthly", null, Date.parse("2030-01-01"), Date.parse("2030-04-01"));
 sqlite.prepare("UPDATE user_info SET points=123 WHERE id='p1'").run();
 const result = await directory(db, await operator(db, "admin"), {search:"",hostsOnly:false,offset:0});
 const member = result.items.find(m=>m.id === "p1")!;
 expect(member).toMatchObject({balanceCents:7500,points:123,storedValueMember:true});
 expect(member.timePlans.map(p=>p.id)).toEqual(["past","future"]);
 expect(member.timePlans[1].expiresAt).toBe("2030-04-01T00:00:00.000Z");
 expect(result.items.filter(m=>m.id === "p1")).toHaveLength(1);
 expect(result.items.find(m=>m.id === "p2")?.storedValueMember).toBe(false);
});

it("excludes hosts and staff across stores before member pagination, preserving host candidates", async () => {
 const { db, sqlite } = fixture;
 sqlite.prepare("INSERT INTO trpg_access(user_id,store_id,staff,host) VALUES ('p2','b',1,0)").run();
 const admin = await operator(db,"admin");
 const input = {search:"",hostsOnly:false,membersOnly:true,offset:0};
 const result = await directory(db,admin,input);
 expect(result.items.map(m=>m.id).sort()).toEqual(["outsider","p1"]);
 expect((await directory(db,admin,{...input,search:"Host"})).items).toEqual([]);
 expect((await directory(db,admin,{...input,membersOnly:false,search:"Staff"})).items.map(m=>m.id)).toEqual(["staff"]);
 expect((await directory(db,admin,{...input,membersOnly:false,hostsOnly:true})).items.map(m=>m.id)).toEqual(["host"]);
});
