import { describe, expect, it } from "vitest";
import type { GQLContext } from "@/server/graphql/context";
import { membershipResolvers } from "@/server/graphql/resolvers/membership";
import { pointsResolvers } from "@/server/graphql/resolvers/points";
import { createDatabase } from "../../trpg/database";

describe("stored value and points invariants", () => {
  it("deducts stored value once while keeping a negative audit record", async () => {
    const fixture = createDatabase();
    try {
      fixture.sqlite.exec(`INSERT INTO user_membership_plans(id,user_id,plan_type,amount,start_date)
        VALUES ('credit','p1','stored_value',10000,0)`);
      const ctx = { role: "staff", userId: "staff", db: fixture.db, env: { DB: fixture.d1 } } as GQLContext;
      await membershipResolvers.Mutation.deductStoredValue(null, { input: {
        userId: "p1", amount: 2000, note: "Test purchase", date: new Date().toISOString(),
      } }, ctx);
      const rows = fixture.sqlite.prepare("SELECT amount FROM user_membership_plans WHERE user_id='p1' AND plan_type='stored_value'").all() as Array<{ amount: number }>;
      expect(rows.map((row) => row.amount).sort((a, b) => a - b)).toEqual([-2000, 10000]);
      expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(8000);
    } finally {
      fixture.sqlite.close();
    }
  });

  it("rejects negative amounts for both points operations", async () => {
    const ctx = { role: "staff", userId: "staff" } as GQLContext;
    await expect(pointsResolvers.Mutation.addPoints(null, { input: { userId: "p1", amount: -10 } }, ctx)).rejects.toThrow();
    await expect(pointsResolvers.Mutation.deductPoints(null, { input: { userId: "p1", amount: -10 } }, ctx)).rejects.toThrow();
  });
});
