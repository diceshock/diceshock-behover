import db, {
  drizzle,
  orderPauseLogsTable,
  pricingSnapshotsTable,
  tableOccupancyTable,
  tablesTable,
  userInfoTable,
  userMembershipPlansTable,
  users,
} from "@lib/db";
import { fetchTableStateForDO, notifySocketDO } from "@/server/utils/seatTimer";
import { calculatePrice, type SnapshotData } from "@/shared/utils/pricing";
import { dashProcedure } from "./baseTRPC";

type StatusFilter = "all" | "active" | "paused" | "ended";
type SortBy = "start_at" | "end_at";
type SortOrder = "asc" | "desc";
type GroupBy = "table" | "user" | "date" | "none";

const list = dashProcedure
  .input((v: unknown) => {
    const data = v as {
      search?: string;
      status?: StatusFilter;
      sortBy?: SortBy;
      sortOrder?: SortOrder;
      groupBy?: GroupBy;
      page?: number;
      pageSize?: number;
    };
    return {
      search: data.search ?? "",
      status: data.status ?? "all",
      sortBy: data.sortBy ?? "start_at",
      sortOrder: data.sortOrder ?? "desc",
      groupBy: data.groupBy ?? "none",
      page: data.page ?? 1,
      pageSize: data.pageSize ?? 50,
    };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const allOccupancies = await tdb.query.tableOccupancyTable.findMany({
      with: {
        table: {
          columns: {
            id: true,
            name: true,
            type: true,
            scope: true,
            code: true,
          },
        },
        user: {
          columns: { id: true, name: true },
        },
      },
      orderBy: (o, { asc, desc }) => {
        const dir = input.sortOrder === "asc" ? asc : desc;
        switch (input.sortBy) {
          case "end_at":
            return dir(o.end_at);
          default:
            return dir(o.start_at);
        }
      },
    });

    const enriched = await Promise.all(
      allOccupancies.map(async (occ) => {
        let nickname = "Anonymous";
        let uid: string | null = null;

        if (occ.user_id) {
          const info = await tdb.query.userInfoTable.findFirst({
            where: (i, { eq }) => eq(i.id, occ.user_id!),
            columns: { nickname: true, uid: true },
          });
          nickname = info?.nickname ?? nickname;
          uid = info?.uid ?? null;
        } else if (occ.temp_id) {
          try {
            const tempInfo = await tdb.query.tempIdentitiesTable.findFirst({
              where: (t, { eq }) => eq(t.id, occ.temp_id!),
              columns: { nickname: true },
            });
            nickname = tempInfo?.nickname ?? nickname;
          } catch {}
          uid = `temp:${occ.temp_id}`;
        }

        return {
          id: occ.id,
          table_id: occ.table_id,
          user_id: occ.user_id,
          seats: occ.seats,
          status: occ.status,
          start_at:
            occ.start_at instanceof Date
              ? occ.start_at.getTime()
              : Number(occ.start_at),
          end_at: occ.end_at
            ? occ.end_at instanceof Date
              ? occ.end_at.getTime()
              : Number(occ.end_at)
            : null,
          final_price: occ.final_price ?? null,
          pricing_snapshot_id: occ.pricing_snapshot_id ?? null,
          price_breakdown: occ.price_breakdown ?? null,
          table: occ.table,
          user: occ.user,
          nickname,
          uid,
        };
      }),
    );

    let filtered = enriched;
    if (input.status !== "all") {
      filtered = filtered.filter((o) => o.status === input.status);
    }

    if (input.search.trim()) {
      const q = input.search.trim().toLowerCase();
      filtered = filtered.filter((o) => {
        return (
          o.id.toLowerCase().includes(q) ||
          (o.table?.name ?? "").toLowerCase().includes(q) ||
          (o.table?.code ?? "").toLowerCase().includes(q) ||
          (o.user?.name ?? "").toLowerCase().includes(q) ||
          o.nickname.toLowerCase().includes(q) ||
          (o.uid ?? "").toLowerCase().includes(q)
        );
      });
    }

    const total = filtered.length;

    const start = (input.page - 1) * input.pageSize;
    const items = filtered.slice(start, start + input.pageSize);

    return {
      items,
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  });

const getById = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);

    const occ = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq }) => eq(o.id, input.id),
      with: {
        table: {
          columns: {
            id: true,
            name: true,
            type: true,
            scope: true,
            code: true,
          },
        },
        user: {
          columns: { id: true, name: true },
        },
      },
    });

    if (!occ) throw new Error("订单不存在");

    let nickname = "Anonymous";
    let uid: string | null = null;

    if (occ.user_id) {
      const info = await tdb.query.userInfoTable.findFirst({
        where: (i, { eq }) => eq(i.id, occ.user_id!),
        columns: { nickname: true, uid: true },
      });
      nickname = info?.nickname ?? nickname;
      uid = info?.uid ?? null;
    } else if (occ.temp_id) {
      try {
        const tempInfo = await tdb.query.tempIdentitiesTable.findFirst({
          where: (t, { eq }) => eq(t.id, occ.temp_id!),
          columns: { nickname: true },
        });
        nickname = tempInfo?.nickname ?? nickname;
      } catch {}
      uid = `temp:${occ.temp_id}`;
    }

    return {
      id: occ.id,
      table_id: occ.table_id,
      user_id: occ.user_id,
      seats: occ.seats,
      status: occ.status,
      start_at:
        occ.start_at instanceof Date
          ? occ.start_at.getTime()
          : Number(occ.start_at),
      end_at: occ.end_at
        ? occ.end_at instanceof Date
          ? occ.end_at.getTime()
          : Number(occ.end_at)
        : null,
      final_price: occ.final_price ?? null,
      pricing_snapshot_id: occ.pricing_snapshot_id ?? null,
      price_breakdown: occ.price_breakdown ?? null,
      table: occ.table,
      user: occ.user,
      nickname,
      uid,
    };
  });

