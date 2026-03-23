import db, {
  drizzle,
  pricingGlobalConfigTable,
  pricingPlansTable,
} from "@lib/db";
import { dashProcedure } from "./baseTRPC";

const getConfig = dashProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const row = await tdb.query.pricingGlobalConfigTable.findFirst();
  return row ?? { id: "", daytime_start: "10:00", daytime_end: "18:00" };
});

const updateConfig = dashProcedure
  .input((v: unknown) => {
    const data = v as {
      daytime_start: string;
      daytime_end: string;
    };
    if (!data.daytime_start || !data.daytime_end)
      throw new Error("daytime_start and daytime_end are required");
    return data;
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const existing = await tdb.query.pricingGlobalConfigTable.findFirst();
    if (existing) {
      await tdb
        .update(pricingGlobalConfigTable)
        .set({
          daytime_start: input.daytime_start,
          daytime_end: input.daytime_end,
          update_at: new Date(),
        })
        .where(drizzle.eq(pricingGlobalConfigTable.id, existing.id));
      return { ...existing, ...input };
    }
    const [created] = await tdb
      .insert(pricingGlobalConfigTable)
      .values({
        daytime_start: input.daytime_start,
        daytime_end: input.daytime_end,
      })
      .returning();
    return created;
  });

const list = dashProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  return tdb.query.pricingPlansTable.findMany({
    orderBy: (p, { asc }) => asc(p.sort_order),
  });
});

const getById = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const plan = await tdb.query.pricingPlansTable.findFirst({
      where: (p, { eq }) => eq(p.id, input.id),
    });
    if (!plan) throw new Error("计划不存在");
    return plan;
  });

const create = dashProcedure
  .input((v: unknown) => {
    const data = v as {
      plan_type: "fallback" | "conditional";
      name: string;
      billing_type: "hourly" | "fixed";
      price: number;
      conditions?: unknown;
      cap_enabled?: boolean;
      cap_unit?: "per_day" | "split_day_night";
      cap_price?: number | null;
      cap_price_day?: number | null;
      cap_price_night?: number | null;
    };
    if (!data.name?.trim()) throw new Error("name is required");
    if (!data.billing_type) throw new Error("billing_type is required");
    if (data.price == null) throw new Error("price is required");
    return data;
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    let sortOrder = 0;
    if (input.plan_type === "conditional") {
      const all = await tdb.query.pricingPlansTable.findMany({
        where: (p, { eq }) => eq(p.plan_type, "conditional"),
        columns: { sort_order: true },
      });
      sortOrder =
        all.length > 0 ? Math.max(...all.map((p) => p.sort_order)) + 1 : 1;
    }

    const [created] = await tdb
      .insert(pricingPlansTable)
      .values({
        plan_type: input.plan_type,
        name: input.name.trim(),
        sort_order: sortOrder,
        billing_type: input.billing_type,
        price: input.price,
        conditions:
          (input.conditions as typeof pricingPlansTable.$inferInsert.conditions) ??
          null,
        cap_enabled: input.cap_enabled ?? false,
        cap_unit: input.cap_unit ?? null,
        cap_price: input.cap_price ?? null,
        cap_price_day: input.cap_price_day ?? null,
        cap_price_night: input.cap_price_night ?? null,
        enabled: input.plan_type === "fallback",
      })
      .returning();
    return created;
  });

const update = dashProcedure
  .input((v: unknown) => {
    const data = v as {
      id: string;
      name?: string;
      billing_type?: "hourly" | "fixed";
      price?: number;
      conditions?: unknown;
      enabled?: boolean;
      cap_enabled?: boolean;
      cap_unit?: "per_day" | "split_day_night" | null;
      cap_price?: number | null;
      cap_price_day?: number | null;
      cap_price_night?: number | null;
    };
    if (!data.id) throw new Error("id is required");
    return data;
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const { id, ...fields } = input;
    const updateData: Record<string, unknown> = { update_at: new Date() };

    if (fields.name !== undefined) updateData.name = fields.name.trim();
    if (fields.billing_type !== undefined)
      updateData.billing_type = fields.billing_type;
    if (fields.price !== undefined) updateData.price = fields.price;
    if (fields.conditions !== undefined)
      updateData.conditions = fields.conditions;
    if (fields.enabled !== undefined) updateData.enabled = fields.enabled;
    if (fields.cap_enabled !== undefined)
      updateData.cap_enabled = fields.cap_enabled;
    if (fields.cap_unit !== undefined) updateData.cap_unit = fields.cap_unit;
    if (fields.cap_price !== undefined) updateData.cap_price = fields.cap_price;
    if (fields.cap_price_day !== undefined)
      updateData.cap_price_day = fields.cap_price_day;
    if (fields.cap_price_night !== undefined)
      updateData.cap_price_night = fields.cap_price_night;

    const [updated] = await tdb
      .update(pricingPlansTable)
      .set(updateData)
      .where(drizzle.eq(pricingPlansTable.id, id))
      .returning();
    return updated;
  });

const remove = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    await tdb
      .delete(pricingPlansTable)
      .where(drizzle.eq(pricingPlansTable.id, input.id));
    return { success: true };
  });

const reorder = dashProcedure
  .input((v: unknown) => {
    const data = v as { ids: string[] };
    if (!Array.isArray(data.ids) || data.ids.length === 0)
      throw new Error("ids array is required");
    return data;
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const now = new Date();
    await Promise.all(
      input.ids.map((id, index) =>
        tdb
          .update(pricingPlansTable)
          .set({ sort_order: index + 1, update_at: now })
          .where(drizzle.eq(pricingPlansTable.id, id)),
      ),
    );
    return { success: true };
  });

export default {
  getConfig,
  updateConfig,
  list,
  getById,
  create,
  update,
  remove,
  reorder,
};
