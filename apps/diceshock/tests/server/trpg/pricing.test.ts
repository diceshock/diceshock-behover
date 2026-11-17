import { afterEach, beforeEach, expect, it } from "vitest";
import { sessionInput } from "@/shared/trpg/validation";
import { sessionPricing } from "@/shared/trpg/pricing";
import { operator } from "@/server/services/trpg/access";
import { createSession } from "@/server/services/trpg/sessions";
import { publicSession } from "@/server/services/trpg/queries";
import { createDatabase } from "./database";
let fixture: ReturnType<typeof createDatabase>;
beforeEach(() => { fixture = createDatabase(); });
afterEach(() => fixture.sqlite.close());
const input = (sessionType: string) => ({ requestId: crypto.randomUUID(), storeId: "a", tableId: null, hostId: "host", title: "Pricing", description: "Pricing rules", moduleName: "", gameSystem: "COC", startsAt: null, deadline: null, capacity: 6, minimum: 4, durationMinutes: 300, sessionType, feeCents: 1 });
it.each(["commercial", "club", "test"])("persists and returns %s pricing without accepting an arbitrary fee", async (type) => {
 const parsed = sessionInput.parse(input(type));
 expect(parsed.feeCents).toBe(type === "commercial" ? 11800 : 0);
 const session = await createSession(fixture.db, await operator(fixture.db, "admin"), parsed);
 expect((await publicSession(fixture.db, session.id)).sessionType).toBe(type);
 await expect(createSession(fixture.db, await operator(fixture.db, "admin"), sessionInput.parse({...input(type === "club" ? "test" : "club"), requestId: parsed.requestId}))).rejects.toThrow();
});
it("rejects unknown types and makes conditional charges explicit", () => {
 expect(sessionInput.safeParse(input("free")).success).toBe(false);
 expect(sessionPricing("commercial").summary).toContain("118");
 expect(sessionPricing("club").detail).toContain("周末及法定节假日 60");
 expect(sessionPricing("test").detail).toContain("会员免费；其他客人");
});