async function notifyDOForOrder(
  tdb: ReturnType<typeof db>,
  env: Parameters<typeof notifySocketDO>[0],
  occupancyId: string,
) {
  const occ = await tdb.query.tableOccupancyTable.findFirst({
    where: (o, { eq }) => eq(o.id, occupancyId),
    columns: { table_id: true },
  });
  if (!occ) return;
  const table = await tdb.query.tablesTable.findFirst({
    where: (t, { eq }) => eq(t.id, occ.table_id),
    columns: { id: true, code: true },
  });
  if (!table) return;
  const fresh = await fetchTableStateForDO(tdb, table.id);
  if (fresh) {
    await notifySocketDO(env, table.code, fresh.table, fresh.occupancies);
  }
}

const endOrder = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const now = new Date();

    const occ = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq }) => eq(o.id, input.id),
      with: { table: { columns: { type: true, scope: true } } },
    });
    if (!occ) throw new Error("订单不存在");

    const pauseLogs = await tdb.query.orderPauseLogsTable.findMany({
      where: (l, { eq }) => eq(l.occupancy_id, input.id),
      orderBy: (l, { asc }) => asc(l.paused_at),
    });

    const openLog = pauseLogs.find((l) => !l.resumed_at);
    if (openLog) {
      await tdb
        .update(orderPauseLogsTable)
        .set({ resumed_at: now })
        .where(drizzle.eq(orderPauseLogsTable.id, openLog.id));
    }

    const publishedSnapshot = await tdb.query.pricingSnapshotsTable.findFirst({
      where: (s, { eq }) => eq(s.status, "published"),
      orderBy: (s, { desc }) => desc(s.created_at),
    });

    const startAt =
      occ.start_at instanceof Date
        ? occ.start_at.getTime()
        : Number(occ.start_at);
    const endAt = now.getTime();
    const snapshotData = publishedSnapshot?.data as SnapshotData | null;
    const tableScope = occ.table?.scope ?? "boardgame";

    const pauseLogsMapped = pauseLogs.map((l) => ({
      pausedAt:
        l.paused_at instanceof Date
          ? l.paused_at.getTime()
          : Number(l.paused_at),
      resumedAt: l.resumed_at
        ? l.resumed_at instanceof Date
          ? l.resumed_at.getTime()
          : Number(l.resumed_at)
        : endAt,
    }));

    const breakdown = calculatePrice(
      startAt,
      endAt,
      tableScope,
      snapshotData,
      pauseLogsMapped,
    );

    await tdb
      .update(tableOccupancyTable)
      .set({
        status: "ended",
        end_at: now,
        final_price: breakdown?.finalPrice ?? null,
        pricing_snapshot_id: publishedSnapshot?.id ?? null,
        price_breakdown: breakdown,
      })
      .where(drizzle.eq(tableOccupancyTable.id, input.id));

    await notifyDOForOrder(tdb, ctx.env, input.id);
    return { success: true, price: breakdown?.finalPrice ?? null };
  });

