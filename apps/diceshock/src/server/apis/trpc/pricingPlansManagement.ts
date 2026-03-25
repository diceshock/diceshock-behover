import db, {
  drizzle,
  pricingGlobalConfigTable,
  pricingPlansTable,
  pricingSnapshotsTable,
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

async function buildSnapshotData(tdb: ReturnType<typeof db>) {
  const configRow = await tdb.query.pricingGlobalConfigTable.findFirst();
  const config = {
    daytime_start: configRow?.daytime_start ?? "10:00",
    daytime_end: configRow?.daytime_end ?? "18:00",
  };

  const allPlans = await tdb.query.pricingPlansTable.findMany({
    orderBy: (p, { asc }) => asc(p.sort_order),
  });

  const plans = allPlans.map((p) => ({
    plan_type: p.plan_type,
    name: p.name,
    sort_order: p.sort_order,
    enabled: p.enabled,
    conditions: p.conditions,
    billing_type: p.billing_type,
    price: p.price,
    cap_enabled: p.cap_enabled,
    cap_unit: p.cap_unit,
    cap_price: p.cap_price,
    cap_price_day: p.cap_price_day,
    cap_price_night: p.cap_price_night,
  }));

  return { config, plans };
}

const saveSnapshot = dashProcedure.mutation(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const data = await buildSnapshotData(tdb);

  const [snapshot] = await tdb
    .insert(pricingSnapshotsTable)
    .values({
      data,
      status: "draft",
      created_at: new Date(),
    })
    .returning();

  return snapshot;
});

const publish = dashProcedure.mutation(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);

  const latestDraft = await tdb.query.pricingSnapshotsTable.findFirst({
    where: (s, { eq }) => eq(s.status, "draft"),
    orderBy: (s, { desc }) => desc(s.created_at),
  });

  if (!latestDraft) {
    const data = await buildSnapshotData(tdb);
    const [snapshot] = await tdb
      .insert(pricingSnapshotsTable)
      .values({
        data,
        status: "published",
        created_at: new Date(),
        published_at: new Date(),
      })
      .returning();
    return snapshot;
  }

  const [updated] = await tdb
    .update(pricingSnapshotsTable)
    .set({ status: "published", published_at: new Date() })
    .where(drizzle.eq(pricingSnapshotsTable.id, latestDraft.id))
    .returning();

  return updated;
});

const listSnapshots = dashProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const rows = await tdb.query.pricingSnapshotsTable.findMany({
    orderBy: (s, { desc }) => desc(s.created_at),
  });

  return rows.map((row) => {
    const d = row.data as {
      config: { daytime_start: string; daytime_end: string };
      plans: Array<{
        plan_type: string;
        name: string;
        billing_type: string;
        price: number;
        enabled: boolean;
      }>;
    } | null;

    const fallback = d?.plans.find((p) => p.plan_type === "fallback");
    const conditionals =
      d?.plans.filter((p) => p.plan_type === "conditional") ?? [];
    const enabledCount = conditionals.filter((p) => p.enabled).length;

    const parts: string[] = [];
    if (d?.config) {
      parts.push(`时段 ${d.config.daytime_start}-${d.config.daytime_end}`);
    }
    if (fallback) {
      parts.push(`兜底 ¥${(fallback.price / 100).toFixed(0)}/时`);
    }
    if (conditionals.length > 0) {
      parts.push(
        `${conditionals.length}个条件计划` +
          (enabledCount < conditionals.length ? `(${enabledCount}个启用)` : ""),
      );
    }

    return {
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      published_at: row.published_at,
      summary: parts.join(" · ") || "空快照",
    };
  });
});

const restoreSnapshot = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const snapshot = await tdb.query.pricingSnapshotsTable.findFirst({
      where: (s, { eq }) => eq(s.id, input.id),
    });
    if (!snapshot?.data) throw new Error("快照不存在");

    const snapshotData = snapshot.data as {
      config: { daytime_start: string; daytime_end: string };
      plans: Array<{
        plan_type: "fallback" | "conditional";
        name: string;
        sort_order: number;
        enabled: boolean;
        conditions: unknown;
        billing_type: "hourly" | "fixed";
        price: number;
        cap_enabled: boolean;
        cap_unit: "per_day" | "split_day_night" | null;
        cap_price: number | null;
        cap_price_day: number | null;
        cap_price_night: number | null;
      }>;
    };

    await tdb.delete(pricingPlansTable);

    const existingConfig = await tdb.query.pricingGlobalConfigTable.findFirst();
    if (existingConfig) {
      await tdb
        .update(pricingGlobalConfigTable)
        .set({
          daytime_start: snapshotData.config.daytime_start,
          daytime_end: snapshotData.config.daytime_end,
          update_at: new Date(),
        })
        .where(drizzle.eq(pricingGlobalConfigTable.id, existingConfig.id));
    } else {
      await tdb.insert(pricingGlobalConfigTable).values({
        daytime_start: snapshotData.config.daytime_start,
        daytime_end: snapshotData.config.daytime_end,
      });
    }

    const now = new Date();
    for (const plan of snapshotData.plans) {
      await tdb.insert(pricingPlansTable).values({
        plan_type: plan.plan_type,
        name: plan.name,
        sort_order: plan.sort_order,
        enabled: plan.enabled,
        conditions:
          plan.conditions as typeof pricingPlansTable.$inferInsert.conditions,
        billing_type: plan.billing_type,
        price: plan.price,
        cap_enabled: plan.cap_enabled,
        cap_unit: plan.cap_unit,
        cap_price: plan.cap_price,
        cap_price_day: plan.cap_price_day,
        cap_price_night: plan.cap_price_night,
        create_at: now,
        update_at: now,
      });
    }

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
  saveSnapshot,
  publish,
  listSnapshots,
  restoreSnapshot,
};
