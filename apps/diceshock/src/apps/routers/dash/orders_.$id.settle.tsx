import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  HouseIcon,
  LinkIcon,
  PauseIcon,
  ReceiptIcon,
  TableIcon,
  UserIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  ClientOnly,
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import type { EChartsOption } from "echarts";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";

import { useMsg } from "@/client/components/diceshock/Msg";
import { useTranslation } from "@/client/hooks/useTranslation";
import {
  useSettlementPreviewQuery,
  useSettleOrderMutation,
  useResumeOrderMutation,
  usePublishedPricingQuery,
} from "@/client/graphql/__generated__";
import type { SettlementPreviewQuery } from "@/client/graphql/__generated__/operations";
import dayjs from "@/shared/utils/dayjs-config";
import { calculatePrice, formatPrice, formatDualPrice, formatPoints, type SnapshotData } from "@/shared/utils/pricing";

const ReactECharts = lazy(() => import("echarts-for-react"));

export const Route = createFileRoute("/dash/orders_/$id/settle")({
  component: OrderDetailPage,
});

type Preview = SettlementPreviewQuery["settlementPreview"];

// --- Utility ---

const HALF_HOUR_MS = 30 * 60 * 1000;

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
}

const PAYMENT_PRESETS = [
  { value: "stored_value", label: "储值卡" },
  { value: "points", label: "积分" },
  { value: "external", label: "外部收款" },
  { value: "custom", label: "自定义" },
] as const;

// --- Main Component ---

function OrderDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const msg = useMsg();
  const { t } = useTranslation();

  const { data, loading, error, refetch } = useSettlementPreviewQuery({
    variables: { id },
    fetchPolicy: "network-only",
  });
  const [settleOrder] = useSettleOrderMutation();
  const [resumeOrder] = useResumeOrderMutation();
  const { data: pricingData } = usePublishedPricingQuery();

  const pricingSnapshot = useMemo<SnapshotData | null>(() => {
    const d = pricingData?.publishedPricing?.data;
    if (!d) return null;
    try {
      return typeof d === "string" ? JSON.parse(d) : d;
    } catch {
      return null;
    }
  }, [pricingData]);

  // Settlement state
  const [paymentPreset, setPaymentPreset] = useState<string>("external");
  const [deductAmount, setDeductAmount] = useState(0);
  const [deductPoints, setDeductPoints] = useState(0);
  const [pointsChange, setPointsChange] = useState(0);
  const [note, setNote] = useState("");
  const [settling, setSettling] = useState(false);

  const preview = data?.settlementPreview;
  const isSettled = preview?.order.status === "SETTLED";

  const handleSettle = useCallback(async () => {
    if (!preview || settling) return;
    setSettling(true);
    try {
      const effectiveDeductAmount = deductAmount;
      const effectiveDeductPoints = deductPoints === 0 ? effectiveDeductAmount === 0 ? 0 : deductPoints : deductPoints;
      await settleOrder({
        variables: {
          input: {
            id,
            deductAmount: effectiveDeductAmount,
            deductFromStoredValue: paymentPreset === "stored_value",
            deductPoints: effectiveDeductPoints,
            pointsChange: pointsChange || 0,
            note: note || null,
          },
        },
      });
      msg.success("结算成功");
      void refetch();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "结算失败");
    } finally {
      setSettling(false);
    }
  }, [preview, settling, id, deductAmount, deductPoints, pointsChange, note, paymentPreset, settleOrder, msg, refetch]);

  const handleResume = useCallback(async () => {
    try {
      await resumeOrder({ variables: { id } });
      msg.success("已恢复");
      void refetch();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "恢复失败");
    }
  }, [id, resumeOrder, msg, refetch]);

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  if (error || !preview) {
    return (
      <main className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-base-content/60">{error?.message ?? "订单未找到"}</p>
        <Link to="/dash/orders" search={{ q: "", sortBy: "start_at", sortOrder: "desc", groupBy: "none", page: "1" }} className="btn btn-primary btn-sm">
          返回订单列表
        </Link>
      </main>
    );
  }

  return (
    <ClientOnly>
      <main className="size-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ReceiptIcon className="size-6" />
                订单详情
              </h1>
              <p className="text-sm text-base-content/50 mt-1">
                {preview.order.id.slice(0, 8)}…
              </p>
            </div>
            <div className="flex gap-2">
              {isSettled && (
                <span className="badge badge-success gap-1">
                  <CheckCircleIcon className="size-3" /> 已结算
                </span>
              )}
              {preview.order.status === "PAUSED" && (
                <span className="badge badge-warning gap-1">
                  <PauseIcon className="size-3" /> 暂停中
                </span>
              )}
              {preview.order.status === "ACTIVE" && (
                <span className="badge badge-info gap-1">
                  <ClockIcon className="size-3" /> 进行中
                </span>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoCard icon={<UserIcon className="size-4" />} label="用户" value={preview.order.nickname ?? preview.order.uid ?? "匿名"} />
            <InfoCard icon={<TableIcon className="size-4" />} label="桌台" value={preview.order.table?.name ?? "未知"} />
            <InfoCard icon={<CalendarIcon className="size-4" />} label="开始时间" value={dayjs(preview.order.startAt).format("MM/DD HH:mm")} />
            <InfoCard icon={<ClockIcon className="size-4" />} label="总时长" value={formatMinutes(preview.totalMinutes)} />
          </div>

          {/* Time breakdown */}
          <div className="card bg-base-200">
            <div className="card-body p-4">
              <h3 className="font-semibold text-sm mb-3">时间明细</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold font-mono">{preview.totalMinutes}</div>
                  <div className="text-xs text-base-content/50">总分钟</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-warning">{preview.pausedMinutes}</div>
                  <div className="text-xs text-base-content/50">暂停分钟</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-success">{preview.billableMinutes}</div>
                  <div className="text-xs text-base-content/50">计费分钟</div>
                </div>
              </div>
            </div>
          </div>

          {/* Price chart */}
          <PriceChart preview={preview} pricingSnapshot={pricingSnapshot} />

          {/* Pricing breakdown */}
          <PricingBreakdown preview={preview} pricingSnapshot={pricingSnapshot} />

          {/* Pause logs */}
          {preview.pauseLogs.length > 0 && <PauseLogs logs={preview.pauseLogs} />}

          {/* Membership info */}
          <MembershipInfo membership={preview.membership} />

          {/* Pricing plans */}
          <PricingPlans plans={preview.pricingPlans} />

          {/* Recent orders */}
          {preview.recentOrders.length > 0 && <RecentOrders orders={preview.recentOrders} />}

          {/* Settlement actions */}
          {!isSettled && (
            <SettlementActions
              preview={preview}
              pricingSnapshot={pricingSnapshot}
              paymentPreset={paymentPreset}
              setPaymentPreset={setPaymentPreset}
              deductAmount={deductAmount}
              setDeductAmount={setDeductAmount}
              deductPoints={deductPoints}
              setDeductPoints={setDeductPoints}
              pointsChange={pointsChange}
              setPointsChange={setPointsChange}
              note={note}
              setNote={setNote}
              settling={settling}
              onSettle={() => void handleSettle()}
              onResume={() => void handleResume()}
            />
          )}

          {/* Settled summary */}
          {isSettled && (
            <div className="card bg-success/10 border border-success/30">
              <div className="card-body p-4 text-center">
                <CheckCircleIcon className="size-10 text-success mx-auto" />
                <p className="font-bold text-lg mt-2">已结算</p>
                <p className="text-sm text-base-content/60">
                  金额: {formatPrice(preview.order.finalPrice ?? preview.finalPrice)} ·
                  积分: {formatPoints(preview.order.finalPoints ?? preview.finalPoints)}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2 justify-center pb-8">
            <Link to="/dash/orders" search={{ q: "", sortBy: "start_at", sortOrder: "desc", groupBy: "none", page: "1" }} className="btn btn-ghost btn-sm gap-1">
              <HouseIcon className="size-4" /> 返回列表
            </Link>
            {preview.order.userId && (
              <Link to="/dash/users/$id" params={{ id: preview.order.userId }} search={{ tab: "basic" }} className="btn btn-ghost btn-sm gap-1">
                <UserIcon className="size-4" /> 用户详情
              </Link>
            )}
          </div>
        </div>
      </main>
    </ClientOnly>
  );
}

// --- Sub-components ---

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card bg-base-200 p-3">
      <div className="flex items-center gap-1.5 text-base-content/50 text-xs mb-1">
        {icon} {label}
      </div>
      <div className="font-semibold text-sm truncate">{value}</div>
    </div>
  );
}

function PriceChart({ preview, pricingSnapshot }: { preview: Preview; pricingSnapshot: SnapshotData | null }) {
  const chartOption = useMemo<EChartsOption>(() => {
    const startAt = new Date(preview.order.startAt).getTime();
    const endAt = preview.order.endAt ? new Date(preview.order.endAt).getTime() : Date.now();
    const duration = endAt - startAt;
    const intervals = Math.min(48, Math.max(1, Math.ceil(duration / HALF_HOUR_MS)));
    const scope = preview.order.table?.scope ?? "boardgame";

    const pauseLogs = preview.pauseLogs.map((l) => ({
      pausedAt: new Date(l.pausedAt).getTime(),
      resumedAt: l.resumedAt ? new Date(l.resumedAt).getTime() : null,
    }));

    const labels: string[] = [];
    const cumulativeData: number[] = [];
    const incrementalData: number[] = [];
    let prevPrice = 0;

    for (let i = 1; i <= intervals; i++) {
      const t = startAt + i * HALF_HOUR_MS;
      const currentEnd = Math.min(t, endAt);
      labels.push(dayjs(currentEnd).format("HH:mm"));

      if (pricingSnapshot) {
        const result = calculatePrice(startAt, currentEnd, scope, pricingSnapshot, pauseLogs);
        const cumPrice = result?.finalPrice ?? 0;
        cumulativeData.push(cumPrice);
        incrementalData.push(cumPrice - prevPrice);
        prevPrice = cumPrice;
      } else {
        const pct = Math.min(1, (i * HALF_HOUR_MS) / Math.max(1, duration));
        const cum = Math.round(preview.finalPrice * pct);
        cumulativeData.push(cum);
        incrementalData.push(cum - prevPrice);
        prevPrice = cum;
      }
    }

    return {
      animation: true,
      grid: { top: 30, bottom: 30, left: 50, right: 20 },
      xAxis: { type: "category" as const, data: labels, axisLabel: { fontSize: 10 } },
      yAxis: { type: "value" as const, axisLabel: { formatter: (v: number) => `¥${(v / 100).toFixed(0)}` } },
      tooltip: { trigger: "axis" as const },
      series: [
        {
          name: "累计",
          type: "line" as const,
          data: cumulativeData,
          smooth: true,
          lineStyle: { width: 2, color: "#6366f1" },
          areaStyle: { color: "rgba(99, 102, 241, 0.08)" },
          symbol: "none",
        },
        {
          name: "增量",
          type: "bar" as const,
          data: incrementalData,
          itemStyle: { color: "rgba(99, 102, 241, 0.3)", borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [preview, pricingSnapshot]);

  return (
    <div className="card bg-base-200">
      <div className="card-body p-4">
        <h3 className="font-semibold text-sm mb-2">价格走势</h3>
        <Suspense fallback={<div className="h-52 flex items-center justify-center"><span className="loading loading-dots" /></div>}>
          <ReactECharts option={chartOption} style={{ height: 220 }} opts={{ renderer: "svg" }} />
        </Suspense>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-base-content/60">当前计费金额</span>
          <span className="text-2xl font-bold font-mono">{formatPrice(preview.finalPrice)}</span>
        </div>
        {preview.finalPoints > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-base-content/60">积分</span>
            <span className="text-lg font-semibold">{formatPoints(preview.finalPoints)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PricingBreakdown({ preview, pricingSnapshot }: { preview: Preview; pricingSnapshot: SnapshotData | null }) {
  const bd = preview.priceBreakdown;
  if (!bd) {
    return (
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <h3 className="font-semibold text-sm mb-2">计费明细</h3>
          <p className="text-sm text-base-content/50">
            {pricingSnapshot ? "无匹配计费计划" : "未配置计费计划"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200">
      <div className="card-body p-4">
        <h3 className="font-semibold text-sm mb-3">计费明细</h3>
        <div className="overflow-x-auto">
          <table className="table table-xs">
            <tbody>
              <tr><td className="text-base-content/60">计划</td><td className="font-semibold">{bd.planName}</td></tr>
              <tr><td className="text-base-content/60">类型</td><td>{bd.planType} · {bd.billingType}</td></tr>
              <tr><td className="text-base-content/60">单价</td><td>{formatPrice(bd.unitPrice)}/半小时</td></tr>
              {bd.unitPoints > 0 && <tr><td className="text-base-content/60">积分单价</td><td>{bd.unitPoints}点/半小时</td></tr>}
              <tr><td className="text-base-content/60">计费半小时数</td><td>{bd.billableHalfHours}</td></tr>
              <tr><td className="text-base-content/60">原始金额</td><td>{formatPrice(bd.rawPrice)}</td></tr>
              {bd.capApplied && <tr><td className="text-base-content/60">封顶</td><td className="text-warning">{bd.capType} → {formatPrice(bd.finalPrice)}</td></tr>}
              <tr className="font-bold"><td>最终金额</td><td>{formatPrice(bd.finalPrice)}</td></tr>
              {bd.finalPoints > 0 && <tr className="font-bold"><td>最终积分</td><td>{formatPoints(bd.finalPoints)}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PauseLogs({ logs }: { logs: Preview["pauseLogs"] }) {
  return (
    <div className="card bg-base-200">
      <div className="card-body p-4">
        <h3 className="font-semibold text-sm mb-3">暂停记录 ({logs.length})</h3>
        <div className="space-y-2">
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <PauseIcon className="size-3 text-warning" />
              <span>{dayjs(log.pausedAt).format("MM/DD HH:mm")}</span>
              <span className="text-base-content/40">→</span>
              <span>{log.resumedAt ? dayjs(log.resumedAt).format("HH:mm") : "进行中"}</span>
              {log.resumedAt && (
                <span className="text-xs text-base-content/40 ml-auto">
                  {Math.round((new Date(log.resumedAt).getTime() - new Date(log.pausedAt).getTime()) / 60000)}分钟
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MembershipInfo({ membership }: { membership: Preview["membership"] }) {
  return (
    <div className="card bg-base-200">
      <div className="card-body p-4">
        <h3 className="font-semibold text-sm mb-3">会员信息</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-base-content/50 text-xs">储值余额</div>
            <div className="font-mono font-semibold">{formatPrice(membership.storedValueBalance)}</div>
          </div>
          <div>
            <div className="text-base-content/50 text-xs">积分余额</div>
            <div className="font-mono font-semibold">{membership.pointsBalance}点</div>
          </div>
          <div>
            <div className="text-base-content/50 text-xs">时间计划</div>
            <div className="font-semibold">
              {membership.hasTimePlan ? (
                <span className={membership.timePlanActive ? "text-success" : "text-warning"}>
                  {membership.timePlanType ?? "有"} {membership.timePlanActive ? "(有效)" : "(过期)"}
                </span>
              ) : (
                <span className="text-base-content/40">无</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingPlans({ plans }: { plans: Preview["pricingPlans"] }) {
  if (plans.length === 0) return null;
  return (
    <div className="card bg-base-200">
      <div className="card-body p-4">
        <h3 className="font-semibold text-sm mb-3">可用计费计划</h3>
        <div className="space-y-2">
          {plans.map((plan, i) => (
            <div key={i} className={`flex items-center justify-between text-sm p-2 rounded-lg ${plan.matched ? "bg-primary/10 border border-primary/30" : "bg-base-100"}`}>
              <div className="flex items-center gap-2">
                {plan.matched && <CheckCircleIcon className="size-4 text-primary" />}
                <span className={plan.matched ? "font-semibold" : ""}>{plan.name}</span>
                <span className="text-xs text-base-content/40">{plan.planType} · {plan.billingType}</span>
              </div>
              <div className="font-mono text-sm">
                {formatPrice(plan.price)}
                {plan.points > 0 && <span className="text-xs ml-1">+{plan.points}pt</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecentOrders({ orders }: { orders: Preview["recentOrders"] }) {
  return (
    <div className="card bg-base-200">
      <div className="card-body p-4">
        <h3 className="font-semibold text-sm mb-3">近期订单</h3>
        <div className="overflow-x-auto">
          <table className="table table-xs">
            <thead>
              <tr>
                <th>桌台</th>
                <th>开始</th>
                <th>结束</th>
                <th>金额</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.tableName}</td>
                  <td>{dayjs(o.startAt).format("MM/DD HH:mm")}</td>
                  <td>{o.endAt ? dayjs(o.endAt).format("HH:mm") : "-"}</td>
                  <td className="font-mono">{formatPrice(o.finalPrice ?? 0)}</td>
                  <td>
                    <span className={`badge badge-xs ${o.status === "SETTLED" ? "badge-success" : o.status === "ACTIVE" ? "badge-info" : "badge-ghost"}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettlementActions({
  preview,
  pricingSnapshot,
  paymentPreset,
  setPaymentPreset,
  deductAmount,
  setDeductAmount,
  deductPoints,
  setDeductPoints,
  pointsChange,
  setPointsChange,
  note,
  setNote,
  settling,
  onSettle,
  onResume,
}: {
  preview: Preview;
  pricingSnapshot: SnapshotData | null;
  paymentPreset: string;
  setPaymentPreset: (v: string) => void;
  deductAmount: number;
  setDeductAmount: (v: number) => void;
  deductPoints: number;
  setDeductPoints: (v: number) => void;
  pointsChange: number;
  setPointsChange: (v: number) => void;
  note: string;
  setNote: (v: string) => void;
  settling: boolean;
  onSettle: () => void;
  onResume: () => void;
}) {
  const storedValueBalance = preview.membership.storedValueBalance;
  const pointsBalance = preview.membership.pointsBalance;

  return (
    <div className="card bg-base-200 border-2 border-primary/20">
      <div className="card-body p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <CurrencyDollarIcon className="size-5" /> 结算操作
        </h3>

        {/* Payment method */}
        <div>
          <label className="text-xs text-base-content/50 mb-1 block">支付方式</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`btn btn-xs ${paymentPreset === p.value ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setPaymentPreset(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stored value deduction */}
        {paymentPreset === "stored_value" && (
          <div>
            <label className="text-xs text-base-content/50 mb-1 block">
              储值扣除 (余额: {formatPrice(storedValueBalance)})
            </label>
            <input
              type="number"
              className="input input-sm input-bordered w-full"
              placeholder="扣除金额 (分)"
              value={deductAmount || ""}
              onChange={(e) => setDeductAmount(Number(e.target.value))}
            />
          </div>
        )}

        {/* Points deduction */}
        {paymentPreset === "points" && (
          <div>
            <label className="text-xs text-base-content/50 mb-1 block">
              积分扣除 (余额: {pointsBalance}点)
            </label>
            <input
              type="number"
              className="input input-sm input-bordered w-full"
              placeholder="扣除积分"
              value={deductPoints || ""}
              onChange={(e) => setDeductPoints(Number(e.target.value))}
            />
          </div>
        )}

        {/* Points bonus/penalty */}
        <div>
          <label className="text-xs text-base-content/50 mb-1 block">积分变动 (正=奖励, 负=扣除)</label>
          <input
            type="number"
            className="input input-sm input-bordered w-full"
            placeholder="0"
            value={pointsChange || ""}
            onChange={(e) => setPointsChange(Number(e.target.value))}
          />
        </div>

        {/* Note */}
        <div>
          <label className="text-xs text-base-content/50 mb-1 block">备注</label>
          <textarea
            className="textarea textarea-sm textarea-bordered w-full"
            placeholder="备注(可选)"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            className="btn btn-primary flex-1 gap-1"
            disabled={settling}
            onClick={onSettle}
          >
            {settling ? <span className="loading loading-spinner loading-xs" /> : <CheckCircleIcon className="size-4" />}
            确认结算
          </button>
          {preview.order.status === "PAUSED" && (
            <button type="button" className="btn btn-ghost gap-1" onClick={onResume}>
              <ClockIcon className="size-4" /> 恢复计时
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