async function buildSettlementData(
  tdb: ReturnType<typeof db>,
  occupancyId: string,
) {
  const occ = await tdb.query.tableOccupancyTable.findFirst({
    where: (o, { eq }) => eq(o.id, occupancyId),
    with: {
      table: {
        columns: { id: true, name: true, type: true, scope: true, code: true },
      },
      user: { columns: { id: true, name: true } },
    },
  });
  if (!occ) throw new Error("订单不存在");

  let nickname = "Anonymous";
  let uid: string | null = null;
  if (occ.user_id) {
    const info = await tdb.query.userInfoTable.findFirst({
      where: (i, { eq }) => eq(i.id, occ.user_id!),
      columns: { nickname: true, uid: true },
    });
    nickname = info?.nickname ?? nickname;
    uid = info?.uid ?? null;
  } else if (occ.temp_id) {
    try {
      const tempInfo = await tdb.query.tempIdentitiesTable.findFirst({
        where: (t, { eq }) => eq(t.id, occ.temp_id!),
        columns: { nickname: true },
      });
      nickname = tempInfo?.nickname ?? nickname;
    } catch {}
    uid = `temp:${occ.temp_id}`;
  }

  const pauseLogs = await tdb.query.orderPauseLogsTable.findMany({
    where: (l, { eq }) => eq(l.occupancy_id, occupancyId),
    orderBy: (l, { asc }) => asc(l.paused_at),
  });

  const startAt =
    occ.start_at instanceof Date
      ? occ.start_at.getTime()
      : Number(occ.start_at);
  const endAt = occ.end_at
    ? occ.end_at instanceof Date
      ? occ.end_at.getTime()
      : Number(occ.end_at)
    : Date.now();
  const tableScope = occ.table?.scope ?? "boardgame";

  const pauseLogsMapped = pauseLogs.map((l) => ({
    pausedAt:
      l.paused_at instanceof Date ? l.paused_at.getTime() : Number(l.paused_at),
    resumedAt: l.resumed_at
      ? l.resumed_at instanceof Date
        ? l.resumed_at.getTime()
        : Number(l.resumed_at)
      : occ.status === "ended"
        ? endAt
        : null,
  }));

  let pausedMs = 0;
  for (const log of pauseLogsMapped) {
    const pStart = Math.max(log.pausedAt, startAt);
    const pEnd = Math.min(log.resumedAt ?? endAt, endAt);
    if (pEnd > pStart) pausedMs += pEnd - pStart;
  }
  const pausedMinutes = Math.floor(pausedMs / 60000);

  const publishedSnapshot = await tdb.query.pricingSnapshotsTable.findFirst({
    where: (s, { eq }) => eq(s.status, "published"),
    orderBy: (s, { desc }) => desc(s.created_at),
  });
  const snapshotData = publishedSnapshot?.data as SnapshotData | null;

  const breakdown =
    occ.status === "ended" && occ.price_breakdown
      ? occ.price_breakdown
      : calculatePrice(
          startAt,
          endAt,
          tableScope,
          snapshotData,
          pauseLogsMapped,
        );

  const totalMinutes = Math.floor(Math.max(0, endAt - startAt) / 60000);
  const billableMinutes = totalMinutes - pausedMinutes;
  const finalPrice =
    occ.status === "ended" && occ.final_price != null
      ? occ.final_price
      : (breakdown?.finalPrice ?? 0);

  let membership = {
    hasTimePlan: false,
    timePlanActive: false,
    timePlanType: null as string | null,
    timePlanEndDate: null as number | null,
    storedValueBalance: 0,
  };
  if (occ.user_id) {
    const plans = await tdb.query.userMembershipPlansTable.findMany({
      where: (p, { eq }) => eq(p.user_id, occ.user_id!),
    });
    const now = Date.now();
    const timePlans = plans.filter((p) =>
      ["monthly", "monthly_cc", "yearly"].includes(p.plan_type),
    );
    const activeTimePlan = timePlans.find((p) => {
      const s = p.start_date ? new Date(p.start_date).getTime() : 0;
      const e = p.end_date ? new Date(p.end_date).getTime() : null;
      return s <= now && (e === null || e >= now);
    });
    const svBalance = plans
      .filter((p) => p.plan_type === "stored_value")
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);

    membership = {
      hasTimePlan: timePlans.length > 0,
      timePlanActive: !!activeTimePlan,
      timePlanType: activeTimePlan?.plan_type ?? null,
      timePlanEndDate: activeTimePlan?.end_date
        ? new Date(activeTimePlan.end_date).getTime()
        : null,
      storedValueBalance: svBalance,
    };
  }

  const pricingPlans = (snapshotData?.plans ?? []).map((p) => ({
    name: p.name,
    planType: p.plan_type,
    billingType: p.billing_type,
    price: p.price,
    matched: breakdown?.planName === p.name,
  }));

  const userId = occ.user_id;
  let recentOrders: Array<{
    id: string;
    tableName: string;
    startAt: number;
    endAt: number | null;
    finalPrice: number | null;
    status: string;
  }> = [];
  if (userId) {
    const recent = await tdb.query.tableOccupancyTable.findMany({
      where: (o, { eq }) => eq(o.user_id, userId),
      with: { table: { columns: { name: true } } },
      orderBy: (o, { desc }) => desc(o.start_at),
      limit: 10,
    });
    recentOrders = recent.map((r) => ({
      id: r.id,
      tableName: r.table?.name ?? "未知",
      startAt:
        r.start_at instanceof Date ? r.start_at.getTime() : Number(r.start_at),
      endAt: r.end_at
        ? r.end_at instanceof Date
          ? r.end_at.getTime()
          : Number(r.end_at)
        : null,
      finalPrice: r.final_price ?? null,
      status: r.status,
    }));
  }

  return {
    order: {
      id: occ.id,
      table_id: occ.table_id,
      user_id: occ.user_id,
      temp_id: occ.temp_id,
      seats: occ.seats,
      status: occ.status,
      start_at: startAt,
      end_at: occ.end_at ? endAt : null,
      final_price: occ.final_price ?? null,
      table: occ.table,
      nickname,
      uid,
    },
    totalMinutes,
    pausedMinutes,
    billableMinutes,
    finalPrice,
    priceBreakdown: breakdown,
    membership,
    pauseLogs: pauseLogsMapped,
    pricingPlans,
    recentOrders,
  };
}

