import {
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ReceiptIcon,
  UserIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  ClientOnly,
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import dayjs from "@/shared/utils/dayjs-config";
import { formatPrice } from "@/shared/utils/pricing";
import { trpcClientDash } from "@/shared/utils/trpc";

export const Route = createFileRoute("/dash/orders_/settle")({
  component: BatchSettlePage,
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search.ids;
    if (Array.isArray(raw)) return { ids: raw.filter(Boolean) as string[] };
    if (typeof raw === "string") {
      if (raw.startsWith("[")) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed))
            return {
              ids: parsed.filter(
                (v): v is string => typeof v === "string" && v.length > 0,
              ),
            };
        } catch {}
      }
      return { ids: raw.split(",").filter(Boolean) };
    }
    return { ids: [] as string[] };
  },
});

type SettlementPreview = Awaited<
  ReturnType<typeof trpcClientDash.ordersManagement.getSettlementPreview.query>
>;

type BatchSettlementData = {
  previews: SettlementPreview[];
};

function formatTime(val: number | null | undefined): string {
  if (!val) return "—";
  const d = dayjs.tz(val, "Asia/Shanghai");
  return d.isValid() ? d.format("YYYY/MM/DD HH:mm:ss") : "—";
}

function formatShortTime(val: number | null | undefined): string {
  if (!val) return "—";
  const d = dayjs.tz(val, "Asia/Shanghai");
  return d.isValid() ? d.format("HH:mm") : "—";
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}小时${m}分钟`;
  return `${m}分钟`;
}

function buildSegments(
  startAt: number,
  endAt: number,
  pauseLogs: Array<{ pausedAt: number; resumedAt: number | null }>,
) {
  const sorted = [...pauseLogs].sort((a, b) => a.pausedAt - b.pausedAt);
  const segments: Array<{
    type: "active" | "paused";
    start: number;
    end: number;
  }> = [];
  let cursor = startAt;

  for (const log of sorted) {
    const pStart = Math.max(log.pausedAt, startAt);
    const pEnd = Math.min(log.resumedAt ?? endAt, endAt);
    if (pStart > cursor)
      segments.push({ type: "active", start: cursor, end: pStart });
    if (pEnd > pStart)
      segments.push({ type: "paused", start: pStart, end: pEnd });
    cursor = Math.max(cursor, pEnd);
  }

  if (cursor < endAt)
    segments.push({ type: "active", start: cursor, end: endAt });
  if (segments.length === 0)
    segments.push({ type: "active", start: startAt, end: endAt });
  return segments;
}

function BatchSettlePage() {
  const { ids } = Route.useSearch();
  const navigate = useNavigate();
  const msg = useMsg();

  const [data, setData] = useState<BatchSettlementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [deductEnabled, setDeductEnabled] = useState(false);
  const [cancelIds, setCancelIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (ids.length === 0) return;
    setLoading(true);
    try {
      const result =
        await trpcClientDash.ordersManagement.batchSettlementPreview.mutate({
          ids,
        });
      setData(result);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [ids, msg]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const toggleCancelId = (id: string) => {
    setCancelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const previewMap = useMemo(
    () => new Map(data?.previews.map((p) => [p.order.id, p]) ?? []),
    [data],
  );

  const activeSettleIds = useMemo(
    () => ids.filter((id) => !cancelIds.has(id)),
    [ids, cancelIds],
  );

  const totalPrice = useMemo(
    () =>
      activeSettleIds.reduce(
        (sum, id) => sum + (previewMap.get(id)?.finalPrice ?? 0),
        0,
      ),
    [activeSettleIds, previewMap],
  );

  const allEnded = useMemo(
    () => data?.previews.every((p) => p.order.status === "ended") ?? false,
    [data],
  );

  const totalDeductAmount = useMemo(() => {
    if (!deductEnabled) return 0;
    return activeSettleIds.reduce((sum, id) => {
      const p = previewMap.get(id);
      if (!p) return sum;
      return sum + Math.min(p.membership.storedValueBalance, p.finalPrice);
    }, 0);
  }, [deductEnabled, activeSettleIds, previewMap]);

  const remainingAfterDeduct = totalPrice - totalDeductAmount;

  const handleSettle = async () => {
    const settleIds = ids.filter((id) => !cancelIds.has(id));
    if (settleIds.length === 0) return;
    setSettling(true);
    try {
      await trpcClientDash.ordersManagement.batchSettle.mutate({
        ids: settleIds,
        deductFromStoredValue: deductEnabled,
      });
      msg.success("结算完成");
      await fetchData();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "结算失败");
    } finally {
      setSettling(false);
    }
  };

  const handleCancelSettlement = async () => {
    const idsToCancel = Array.from(cancelIds);
    if (idsToCancel.length === 0) return;
    try {
      await trpcClientDash.ordersManagement.cancelBatchSettlement.mutate({
        ids: idsToCancel,
      });
      msg.success(`已取消 ${idsToCancel.length} 个订单的结算`);
      const remainingIds = ids.filter((id) => !cancelIds.has(id));
      if (remainingIds.length === 0) {
        void navigate({
          to: "/dash/orders",
          search: {
            q: "",
            status: "all",
            sortBy: "start_at",
            sortOrder: "desc",
            groupBy: "none",
            page: 1,
          },
        });
      } else {
        void navigate({
          to: "/dash/orders/settle",
          search: { ids: remainingIds },
        });
      }
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "取消失败");
    }
  };

  const handleCancelAll = async () => {
    try {
      await trpcClientDash.ordersManagement.cancelBatchSettlement.mutate({
        ids,
      });
      msg.success("已取消全部结算");
      void navigate({
        to: "/dash/orders",
        search: {
          q: "",
          status: "all",
          sortBy: "start_at",
          sortOrder: "desc",
          groupBy: "none",
          page: 1,
        },
      });
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "取消失败");
    }
  };

  if (ids.length === 0) {
    return (
      <main className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-base-content/60">未选择订单</p>
        <Link
          to="/dash/orders"
          search={{
            q: "",
            status: "all",
            sortBy: "start_at",
            sortOrder: "desc",
            groupBy: "none",
            page: 1,
          }}
          className="btn btn-primary btn-sm"
        >
          返回订单列表
        </Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  if (!data || data.previews.length === 0) {
    return (
      <main className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-base-content/60">订单不存在</p>
        <Link
          to="/dash/orders"
          search={{
            q: "",
            status: "all",
            sortBy: "start_at",
            sortOrder: "desc",
            groupBy: "none",
            page: 1,
          }}
          className="btn btn-primary btn-sm"
        >
          返回订单列表
        </Link>
      </main>
    );
  }

  return (
    <ClientOnly>
      <main className="size-full overflow-y-auto">
        <div className="px-4 pt-4">
          <DashBackButton to="/dash/orders" />
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pb-20">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold">批量结算</h1>
            <span className="badge badge-warning">{ids.length} 个订单</span>
          </div>

          <OrderCardsGrid
            previews={data.previews}
            cancelIds={cancelIds}
            onToggle={toggleCancelId}
          />

          <CombinedPriceSection
            activeSettleIds={activeSettleIds}
            previewMap={previewMap}
            totalPrice={totalPrice}
          />

          <MultiOrderTimeline previews={data.previews} />

          <GroupedMembershipSection
            previews={data.previews}
            activeSettleIds={activeSettleIds}
            previewMap={previewMap}
            isAllEnded={allEnded}
            deductEnabled={deductEnabled}
            onDeductToggle={setDeductEnabled}
          />

          <BatchPricingPlansSection previews={data.previews} />
        </div>

        {!allEnded && (
          <div className="fixed bottom-0 right-0 left-0 lg:left-20 bg-base-100 border-t border-base-200 px-4 py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 z-40">
            {deductEnabled && totalDeductAmount > 0 && (
              <span className="text-xs text-base-content/60 sm:mr-auto text-center sm:text-left">
                储值扣费 {formatPrice(totalDeductAmount)}
                {remainingAfterDeduct > 0 &&
                  ` · 剩余 ${formatPrice(remainingAfterDeduct)}`}
              </span>
            )}
            <div className="flex items-center justify-end gap-2">
              {cancelIds.size > 0 && (
                <button
                  type="button"
                  className="btn btn-sm gap-2"
                  onClick={() => void handleCancelSettlement()}
                  disabled={settling}
                >
                  <XCircleIcon className="size-4" />
                  取消选中 ({cancelIds.size})
                </button>
              )}
              <button
                type="button"
                className="btn btn-sm gap-2"
                onClick={() => void handleCancelAll()}
                disabled={settling}
              >
                全部取消
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary gap-2"
                onClick={() => void handleSettle()}
                disabled={settling || activeSettleIds.length === 0}
              >
                <CheckCircleIcon className="size-4" />
                {settling
                  ? "结算中..."
                  : `确认结算 (${activeSettleIds.length})`}
              </button>
            </div>
          </div>
        )}
      </main>
    </ClientOnly>
  );
}

function OrderCardsGrid({
  previews,
  cancelIds,
  onToggle,
}: {
  previews: SettlementPreview[];
  cancelIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      {previews.map((preview) => {
        const cancelled = cancelIds.has(preview.order.id);
        return (
          <div
            key={preview.order.id}
            className={clsx(
              "bg-base-200 rounded-xl p-4 transition-opacity",
              cancelled && "opacity-50",
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={!cancelled}
                  onChange={() => onToggle(preview.order.id)}
                />
                <span className="font-semibold">
                  {preview.order.table?.name ?? "—"}
                </span>
              </div>
              <span className="badge badge-sm badge-ghost">
                {preview.order.status === "ended" ? "已结束" : "待结算"}
              </span>
            </div>
            <div className="text-sm text-base-content/70 space-y-1">
              <div>用户: {preview.order.nickname}</div>
              <div>
                时长: {formatMinutes(preview.billableMinutes)} (暂停{" "}
                {formatMinutes(preview.pausedMinutes)})
              </div>
              <div className="font-mono font-bold text-primary text-lg">
                {formatPrice(preview.finalPrice)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CombinedPriceSection({
  activeSettleIds,
  previewMap,
  totalPrice,
}: {
  activeSettleIds: string[];
  previewMap: Map<string, SettlementPreview>;
  totalPrice: number;
}) {
  return (
    <div className="bg-base-200 rounded-xl p-5 mb-4">
      <h3 className="font-semibold text-sm text-base-content/60 mb-3 flex items-center gap-1.5">
        <CurrencyDollarIcon className="size-4" />
        费用汇总
      </h3>
      <div className="flex flex-col gap-3">
        {activeSettleIds.map((id) => {
          const p = previewMap.get(id);
          if (!p) return null;
          return (
            <div key={id} className="flex items-center justify-between text-sm">
              <span className="text-base-content/70">
                {p.order.table?.name ?? "—"} · {p.order.nickname}
              </span>
              <span className="font-mono">{formatPrice(p.finalPrice)}</span>
            </div>
          );
        })}
        <div className="border-t border-base-content/10 pt-2 flex items-center justify-between">
          <span className="font-semibold">总计</span>
          <span className="font-mono text-2xl font-bold text-primary">
            {formatPrice(totalPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}

function MultiOrderTimeline({ previews }: { previews: SettlementPreview[] }) {
  const globalStart = Math.min(...previews.map((p) => p.order.start_at));
  const globalEnd = Math.max(
    ...previews.map((p) => p.order.end_at ?? Date.now()),
  );
  const totalDuration = Math.max(1, globalEnd - globalStart);

  return (
    <div className="bg-base-200 rounded-xl p-5 mb-4">
      <h3 className="font-semibold text-sm text-base-content/60 mb-3 flex items-center gap-1.5">
        <ClockIcon className="size-4" />
        时间轴
      </h3>
      <div className="flex flex-col gap-3">
        {previews.map((preview) => {
          const orderStart = preview.order.start_at;
          const orderEnd = preview.order.end_at ?? Date.now();
          const leftPct = ((orderStart - globalStart) / totalDuration) * 100;
          const widthPct = ((orderEnd - orderStart) / totalDuration) * 100;

          const segments = buildSegments(
            orderStart,
            orderEnd,
            preview.pauseLogs,
          );

          return (
            <div key={preview.order.id}>
              <div className="text-xs text-base-content/60 mb-1 flex items-center gap-2">
                <span className="font-medium">
                  {preview.order.table?.name ?? "—"}
                </span>
                <span>{preview.order.nickname}</span>
              </div>
              <div className="relative h-5 bg-base-300 rounded-lg overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 flex rounded-md overflow-hidden"
                  style={{
                    left: `${leftPct}%`,
                    width: `${Math.max(widthPct, 1)}%`,
                  }}
                >
                  {segments.map((seg) => {
                    const segPct =
                      ((seg.end - seg.start) / (orderEnd - orderStart)) * 100;
                    const durMs = seg.end - seg.start;
                    const durMin = Math.floor(durMs / 60000);
                    const durSec = Math.floor((durMs % 60000) / 1000);
                    const tooltip =
                      seg.type === "active"
                        ? `运行 ${durMin}分${durSec}秒`
                        : `暂停 ${durMin}分${durSec}秒`;
                    return (
                      <div
                        key={`${seg.type}-${seg.start}`}
                        className="tooltip tooltip-bottom"
                        data-tip={tooltip}
                        style={{
                          width: `${Math.max(segPct, 1)}%`,
                          backgroundColor:
                            seg.type === "active" ? "#22c55e" : "#9ca3af",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-base-content/50">
        <span>{formatShortTime(globalStart)}</span>
        <span>{formatShortTime(globalEnd)}</span>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div
            className="size-3 rounded-sm"
            style={{ backgroundColor: "#22c55e" }}
          />
          <span>运行中</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="size-3 rounded-sm"
            style={{ backgroundColor: "#9ca3af" }}
          />
          <span>暂停</span>
        </div>
      </div>
    </div>
  );
}

function GroupedMembershipSection({
  previews,
  activeSettleIds,
  previewMap,
  isAllEnded,
  deductEnabled,
  onDeductToggle,
}: {
  previews: SettlementPreview[];
  activeSettleIds: string[];
  previewMap: Map<string, SettlementPreview>;
  isAllEnded: boolean;
  deductEnabled: boolean;
  onDeductToggle: (v: boolean) => void;
}) {
  const userGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        nickname: string;
        uid: string | null;
        membership: SettlementPreview["membership"];
        totalPrice: number;
      }
    >();
    for (const id of activeSettleIds) {
      const p = previewMap.get(id);
      if (!p) continue;
      const key = p.order.uid ?? p.order.nickname;
      const existing = map.get(key);
      if (existing) {
        existing.totalPrice += p.finalPrice;
      } else {
        map.set(key, {
          nickname: p.order.nickname,
          uid: p.order.uid ?? null,
          membership: p.membership,
          totalPrice: p.finalPrice,
        });
      }
    }
    return Array.from(map.values());
  }, [activeSettleIds, previewMap]);

  const hasAnyBalance = userGroups.some(
    (g) => g.membership.storedValueBalance > 0,
  );

  return (
    <div className="bg-base-200 rounded-xl p-5 mb-4">
      <h3 className="font-semibold text-sm text-base-content/60 mb-3 flex items-center gap-1.5">
        <UserIcon className="size-4" />
        会员信息
      </h3>
      <div className="flex flex-col gap-4">
        {userGroups.map((group) => {
          const balance = group.membership.storedValueBalance;
          const deductAmount = Math.min(balance, group.totalPrice);
          const remaining = group.totalPrice - deductAmount;

          return (
            <div key={group.uid ?? group.nickname}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">{group.nickname}</span>
                {group.uid && (
                  <span className="text-xs text-base-content/40">
                    {group.uid}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/70">时间卡</span>
                  <div className="flex items-center gap-2">
                    {group.membership.hasTimePlan ? (
                      <>
                        <span
                          className={clsx(
                            "badge badge-sm",
                            group.membership.timePlanActive
                              ? "badge-success"
                              : "badge-ghost",
                          )}
                        >
                          {group.membership.timePlanActive ? "有效" : "已过期"}
                        </span>
                        {group.membership.timePlanType && (
                          <span className="badge badge-sm badge-outline">
                            {group.membership.timePlanType === "yearly"
                              ? "LTS"
                              : group.membership.timePlanType === "monthly_cc"
                                ? "CC"
                                : "标准"}
                          </span>
                        )}
                        {group.membership.timePlanEndDate && (
                          <span className="text-xs text-base-content/50">
                            至{" "}
                            {dayjs(group.membership.timePlanEndDate).format(
                              "YYYY/MM/DD",
                            )}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-base-content/40">
                        无时间卡
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-base-content/70">
                    储值卡余额
                  </span>
                  <span className="font-mono font-bold text-accent">
                    {formatPrice(balance)}
                  </span>
                </div>
                {deductEnabled && balance > 0 && (
                  <div className="text-xs text-base-content/50">
                    可扣 {formatPrice(deductAmount)}
                    {remaining > 0 &&
                      ` · 剩余 ${formatPrice(remaining)} 需另付`}
                  </div>
                )}
              </div>
              {userGroups.length > 1 && (
                <div className="border-b border-base-content/5 mt-3" />
              )}
            </div>
          );
        })}
      </div>

      {!isAllEnded && hasAnyBalance && (
        <div className="border-t border-base-content/10 pt-3 mt-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium">使用储值卡扣费</span>
            <input
              type="checkbox"
              className="toggle toggle-accent"
              checked={deductEnabled}
              onChange={(e) => onDeductToggle(e.target.checked)}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function BatchPricingPlansSection({
  previews,
}: {
  previews: SettlementPreview[];
}) {
  const allPlans = useMemo(() => {
    const seen = new Set<string>();
    const result: SettlementPreview["pricingPlans"] = [];
    for (const p of previews) {
      for (const plan of p.pricingPlans) {
        if (!seen.has(plan.name)) {
          seen.add(plan.name);
          result.push(plan);
        }
      }
    }
    return result;
  }, [previews]);

  if (allPlans.length === 0) return null;

  return (
    <div className="bg-base-200 rounded-xl p-5 mb-4">
      <h3 className="font-semibold text-sm text-base-content/60 mb-3 flex items-center gap-1.5">
        <ReceiptIcon className="size-4" />
        参与结算的计划
      </h3>
      <div className="flex flex-col gap-2">
        {allPlans.map((plan) => (
          <div
            key={plan.name}
            className={clsx(
              "flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 rounded-lg px-3 py-2 text-sm",
              plan.matched
                ? "bg-primary/10 border border-primary/20"
                : "bg-base-100",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{plan.name}</span>
              <span className="badge badge-xs badge-ghost">
                {plan.billingType === "hourly" ? "按时" : "固定"}
              </span>
              {plan.matched && (
                <span className="badge badge-xs badge-primary">已匹配</span>
              )}
            </div>
            <span className="font-mono">
              {formatPrice(plan.price)}
              {plan.billingType === "hourly" && "/小时"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
