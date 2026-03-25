import db, { drizzle, pricingSnapshotsTable } from "@lib/db";
import { customAlphabet } from "nanoid/non-secure";
import { dashProcedure, publicProcedure } from "./baseTRPC";

type SnapshotData = NonNullable<typeof pricingSnapshotsTable.$inferSelect.data>;

const nanoid = customAlphabet("0123456789abcdef", 4);

const EMPTY_DATA: SnapshotData = {
  config: { daytime_start: "10:00", daytime_end: "18:00" },
  plans: [],
};

async function deduplicateName(
  tdb: ReturnType<typeof db>,
  name: string,
): Promise<string> {
  const existing = await tdb.query.pricingSnapshotsTable.findFirst({
    where: (s, { eq }) => eq(s.name, name),
    columns: { id: true },
  });
  return existing ? `${name}-${nanoid()}` : name;
}

const load = dashProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const latest = await tdb.query.pricingSnapshotsTable.findFirst({
    orderBy: (s, { desc }) => desc(s.created_at),
  });
  return {
    data: (latest?.data as SnapshotData | null) ?? EMPTY_DATA,
    snapshotId: latest?.id ?? null,
    snapshotName: latest?.name ?? null,
    status: latest?.status ?? null,
  };
});

const save = dashProcedure
  .input((v: unknown) => {
    const { data, name } = v as { data: SnapshotData; name: string };
    if (!data?.config || !Array.isArray(data.plans))
      throw new Error("invalid snapshot data");
    if (!name?.trim()) throw new Error("name is required");
    return { data, name: name.trim() };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const finalName = await deduplicateName(tdb, input.name);
    const [row] = await tdb
      .insert(pricingSnapshotsTable)
      .values({
        name: finalName,
        data: input.data,
        status: "draft",
        created_at: new Date(),
      })
      .returning();
    return { id: row.id, name: finalName };
  });

const publish = dashProcedure.mutation(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);

  const latestDraft = await tdb.query.pricingSnapshotsTable.findFirst({
    where: (s, { eq }) => eq(s.status, "draft"),
    orderBy: (s, { desc }) => desc(s.created_at),
  });
  if (!latestDraft) throw new Error("没有可发布的草稿，请先保存");

  await tdb
    .update(pricingSnapshotsTable)
    .set({ status: "published", published_at: new Date() })
    .where(drizzle.eq(pricingSnapshotsTable.id, latestDraft.id));

  return { id: latestDraft.id };
});

function buildSummary(d: SnapshotData | null): string {
  if (!d) return "空快照";
  const parts: string[] = [];
  if (d.config)
    parts.push(`时段 ${d.config.daytime_start}-${d.config.daytime_end}`);
  const fallback = d.plans.find((p) => p.plan_type === "fallback");
  if (fallback) parts.push(`兜底 ¥${(fallback.price / 100).toFixed(0)}/时`);
  const conds = d.plans.filter((p) => p.plan_type === "conditional");
  if (conds.length > 0) {
    const enabled = conds.filter((p) => p.enabled).length;
    parts.push(
      `${conds.length}个条件计划` +
        (enabled < conds.length ? `(${enabled}个启用)` : ""),
    );
  }
  return parts.join(" · ") || "空快照";
}

const listSnapshots = dashProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const rows = await tdb.query.pricingSnapshotsTable.findMany({
    orderBy: (s, { desc }) => desc(s.created_at),
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    created_at: row.created_at,
    published_at: row.published_at,
    summary: buildSummary(row.data as SnapshotData | null),
  }));
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

    const finalName = await deduplicateName(tdb, snapshot.name);
    const [row] = await tdb
      .insert(pricingSnapshotsTable)
      .values({
        name: finalName,
        data: snapshot.data,
        status: "draft",
        created_at: new Date(),
      })
      .returning();

    return { id: row.id, name: finalName, data: snapshot.data as SnapshotData };
  });

export default {
  load,
  save,
  publish,
  listSnapshots,
  restoreSnapshot,
  getPublished,
  getSnapshotDetail,
};

const getPublished = publicProcedure.query(async ({ ctx }) => {
  const tdb = db(ctx.env.DB);
  const published = await tdb.query.pricingSnapshotsTable.findFirst({
    where: (s, { eq }) => eq(s.status, "published"),
    orderBy: (s, { desc }) => desc(s.created_at),
  });
  if (!published) return null;
  return {
    id: published.id,
    data: published.data as SnapshotData,
  };
});

const getSnapshotDetail = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const snapshot = await tdb.query.pricingSnapshotsTable.findFirst({
      where: (s, { eq }) => eq(s.id, input.id),
    });
    if (!snapshot) throw new Error("快照不存在");
    return {
      id: snapshot.id,
      name: snapshot.name,
      status: snapshot.status,
      created_at: snapshot.created_at,
      published_at: snapshot.published_at,
      data: snapshot.data as SnapshotData,
    };
  });