const getSettlementPreview = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .query(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    return buildSettlementData(tdb, input.id);
  });

const settleOrder = dashProcedure
  .input((v: unknown) => {
    const data = v as {
      id: string;
      deductFromStoredValue?: boolean;
    };
    if (!data.id) throw new Error("id is required");
    return {
      id: data.id,
      deductFromStoredValue: data.deductFromStoredValue ?? false,
    };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const now = new Date();

    const occ = await tdb.query.tableOccupancyTable.findFirst({
      where: (o, { eq }) => eq(o.id, input.id),
      with: {
        table: {
          columns: {
            id: true,
            name: true,
            type: true,
            scope: true,
            code: true,
          },
        },
      },
    });
    if (!occ) throw new Error("订单不存在");
    if (occ.status === "ended") throw new Error("订单已结束");

    const pauseLogs = await tdb.query.orderPauseLogsTable.findMany({
      where: (l, { eq }) => eq(l.occupancy_id, input.id),
      orderBy: (l, { asc }) => asc(l.paused_at),
    });
    const openLog = pauseLogs.find((l) => !l.resumed_at);
    if (openLog) {
      await tdb
        .update(orderPauseLogsTable)
        .set({ resumed_at: now })
        .where(drizzle.eq(orderPauseLogsTable.id, openLog.id));
    }

    const publishedSnapshot = await tdb.query.pricingSnapshotsTable.findFirst({
      where: (s, { eq }) => eq(s.status, "published"),
      orderBy: (s, { desc }) => desc(s.created_at),
    });

    const startAt =
      occ.start_at instanceof Date
        ? occ.start_at.getTime()
        : Number(occ.start_at);
    const endAt = now.getTime();
    const tableScope = occ.table?.scope ?? "boardgame";
    const snapshotData = publishedSnapshot?.data as SnapshotData | null;

    const allPauseLogs = openLog
      ? pauseLogs.map((l) =>
          l.id === openLog.id ? { ...l, resumed_at: now } : l,
        )
      : pauseLogs;

    const pauseLogsMapped = allPauseLogs.map((l) => ({
      pausedAt:
        l.paused_at instanceof Date
          ? l.paused_at.getTime()
          : Number(l.paused_at),
      resumedAt: l.resumed_at
        ? l.resumed_at instanceof Date
          ? l.resumed_at.getTime()
          : Number(l.resumed_at)
        : endAt,
    }));

    const breakdown = calculatePrice(
      startAt,
      endAt,
      tableScope,
      snapshotData,
      pauseLogsMapped,
    );

    const finalPrice = breakdown?.finalPrice ?? 0;

    let nickname = "Anonymous";
    let uid: string | null = null;
    if (occ.user_id) {
      const info = await tdb.query.userInfoTable.findFirst({
        where: (i, { eq }) => eq(i.id, occ.user_id!),
        columns: { nickname: true, uid: true },
      });
      nickname = info?.nickname ?? nickname;
      uid = info?.uid ?? null;
    } else if (occ.temp_id) {
      try {
        const tempInfo = await tdb.query.tempIdentitiesTable.findFirst({
          where: (t, { eq }) => eq(t.id, occ.temp_id!),
          columns: { nickname: true },
        });
        nickname = tempInfo?.nickname ?? nickname;
      } catch {}
      uid = `temp:${occ.temp_id}`;
    }

    let pausedMs = 0;
    for (const log of pauseLogsMapped) {
      const pStart = Math.max(log.pausedAt, startAt);
      const pEnd = Math.min(log.resumedAt ?? endAt, endAt);
      if (pEnd > pStart) pausedMs += pEnd - pStart;
    }
    const totalMinutes = Math.floor(Math.max(0, endAt - startAt) / 60000);
    const pausedMinutes = Math.floor(pausedMs / 60000);

    let membershipInfo = {
      hasTimePlan: false,
      timePlanActive: false,
      timePlanType: null as string | null,
      timePlanEndDate: null as number | null,
      storedValueBalance: 0,
    };
    let storedValueDeduction: {
      deducted: boolean;
      amount: number;
      note: string;
      balanceBefore: number;
      balanceAfter: number;
    } | null = null;

    if (occ.user_id) {
      const plans = await tdb.query.userMembershipPlansTable.findMany({
        where: (p, { eq }) => eq(p.user_id, occ.user_id!),
      });
      const nowMs = Date.now();
      const timePlans = plans.filter((p) =>
        ["monthly", "monthly_cc", "yearly"].includes(p.plan_type),
      );
      const activeTimePlan = timePlans.find((p) => {
        const s = p.start_date ? new Date(p.start_date).getTime() : 0;
        const e = p.end_date ? new Date(p.end_date).getTime() : null;
        return s <= nowMs && (e === null || e >= nowMs);
      });
      const svBalance = plans
        .filter((p) => p.plan_type === "stored_value")
        .reduce((sum, p) => sum + (p.amount ?? 0), 0);

      membershipInfo = {
        hasTimePlan: timePlans.length > 0,
        timePlanActive: !!activeTimePlan,
        timePlanType: activeTimePlan?.plan_type ?? null,
        timePlanEndDate: activeTimePlan?.end_date
          ? new Date(activeTimePlan.end_date).getTime()
          : null,
        storedValueBalance: svBalance,
      };

      if (input.deductFromStoredValue && svBalance > 0 && finalPrice > 0) {
        const deductAmount = Math.min(svBalance, finalPrice);
        const tableName = occ.table?.name ?? "未知桌台";
        const deductNote = `自动扣费 · ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} · ${tableName}`;

        const svPlans = plans
          .filter((p) => p.plan_type === "stored_value" && (p.amount ?? 0) > 0)
          .sort(
            (a, b) =>
              new Date(a.create_at ?? 0).getTime() -
              new Date(b.create_at ?? 0).getTime(),
          );

        let remaining = deductAmount;
        for (const plan of svPlans) {
          if (remaining <= 0) break;
          const available = plan.amount ?? 0;
          if (available <= 0) continue;
          const toDeduct = Math.min(available, remaining);
          await tdb
            .update(userMembershipPlansTable)
            .set({ amount: available - toDeduct, update_at: now })
            .where(drizzle.eq(userMembershipPlansTable.id, plan.id));
          remaining -= toDeduct;
        }

        await tdb.insert(userMembershipPlansTable).values({
          user_id: occ.user_id,
          plan_type: "stored_value",
          amount: -deductAmount,
          note: deductNote,
          start_date: now,
        });

        storedValueDeduction = {
          deducted: true,
          amount: deductAmount,
          note: deductNote,
          balanceBefore: svBalance,
          balanceAfter: svBalance - deductAmount,
        };

        membershipInfo.storedValueBalance = svBalance - deductAmount;
      }
    }

    const pricingPlans = (
      (snapshotData?.plans ?? []) as Array<{
        name: string;
        plan_type: "fallback" | "conditional";
        billing_type: "hourly" | "fixed";
        price: number;
      }>
    ).map((p) => ({
      name: p.name,
      planType: p.plan_type,
      billingType: p.billing_type,
      price: p.price,
      matched: breakdown?.planName === p.name,
    }));

    let recentOrders: Array<{
      id: string;
      tableName: string;
      startAt: number;
      endAt: number | null;
      finalPrice: number | null;
      status: string;
    }> = [];
    if (occ.user_id) {
      const recent = await tdb.query.tableOccupancyTable.findMany({
        where: (o, { eq }) => eq(o.user_id, occ.user_id!),
        with: { table: { columns: { name: true } } },
        orderBy: (o, { desc }) => desc(o.start_at),
        limit: 10,
      });
      recentOrders = recent.map((r) => ({
        id: r.id,
        tableName: r.table?.name ?? "未知",
        startAt:
          r.start_at instanceof Date
            ? r.start_at.getTime()
            : Number(r.start_at),
        endAt: r.end_at
          ? r.end_at instanceof Date
            ? r.end_at.getTime()
            : Number(r.end_at)
          : null,
        finalPrice: r.final_price ?? null,
        status: r.status,
      }));
    }

    type SettlementSnapshot = NonNullable<
      typeof import("@lib/db").tableOccupancyTable.$inferSelect.settlement_snapshot
    >;

    const snapshot: SettlementSnapshot = {
      orderId: occ.id,
      tableName: occ.table?.name ?? "未知",
      tableType: tableScope,
      nickname,
      uid,
      seats: occ.seats,
      startAt,
      endAt,
      totalMinutes,
      pausedMinutes,
      billableMinutes: totalMinutes - pausedMinutes,
      finalPrice,
      priceBreakdown: breakdown,
      membership: membershipInfo,
      storedValueDeduction,
      pauseLogs: pauseLogsMapped,
      pricingPlans,
      recentOrders,
      createdAt: Date.now(),
    };

    await tdb
      .update(tableOccupancyTable)
      .set({
        status: "ended",
        end_at: now,
        final_price: finalPrice,
        pricing_snapshot_id: publishedSnapshot?.id ?? null,
        price_breakdown: breakdown,
        settlement_snapshot: snapshot,
      })
      .where(drizzle.eq(tableOccupancyTable.id, input.id));

    await notifyDOForOrder(tdb, ctx.env, input.id);
    return { success: true, price: finalPrice, snapshot };
  });

