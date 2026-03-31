import {
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PauseIcon,
  PlayIcon,
  ReceiptIcon,
  StopIcon,
  UserIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  ClientOnly,
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import dayjs from "@/shared/utils/dayjs-config";
import { formatPrice } from "@/shared/utils/pricing";
import { trpcClientDash } from "@/shared/utils/trpc";

export const Route = createFileRoute("/dash/orders_/$id/settle")({
  component: OrderSettlePage,
});

type SettlementPreview = Awaited<
  ReturnType<typeof trpcClientDash.ordersManagement.getSettlementPreview.query>
>;

function formatTime(val: number | null | undefined): string {
  if (!val) return "—";
  const d = dayjs.tz(val, "Asia/Shanghai");
  return d.isValid() ? d.format("YYYY/MM/DD HH:mm:ss") : "—";
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}小时${m}分钟`;
  return `${m}分钟`;
}

function OrderSettlePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const msg = useMsg();

  const [data, setData] = useState<SettlementPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [deductEnabled, setDeductEnabled] = useState(false);
  const [settling, setSettling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result =
        await trpcClientDash.ordersManagement.getSettlementPreview.query({
          id,
        });
      setData(result);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [id, msg]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSettle = async () => {
    setSettling(true);
    try {
      await trpcClientDash.ordersManagement.settleOrder.mutate({
        id,
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

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-base-content/60">订单不存在</p>
        <Link to="/dash/orders" className="btn btn-primary btn-sm">
          返回订单列表
        </Link>
      </main>
    );
  }

  const isEnded = data.order.status === "ended";
  const balance = data.membership.storedValueBalance;
  const price = data.finalPrice;
  const deductAmount = Math.min(balance, price);
  const remainingAfterDeduct = price - deductAmount;

  return (
    <ClientOnly>
      <main className="size-full overflow-y-auto">
        <div className="px-4 pt-4">
          <DashBackButton to="/dash/orders" />
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pb-20">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold">
              {isEnded ? "订单详情" : "订单结算"}
            </h1>
            {isEnded ? (
              <span className="badge badge-ghost">已结束</span>
            ) : (
              <span className="badge badge-warning">待结算</span>
            )}
          </div>

          <OrderInfoSection order={data.order} />

          <PriceSection
            totalMinutes={data.totalMinutes}
            pausedMinutes={data.pausedMinutes}
            billableMinutes={data.billableMinutes}
            finalPrice={data.finalPrice}
            breakdown={data.priceBreakdown}
          />

          <MembershipSection
            membership={data.membership}
            finalPrice={data.finalPrice}
            isEnded={isEnded}
            deductEnabled={deductEnabled}
            onDeductToggle={setDeductEnabled}
          />

          <PauseTimelineSection
            startAt={data.order.start_at}
            endAt={data.order.end_at ?? Date.now()}
            pauseLogs={data.pauseLogs}
          />

          <RecentOrdersSection
            orders={data.recentOrders}
            currentOrderId={data.order.id}
          />

          <PricingPlansSection plans={data.pricingPlans} />
        </div>

        {!isEnded && (
          <div className="fixed bottom-0 right-0 left-0 lg:left-20 bg-base-100 border-t border-base-200 px-4 py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 z-40">
            {deductEnabled && deductAmount > 0 && (
              <span className="text-xs text-base-content/60 sm:mr-auto text-center sm:text-left">
                储值扣费 {formatPrice(deductAmount)}
                {remainingAfterDeduct > 0 &&
                  ` · 剩余 ${formatPrice(remainingAfterDeduct)}`}
              </span>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn btn-sm gap-2"
                onClick={() => navigate({ to: "/dash/orders" })}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary gap-2"
                onClick={() => void handleSettle()}
                disabled={settling}
              >
                <CheckCircleIcon className="size-4" />
                {settling ? "结算中..." : "确认结算"}
              </button>
            </div>
          </div>
        )}
      </main>
    </ClientOnly>
  );
}

function OrderInfoSection({ order }: { order: SettlementPreview["order"] }) {
  return (
    <div className="bg-base-200 rounded-xl p-5 mb-4">
      <h3 className="font-semibold text-sm text-base-content/60 mb-3 flex items-center gap-1.5">
        <ReceiptIcon className="size-4" />
        订单信息
      </h3>
      <div className="flex flex-col gap-2.5 text-sm">
        <div className="flex flex-col">
          <span className="text-base-content/50 text-xs">订单号</span>
          <p className="font-mono break-all">{order.id}</p>
        </div>
        <div className="flex flex-col">
          <span className="text-base-content/50 text-xs">用户</span>
          <p className="break-all">
            {order.nickname}
            {order.uid && (
              <span className="text-xs text-base-content/40 ml-1 break-all">
                {order.uid}
              </span>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="flex flex-col">
            <span className="text-base-content/50 text-xs">桌台</span>
            <p className="font-semibold">{order.table?.name ?? "—"}</p>
          </div>
          <div className="flex flex-col">
            <span className="text-base-content/50 text-xs">开始时间</span>
            <p>{formatTime(order.start_at)}</p>
          </div>
          <div className="flex flex-col">
            <span className="text-base-content/50 text-xs">结束时间</span>
            <p>{order.end_at ? formatTime(order.end_at) : "进行中"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceSection({
  totalMinutes,
  pausedMinutes,
  billableMinutes,
  finalPrice,
  breakdown,
}: {
  totalMinutes: number;
  pausedMinutes: number;
  billableMinutes: number;
  finalPrice: number;
  breakdown: SettlementPreview["priceBreakdown"];
}) {
  return (
    <div className="bg-base-200 rounded-xl p-5 mb-4">
      <h3 className="font-semibold text-sm text-base-content/60 mb-3 flex items-center gap-1.5">
        <CurrencyDollarIcon className="size-4" />
        费用信息
      </h3>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex gap-6 text-sm flex-wrap">
          <div>
            <span className="text-base-content/50">总时长</span>
            <p>{formatMinutes(totalMinutes)}</p>
          </div>
          <div>
            <span className="text-base-content/50">暂停</span>
            <p>{formatMinutes(pausedMinutes)}</p>
          </div>
          <div>
            <span className="text-base-content/50">计费</span>
            <p className="font-semibold">{formatMinutes(billableMinutes)}</p>
          </div>
        </div>
        <div>
          <span className="text-base-content/50 text-sm">费用</span>
          <p className="font-mono text-3xl font-bold text-primary">
            {formatPrice(finalPrice)}
          </p>
        </div>
      </div>
      {breakdown && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="badge badge-sm badge-outline">
            {breakdown.planName}
          </span>
          <span className="badge badge-sm badge-ghost">
            {breakdown.billingType === "hourly" ? "按时计费" : "固定计费"}
          </span>
          {breakdown.capApplied && (
            <span className="badge badge-sm badge-warning">已触发封顶</span>
          )}
        </div>
      )}
    </div>
  );
}

function MembershipSection({
  membership,
  finalPrice,
  isEnded,
  deductEnabled,
  onDeductToggle,
}: {
  membership: SettlementPreview["membership"];
  finalPrice: number;
  isEnded: boolean;
  deductEnabled: boolean;
  onDeductToggle: (v: boolean) => void;
}) {
  const balance = membership.storedValueBalance;
  const deductAmount = Math.min(balance, finalPrice);
  const remaining = finalPrice - deductAmount;

  return (
    <div className="bg-base-200 rounded-xl p-5 mb-4">
      <h3 className="font-semibold text-sm text-base-content/60 mb-3 flex items-center gap-1.5">
        <UserIcon className="size-4" />
        会员信息
      </h3>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-base-content/70">时间卡</span>
          <div className="flex items-center gap-2">
            {membership.hasTimePlan ? (
              <>
                <span
                  className={clsx(
                    "badge badge-sm",
                    membership.timePlanActive ? "badge-success" : "badge-ghost",
                  )}
                >
                  {membership.timePlanActive ? "有效" : "已过期"}
                </span>
                {membership.timePlanType && (
                  <span className="badge badge-sm badge-outline">
                    {membership.timePlanType === "yearly"
                      ? "LTS"
                      : membership.timePlanType === "monthly_cc"
                        ? "CC"
                        : "标准"}
                  </span>
                )}
                {membership.timePlanEndDate && (
                  <span className="text-xs text-base-content/50">
                    至 {dayjs(membership.timePlanEndDate).format("YYYY/MM/DD")}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-base-content/40">无时间卡</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-base-content/70">储值卡余额</span>
          <span className="font-mono font-bold text-accent">
            {formatPrice(balance)}
          </span>
        </div>

        {!isEnded && finalPrice > 0 && (
          <div className="border-t border-base-content/10 pt-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {balance <= 0
                    ? "储值卡余额不足"
                    : balance >= finalPrice
                      ? `储值卡全额扣费 ${formatPrice(deductAmount)}`
                      : `储值卡扣费 ${formatPrice(deductAmount)}`}
                </span>
                {balance > 0 && balance < finalPrice && (
                  <span className="text-xs text-base-content/50">
                    剩余 {formatPrice(remaining)} 需另付
                  </span>
                )}
              </div>
              <input
                type="checkbox"
                className="toggle toggle-accent"
                checked={deductEnabled}
                onChange={(e) => onDeductToggle(e.target.checked)}
                disabled={balance <= 0}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function PauseTimelineSection({
  startAt,
  endAt,
  pauseLogs,
}: {
  startAt: number;
  endAt: number;
  pauseLogs: Array<{ pausedAt: number; resumedAt: number | null }>;
}) {
  return (
    <div className="bg-base-200 rounded-xl p-5 mb-4">
      <h3 className="font-semibold text-sm text-base-content/60 mb-3 flex items-center gap-1.5">
        <ClockIcon className="size-4" />
        暂停时间记录
      </h3>
      <PauseTimelineBar startAt={startAt} endAt={endAt} pauseLogs={pauseLogs} />
    </div>
  );
}

function PauseTimelineBar({
  startAt,
  endAt,
  pauseLogs,
}: {
  startAt: number;
  endAt: number;
  pauseLogs: Array<{ pausedAt: number; resumedAt: number | null }>;
}) {
  const totalDuration = Math.max(1, endAt - startAt);
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

    if (pStart > cursor) {
      segments.push({ type: "active", start: cursor, end: pStart });
    }
    if (pEnd > pStart) {
      segments.push({ type: "paused", start: pStart, end: pEnd });
    }
    cursor = Math.max(cursor, pEnd);
  }

  if (cursor < endAt) {
    segments.push({ type: "active", start: cursor, end: endAt });
  }

  if (segments.length === 0) {
    segments.push({ type: "active", start: startAt, end: endAt });
  }

  return (
    <div>
      <div className="flex h-6 rounded-lg overflow-hidden">
        {segments.map((seg, i) => {
          const pct = ((seg.end - seg.start) / totalDuration) * 100;
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
              className={clsx(
                "tooltip tooltip-bottom",
                i === 0 && "rounded-l-lg",
                i === segments.length - 1 && "rounded-r-lg",
              )}
              data-tip={tooltip}
              style={{
                width: `${Math.max(pct, 0.5)}%`,
                backgroundColor: seg.type === "active" ? "#22c55e" : "#9ca3af",
              }}
            />
          );
        })}
      </div>
      <div className="flex flex-col sm:flex-row justify-between mt-1.5 text-xs text-base-content/50 gap-0.5">
        <span>{formatTime(startAt)}</span>
        <span>{formatTime(endAt)}</span>
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

function RecentOrdersSection({
  orders,
  currentOrderId,
}: {
  orders: SettlementPreview["recentOrders"];
  currentOrderId: string;
}) {
  if (orders.length === 0) return null;

  return (
    <div className="bg-base-200 rounded-xl p-5 mb-4">
      <h3 className="font-semibold text-sm text-base-content/60 mb-3">
        最近订单
      </h3>
      {/* Mobile: card layout */}
      <div className="flex flex-col gap-2 sm:hidden">
        {orders.map((order) => (
          <div
            key={order.id}
            className={clsx(
              "rounded-lg px-3 py-2.5 text-sm",
              order.id === currentOrderId
                ? "bg-primary/10 border border-primary/20"
                : "bg-base-100",
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-mono text-xs break-all">
                {order.id.slice(0, 8)}
                {order.id === currentOrderId && (
                  <span className="text-xs text-primary ml-1">当前</span>
                )}
              </span>
              {order.status === "active" ? (
                <span className="badge badge-success badge-xs shrink-0">
                  进行中
                </span>
              ) : order.status === "paused" ? (
                <span className="badge badge-neutral badge-xs shrink-0">
                  已暂停
                </span>
              ) : (
                <span className="badge badge-ghost badge-xs shrink-0">
                  已结束
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-base-content/60">
              <span>{order.tableName}</span>
              <span>{formatTime(order.startAt)}</span>
            </div>
            {order.finalPrice != null && (
              <div className="text-right font-mono text-sm font-semibold mt-1">
                {formatPrice(order.finalPrice)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="table table-sm">
          <thead>
            <tr>
              <td>订单号</td>
              <td>桌台</td>
              <td>状态</td>
              <td>开始时间</td>
              <td>费用</td>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className={clsx(order.id === currentOrderId && "bg-primary/5")}
              >
                <td className="font-mono">
                  {order.id.slice(0, 5)}
                  {order.id === currentOrderId && (
                    <span className="text-xs text-primary ml-1">当前</span>
                  )}
                </td>
                <td>{order.tableName}</td>
                <td>
                  {order.status === "active" ? (
                    <span className="badge badge-success badge-xs">进行中</span>
                  ) : order.status === "paused" ? (
                    <span className="badge badge-neutral badge-xs">已暂停</span>
                  ) : (
                    <span className="badge badge-ghost badge-xs">已结束</span>
                  )}
                </td>
                <td className="whitespace-nowrap text-xs">
                  {formatTime(order.startAt)}
                </td>
                <td className="font-mono">
                  {order.finalPrice != null
                    ? formatPrice(order.finalPrice)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PricingPlansSection({
  plans,
}: {
  plans: SettlementPreview["pricingPlans"];
}) {
  if (plans.length === 0) return null;

  return (
    <div className="bg-base-200 rounded-xl p-5 mb-4">
      <h3 className="font-semibold text-sm text-base-content/60 mb-3">
        参与结算的计划
      </h3>
      <div className="flex flex-col gap-2">
        {plans.map((plan) => (
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