const pauseOrder = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const now = new Date();
    await tdb
      .update(tableOccupancyTable)
      .set({ status: "paused" })
      .where(drizzle.eq(tableOccupancyTable.id, input.id));
    await tdb.insert(orderPauseLogsTable).values({
      occupancy_id: input.id,
      paused_at: now,
    });
    await notifyDOForOrder(tdb, ctx.env, input.id);
    return { success: true };
  });

const resumeOrder = dashProcedure
  .input((v: unknown) => {
    const { id } = v as { id: string };
    if (!id) throw new Error("id is required");
    return { id };
  })
  .mutation(async ({ input, ctx }) => {
    const tdb = db(ctx.env.DB);
    const now = new Date();
    await tdb
      .update(tableOccupancyTable)
      .set({ status: "active" })
      .where(drizzle.eq(tableOccupancyTable.id, input.id));
    const openLog = await tdb.query.orderPauseLogsTable.findFirst({
      where: (l, { eq, and, isNull }) =>
        and(eq(l.occupancy_id, input.id), isNull(l.resumed_at)),
      orderBy: (l, { desc }) => desc(l.paused_at),
    });
    if (openLog) {
      await tdb
        .update(orderPauseLogsTable)
        .set({ resumed_at: now })
        .where(drizzle.eq(orderPauseLogsTable.id, openLog.id));
    }
    await notifyDOForOrder(tdb, ctx.env, input.id);
    return { success: true };
  });

export default {
  list,
  getById,
  endOrder,
  pauseOrder,
  resumeOrder,
  getSettlementPreview,
  settleOrder,
};
