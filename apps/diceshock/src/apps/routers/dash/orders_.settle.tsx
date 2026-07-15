import {
  CheckCircleIcon,
  ClockIcon,
  HouseIcon,
  LinkIcon,
  ReceiptIcon,
  UserIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  ClientOnly,
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import type { EChartsOption } from "echarts";
import { Component, forwardRef, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { produce } from "immer";
import { z } from "zod/v4";
import type { ErrorInfo, ReactNode } from "react";

import { useMsg } from "@/client/components/diceshock/Msg";
import { useTranslation } from "@/client/hooks/useTranslation";
import {
  useBatchSettlementPreviewMutation,
  useSettlementPreviewQuery,
  useSettleOrderMutation,
  useResumeOrderMutation,
  usePublishedPricingQuery,
  useOrderStatusChangedSubscription,
} from "@/client/graphql/__generated__";
import type { SettlementPreviewQuery } from "@/client/graphql/__generated__/operations";
import dayjs from "@/shared/utils/dayjs-config";
import { calculatePrice, formatPrice, formatDualPrice, formatPoints, type SnapshotData } from "@/shared/utils/pricing";

const ReactECharts = lazy(() => import("echarts-for-react"));

export const Route = createFileRoute("/dash/orders_/settle")({
  component: SettlePageWithBoundary,
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search.ids;
    if (Array.isArray(raw)) return { ids: raw.filter(Boolean) as string[] };
    if (typeof raw === "string") {
      if (raw.startsWith("[")) {
        try { return { ids: JSON.parse(raw) as string[] }; } catch { return { ids: [] }; }
      }
      return { ids: raw.split(",").filter(Boolean) };
    }
    return { ids: [] };
  },
});

// --- Local Error Boundary (prevents crash from bubbling to DashError/500 page) ---

class SettleErrorBoundary extends Component<
  { children: ReactNode; fallback: (error: Error, reset: () => void) => ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[SettlePage crash]", error, info); }
  reset = () => this.setState({ error: null });
  render() {
    if (this.state.error) return this.props.fallback(this.state.error, this.reset);
    return this.props.children;
  }
}

function SettlePageWithBoundary() {
  const { ids } = Route.useSearch();
  const { t } = useTranslation();
  return (
    <SettleErrorBoundary
      fallback={(error, reset) => (
        <main className="size-full flex flex-col items-center justify-center gap-4 p-8">
          <p className="text-lg font-bold text-error">{t("dashLayout.errorTitle")}</p>
          <pre className="text-xs text-error/80 max-w-lg whitespace-pre-wrap break-all">{error.message}</pre>
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm btn-primary" onClick={reset}>{t("common.retry")}</button>
            <a href="/dash/orders" className="btn btn-sm btn-ghost">{t("dashOrders.backToList")}</a>
          </div>
        </main>
      )}
    >
      {ids.length === 1 ? <SingleOrderReceipt orderId={ids[0]} /> : <BatchSettlePage />}
    </SettleErrorBoundary>
  );
}

// === Single Order Receipt View (小票) ===

type SinglePreview = SettlementPreviewQuery["settlementPreview"];

function getSinglePaymentPresets(t: (key: string) => string) {
  return [
    { value: "external", label: t("dashSettle.paymentExternal") },
    { value: "stored_value", label: t("dashSettle.paymentStoredValue") },
    { value: "points", label: t("dashSettle.paymentPoints") },
  ] as const;
}

function SingleOrderReceipt({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const msg = useMsg();

  const { data, loading, error, refetch } = useSettlementPreviewQuery({
    variables: { id: orderId },
    fetchPolicy: "network-only",
  });
  const [settleOrder] = useSettleOrderMutation();
  const [resumeOrder] = useResumeOrderMutation();

  // Real-time sync: refetch when this order's status changes
  useOrderStatusChangedSubscription({
    variables: { orderId },
    onData: () => { void refetch(); },
  });


  // Settlement form state
  const settleFormSchema = useMemo(() => z.object({
    paymentPreset: z.enum(["stored_value", "points", "external"]),
    deductAmount: z.string().trim().max(20),
    deductPoints: z.string().trim().max(20),
    pointsChange: z.string().trim().max(20),
    note: z.string().trim().max(200),
  }), []);
  const [settleForm, setSettleForm] = useState({
    paymentPreset: "external" as "stored_value" | "points" | "external",
    deductAmount: "",
    deductPoints: "",
    pointsChange: "",
    note: "",
  });
  const updateSettleForm = useCallback((recipe: (draft: typeof settleForm) => void) => {
    setSettleForm(produce(recipe));
  }, []);
  const [settling, setSettling] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  const preview = data?.settlementPreview;
  const isSettled = preview?.order.status === "SETTLED";

  // Auto-select payment method and pre-fill amounts on load
  useEffect(() => {
    if (!preview || formInitialized || isSettled) return;
    const svBal = preview.membership.storedValueBalance;
    const ptsBal = preview.membership.pointsBalance;
    const price = preview.finalPrice;
    const pts = preview.finalPoints;
    // Auto-select best method based on balance sufficiency, but always pre-fill the full amount
    let preset: "stored_value" | "points" | "external" = "external";
    if (svBal >= price && price > 0) {
      preset = "stored_value";
    } else if (ptsBal >= pts && pts > 0) {
      preset = "points";
    }
    setSettleForm({
      paymentPreset: preset,
      deductAmount: price > 0 ? String(price / 100) : "",
      deductPoints: pts > 0 ? String(pts) : "",
      pointsChange: "",
      note: "",
    });
    setFormInitialized(true);
  }, [preview, formInitialized, isSettled]);


  const handleSettle = useCallback(async () => {
    if (!preview || settling) return;
    const parsed = settleFormSchema.safeParse(settleForm);
    if (!parsed.success) {
      msg.error(parsed.error.issues[0]?.message ?? t("dashSettle.formValidationFailed"));
      return;
    }
    const { paymentPreset, deductAmount, deductPoints, pointsChange, note } = parsed.data;
    setSettling(true);
    try {
      await settleOrder({
        variables: {
          input: {
            id: orderId,
            deductAmount: paymentPreset === "stored_value" ? Number(deductAmount) || 0 : 0,
            deductFromStoredValue: paymentPreset === "stored_value",
            deductPoints: paymentPreset === "points" ? Number(deductPoints) || 0 : 0,
            pointsChange: Number(pointsChange) || 0,
            note: note || null,
          },
        },
      });
      msg.success(t("dashSettle.settleSuccess"));
      void refetch();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : t("dashSettle.settleFailed"));
    } finally {
      setSettling(false);
    }
  }, [preview, settling, settleForm, settleFormSchema, orderId, settleOrder, msg, refetch]);

  const handleResume = useCallback(async () => {
    try {
      await resumeOrder({ variables: { id: orderId } });
      msg.success(t("dashSettle.resumeSuccess"));
      void refetch();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : t("dashSettle.resumeFailed"));
    }
  }, [orderId, resumeOrder, msg, refetch]);

  if (loading) {
    return <main className="size-full flex items-center justify-center"><span className="loading loading-spinner loading-lg" /></main>;
  }
  if (error || !preview) {
    return (
      <main className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-base-content/60">{error?.message ?? t("dashSettle.orderNotFound")}</p>
        <Link to="/dash/orders" search={{ q: "", sortBy: "start_at", sortOrder: "desc", groupBy: "none", page: "1" }} className="btn btn-primary btn-sm">{t("dashSettle.backToOrders")}</Link>
      </main>
    );
  }

  const storedValueBalance = preview.membership.storedValueBalance;
  const pointsBalance = preview.membership.pointsBalance;

  return (
    <ClientOnly>
      <main className="size-full overflow-y-auto">
        <div className="mx-auto max-w-md px-4 py-6 pb-[50vh] md:pb-6">
          {/* Receipt container */}
          <div className="bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden">
            {/* Receipt header */}
            <div className="bg-base-200 px-5 py-4 border-b border-base-300">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold flex items-center gap-2">
                    <ReceiptIcon className="size-5" />
                    {preview.order.nickname ?? preview.order.uid ?? t("dashSettle.anonymous")}
                  </h1>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    {preview.order.table?.name ?? t("dashSettle.unknownTable")} · {dayjs(preview.order.startAt).format("MM/DD HH:mm")}
                    {preview.order.endAt ? ` — ${dayjs(preview.order.endAt).format("HH:mm")}` : ` — ${t("dashSettle.ongoing")}`}
                  </p>
                </div>
                {isSettled && <span className="badge badge-success">{t("dashSettle.settled")}</span>}
                {preview.order.status === "PAUSED" && <span className="badge badge-warning">{t("dashSettle.paused")}</span>}
                {preview.order.status === "ACTIVE" && <span className="badge badge-info">{t("dashSettle.active")}</span>}
              </div>
            </div>

            {/* Time summary bar */}
            <div className="grid grid-cols-3 text-center py-3 border-b border-base-300 text-xs">
              <div><span className="font-mono text-base font-bold">{preview.totalMinutes}</span><br/>{t("dashSettle.totalMinutes")}</div>
              <div><span className="font-mono text-base font-bold text-warning">{preview.pausedMinutes}</span><br/>{t("dashSettle.pausedMinutes")}</div>
              <div><span className="font-mono text-base font-bold text-success">{preview.billableMinutes}</span><br/>{t("dashSettle.billableMinutes")}</div>
            </div>

            {/* Plan details - per-segment breakdown */}
            {preview.priceBreakdown && preview.priceBreakdown.planDetails.length > 0 && (
              <div className="px-5 py-3 border-b border-base-300">
                <div className="space-y-2">
                  {preview.priceBreakdown.planDetails.map((detail: any, idx: number) => (
                    <div key={idx} className="rounded-lg bg-base-200/50 px-3 py-2 text-sm">
                      {/* Row 1: plan name + time range */}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          {detail.planType === "conditional" ? (
                            <span className="badge badge-xs badge-info">{detail.planName}</span>
                          ) : (
                            <span className="badge badge-xs">{detail.planName}</span>
                          )}
                          <span className="text-xs text-base-content/50">{detail.timeRange}</span>
                        </span>
                        <span className="font-mono font-semibold">
                          {detail.billingType === "fixed"
                            ? t("dashSettle.billingFixed")
                            : t("dashSettle.billingHours", { hours: detail.billableHours })}
                        </span>
                      </div>
                      {/* Row 2: unit price + subtotal */}
                      <div className="flex items-center justify-between mt-1 text-xs text-base-content/60">
                        <span>
                          {detail.billingType === "fixed"
                            ? t("dashSettle.billingFixedPrice", { price: formatPrice(detail.unitPrice) })
                            : t("dashSettle.billingPerHour", { price: formatPrice(detail.unitPrice) })}
                        </span>
                        <span className="font-mono">
                          {detail.capApplied && (
                            <span className="text-warning mr-1">{t("dashSettle.capApplied")}</span>
                          )}
                          <span className="font-semibold text-base-content">{formatPrice(detail.subtotalPrice)}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subtotal: 应付金额 */}
            <div className="px-5 py-4 border-b border-base-300 bg-base-200/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-base-content/60">{t("dashSettle.subtotalLabel")}</span>
                <span className="text-2xl font-bold font-mono">{formatPrice(preview.finalPrice)}</span>
              </div>
              {preview.finalPoints > 0 && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-base-content/60">{t("dashSettle.orPoints")}</span>
                  <span className="text-lg font-semibold">{formatPoints(preview.finalPoints)}</span>
                </div>
              )}
            </div>

            {/* SETTLED: prominent actual payment display */}
            {isSettled && (
              <div className="px-5 py-5 bg-success/5">
                <div className="text-center">
                  <CheckCircleIcon className="size-8 text-success mx-auto mb-2" />
                  <div className="text-3xl font-bold font-mono">
                    {preview.order.settledPrice != null && preview.order.settledPrice > 0
                      ? formatPrice(preview.order.settledPrice)
                      : preview.order.settledPoints != null && preview.order.settledPoints > 0
                        ? formatPoints(preview.order.settledPoints)
                        : t("dashSettle.settledViaExternal")}
                  </div>
                  <div className="text-sm text-base-content/60 mt-1">
                    {preview.order.settledPrice != null && preview.order.settledPrice > 0
                      ? t("dashSettle.settledViaStoredValue")
                      : preview.order.settledPoints != null && preview.order.settledPoints > 0
                        ? t("dashSettle.settledViaPoints")
                        : t("dashSettle.amountDue", { price: formatPrice(preview.order.finalPrice ?? preview.finalPrice) })}
                  </div>
                  <div className="text-xs text-base-content/40 mt-2">
                    {preview.order.endAt ? dayjs(preview.order.endAt).format("YYYY-MM-DD HH:mm") : ""} t("dashSettle.settledAt")
                  </div>
                </div>
              </div>
            )}

            {/* NOT SETTLED: payment controls */}
            {!isSettled && (
              <form className="px-5 py-4 space-y-4" onSubmit={(e) => { e.preventDefault(); void handleSettle(); }}>
                {/* Payment method selector */}
                <div>
                  <label className="text-xs text-base-content/50 mb-1.5 block">{t("dashSettle.paymentMethodLabel")}</label>
                  <div className="flex gap-2">
                    {getSinglePaymentPresets(t).map((p) => (
                      <div key={p.value} className="flex-1">
                        <button
                          type="button"
                          className={`btn btn-sm w-full ${settleForm.paymentPreset === p.value ? "btn-primary" : "btn-ghost border-base-300"}`}
                          onClick={() => updateSettleForm((d) => {
                            d.paymentPreset = p.value;
                            if (p.value === "stored_value") {
                              d.deductAmount = String(preview.finalPrice / 100);
                            } else if (p.value === "points") {
                              d.deductPoints = String(preview.finalPoints > 0 ? preview.finalPoints : 0);
                            }
                          })}
                        >
                          {p.label}
                          {p.value === "stored_value" && (
                            <span className="text-[10px] opacity-60 ml-1">({formatPrice(storedValueBalance)})</span>
                          )}
                          {p.value === "points" && (
                            <span className="text-[10px] opacity-60 ml-1">({t("dashSettle.pointsBalance", { points: pointsBalance })})</span>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stored value input */}
                {settleForm.paymentPreset === "stored_value" && (
                  <div>
                    <label className="text-xs text-base-content/50 mb-1 block">
                      {t("dashSettle.storedValueDeductLabel", { balance: formatPrice(storedValueBalance) })}
                    </label>
                    <input
                      type="number"
                      className="input input-sm input-bordered w-full"
                      placeholder={t("dashSettle.svMaxPlaceholder", { max: (storedValueBalance / 100).toFixed(0) })}
                      value={settleForm.deductAmount}
                      onChange={(e) => updateSettleForm((d) => { d.deductAmount = e.target.value; })}
                    />
                    {Number(settleForm.deductAmount) * 100 > storedValueBalance && (
                      <p className="text-xs text-error mt-1">{t("dashSettle.svExceedsBalance")}</p>
                    )}
                  </div>
                )}

                {/* Points input */}
                {settleForm.paymentPreset === "points" && (
                  <div>
                    <label className="text-xs text-base-content/50 mb-1 block">
                      {t("dashSettle.pointsDeductLabel", { balance: pointsBalance })}
                    </label>
                    <input
                      type="number"
                      className="input input-sm input-bordered w-full"
                      placeholder={t("dashSettle.ptsMaxPlaceholder", { max: pointsBalance })}
                      value={settleForm.deductPoints}
                      onChange={(e) => updateSettleForm((d) => { d.deductPoints = e.target.value; })}
                    />
                    {Number(settleForm.deductPoints) > pointsBalance && (
                      <p className="text-xs text-error mt-1">{t("dashSettle.ptsExceedsBalance")}</p>
                    )}
                  </div>
                )}

                {/* Points change */}
                <div>
                  <label className="text-xs text-base-content/50 mb-1 block">{t("dashSettle.pointsChangeLabel")}</label>
                  <input
                    type="number"
                    className="input input-sm input-bordered w-full"
                    placeholder="0"
                    value={settleForm.pointsChange}
                    onChange={(e) => updateSettleForm((d) => { d.pointsChange = e.target.value; })}
                  />
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs text-base-content/50 mb-1 block">{t("dashSettle.noteLabel")}</label>
                  <textarea
                    className="textarea textarea-sm textarea-bordered w-full"
                    placeholder={t("dashSettle.notePlaceholder")}
                    rows={2}
                    value={settleForm.note}
                    onChange={(e) => updateSettleForm((d) => { d.note = e.target.value; })}
                  />
                </div>

                {/* Validation warning */}
                {settleForm.paymentPreset === "stored_value" && Number(settleForm.deductAmount) * 100 > storedValueBalance && (
                  <div className="bg-error/10 text-error text-xs px-3 py-2 rounded-lg flex items-center gap-1.5">
                    <span className="font-semibold">⚠</span>
                    {t("dashSettle.svInsufficientWarning", { balance: formatPrice(storedValueBalance), deduct: formatPrice(Number(settleForm.deductAmount) * 100), excess: formatPrice(Number(settleForm.deductAmount) * 100 - storedValueBalance) })}
                  </div>
                )}
                {settleForm.paymentPreset === "points" && Number(settleForm.deductPoints) > pointsBalance && (
                  <div className="bg-error/10 text-error text-xs px-3 py-2 rounded-lg flex items-center gap-1.5">
                    <span className="font-semibold">⚠</span>
                    {t("dashSettle.ptsInsufficientWarning", { balance: pointsBalance, deduct: Number(settleForm.deductPoints), excess: Number(settleForm.deductPoints) - pointsBalance })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex-1 gap-1"
                    disabled={settling
                      || (settleForm.paymentPreset === "stored_value" && (Number(settleForm.deductAmount) <= 0 || Number(settleForm.deductAmount) * 100 > storedValueBalance))
                      || (settleForm.paymentPreset === "points" && (Number(settleForm.deductPoints) <= 0 || Number(settleForm.deductPoints) > pointsBalance))
                    }
                  >
                    {settling ? <span className="loading loading-spinner loading-xs" /> : <CheckCircleIcon className="size-4" />}
                    {t("dashSettle.confirmSettleBtn")}
                  </button>
                  {preview.order.status === "PAUSED" && (
                    <button type="button" className="btn btn-ghost gap-1" onClick={() => void handleResume()}>
                      <ClockIcon className="size-4" /> {t("dashSettle.resumeOrderBtn")}
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Pause logs */}
            {preview.pauseLogs.length > 0 && (
              <div className="px-5 py-3 border-t border-base-300 text-xs text-base-content/50">
                <div className="font-semibold text-base-content/70 mb-1">{t("dashSettle.pauseLogsTitle")}</div>
                {preview.pauseLogs.map((log: { pausedAt: string; resumedAt: string | null }, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{dayjs(log.pausedAt).format("HH:mm")}</span>
                    <span>{log.resumedAt ? dayjs(log.resumedAt).format("HH:mm") : t("dashSettle.pauseOngoing")}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Membership */}
            {(preview.membership.hasTimePlan || storedValueBalance > 0 || pointsBalance > 0) && (
              <div className="px-5 py-3 border-t border-base-300 text-xs text-base-content/50">
                <div className="font-semibold text-base-content/70 mb-1">{t("dashSettle.membershipTitle")}</div>
                {preview.membership.hasTimePlan && (
                  <div className="flex justify-between">
                    <span>{t("dashSettle.timePlanLabel")}</span>
                    <span>{preview.membership.timePlanType} ({preview.membership.timePlanActive ? t("dashSettle.timePlanActive") : t("dashSettle.timePlanExpired")})</span>
                  </div>
                )}
                {storedValueBalance > 0 && (
                  <div className="flex justify-between"><span>{t("dashSettle.storedValueBalanceLabel")}</span><span>{formatPrice(storedValueBalance)}</span></div>
                )}
                {pointsBalance > 0 && (
                  <div className="flex justify-between"><span>{t("dashSettle.pointsBalanceLabel")}</span><span>{pointsBalance}</span></div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 border-t border-base-300 flex gap-2 justify-center">
              <Link to="/dash/orders" search={{ q: "", sortBy: "start_at", sortOrder: "desc", groupBy: "none", page: "1" }} className="btn btn-ghost btn-xs gap-1">
                <HouseIcon className="size-3" /> {t("dashSettle.orderListLink")}
              </Link>
              {preview.order.userId && (
                <Link to="/dash/users/$id" params={{ id: preview.order.userId }} search={{ tab: "basic" }} className="btn btn-ghost btn-xs gap-1">
                  <UserIcon className="size-3" /> {t("dashSettle.userDetailLink")}
                </Link>
              )}
            </div>
          </div>

          {/* Recent orders below the receipt */}
          {preview.recentOrders.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-base-content/60 mb-2">{t("dashSettle.recentOrdersTitle")}</h3>
              <div className="space-y-1">
                {preview.recentOrders.map((o: { id: string; tableName: string; startAt: string; endAt: string | null; finalPrice: number | null; status: string }) => (
                  <Link
                    key={o.id}
                    to="/dash/orders/settle"
                    search={{ ids: [o.id] }}
                    className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-base-200 transition-colors"
                  >
                    <span>{o.tableName} · {dayjs(o.startAt).format("MM/DD HH:mm")}</span>
                    <span className="font-mono">{formatPrice(o.finalPrice ?? 0)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </ClientOnly>
  );
}

// --- Types ---

type SettlementPreviewItem = NonNullable<
  ReturnType<typeof useBatchSettlementPreviewMutation>[1]["data"]
>["batchSettlementPreview"][number];

interface UserCardState {
  paymentPreset: 'stored_value' | 'points' | 'external' | 'custom';
  deductAmount: number; // cents
  deductPoints: number; // integer
  pointsChange: number;
  note: string;
  settled: boolean;
  selectedPlan: string;
}

// --- Plan options ---

function getPlanOptions(t: (key: string) => string) {
  return [
    { value: "none", label: t("dashSettle.planNone") },
    { value: "monthly", label: t("dashSettle.planMonthly") },
    { value: "monthly_cc", label: t("dashSettle.planMonthlyCc") },
    { value: "yearly", label: t("dashSettle.planYearly") },
    { value: "stored_value", label: t("dashSettle.planStoredValue") },
  ] as const;
}

// --- Utility ---

const HALF_HOUR_MS = 30 * 60 * 1000;

function formatMinutes(mins: number, t?: (key: string, vars?: Record<string, string | number>) => string): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (t) {
    if (h === 0) return t("dashSettle.minutesFmt", { minutes: m });
    if (m === 0) return t("dashSettle.hoursFmt", { hours: h });
    return t("dashSettle.hourMinutesFmt", { hours: h, minutes: m });
  }
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

// --- Main Page ---

function BatchSettlePage() {
  const { ids } = Route.useSearch();
  const navigate = useNavigate();
  const msg = useMsg();
  const msgRef = useRef(msg);
  msgRef.current = msg;

  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const [previews, setPreviews] = useState<SettlementPreviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userStates, setUserStates] = useState<Map<string, UserCardState>>(new Map());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const bottomRef = useRef<HTMLDivElement>(null);

  const [fetchPreview] = useBatchSettlementPreviewMutation();
  const [settleOrder] = useSettleOrderMutation();
  const [resumeOrder] = useResumeOrderMutation();
  const { data: pricingData } = usePublishedPricingQuery({ fetchPolicy: "network-only" });

  const pricingSnapshot = useMemo<SnapshotData | null>(() => {
    const d = pricingData?.publishedPricing?.data;
    if (!d) return null;
    try {
      const plans = typeof d.plans === "string" ? JSON.parse(d.plans) : d.plans;
      if (!Array.isArray(plans)) return null;
      return {
        config: { daytime_start: d.config?.daytimeStart ?? "10:00", daytime_end: d.config?.daytimeEnd ?? "18:00" },
        plans,
      };
    } catch {
      return null;
    }
  }, [pricingData]);

  const fetchData = useCallback(async () => {
    if (ids.length === 0) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await fetchPreview({ variables: { ids } });
      if (result.errors?.length) {
        const firstErr = result.errors[0];
        const isNotFound = firstErr.extensions?.code === "NOT_FOUND";
        const errText = isNotFound ? tRef.current("dashOrders.notFound") : (firstErr.message ?? tRef.current("dashOrders.loadFailed"));
        setErrorMsg(errText);
        msgRef.current.error(errText);
      }
      if (result.data?.batchSettlementPreview) {
        const items = result.data.batchSettlementPreview;
        setPreviews(items);
        setUserStates((prev) => {
          const next = new Map<string, UserCardState>();
          for (const p of items) {
            const existing = prev.get(p.order.id);
            if (existing) {
              next.set(p.order.id, { ...existing, settled: p.order.status === "SETTLED" });
            } else {
              const finalPts = (p as unknown as { finalPoints: number }).finalPoints ?? 0;
              const ptsBalance = (p.membership as unknown as { pointsBalance: number }).pointsBalance ?? 0;
              // Default to first non-disabled preset
              let defaultPreset: UserCardState['paymentPreset'] = 'external';
              if (p.membership.storedValueBalance >= p.finalPrice) {
                defaultPreset = 'stored_value';
              } else if (ptsBalance >= finalPts) {
                defaultPreset = 'points';
              }
              next.set(p.order.id, {
                paymentPreset: defaultPreset,
                deductAmount: p.finalPrice,
                deductPoints: finalPts,
                pointsChange: 0,
                note: "",
                settled: p.order.status === "SETTLED",
                selectedPlan: p.membership.hasTimePlan
                  ? (p.membership.timePlanType?.toLowerCase() ?? "none")
                  : "none",
              });
            }
          }
          return next;
        });
      }
    } catch (err) {
      const isNotFound = err instanceof Error &&
        (err.message === "Order not found" || (err as { graphQLErrors?: Array<{ extensions?: { code?: string } }> }).graphQLErrors?.some(e => e.extensions?.code === "NOT_FOUND"));
      const errText = isNotFound ? tRef.current("dashOrders.notFound") : (err instanceof Error ? err.message : tRef.current("dashOrders.loadFailed"));
      setErrorMsg(errText);
      msgRef.current.error(errText);
    } finally {
      setLoading(false);
    }
  }, [ids, fetchPreview]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Real-time sync: refetch preview data when any order in this batch changes status
  useOrderStatusChangedSubscription({
    onData: ({ data: subData }) => {
      const changed = subData.data?.orderStatusChanged;
      if (!changed) return;
      const orderId = changed.order?.id;
      if (!orderId || !ids.includes(orderId)) return;
      // Update settled state immediately from subscription
      if (changed.currentStatus === "SETTLED") {
        setUserStates((prev) => {
          const next = new Map(prev);
          const old = next.get(orderId);
          if (old) next.set(orderId, { ...old, settled: true });
          return next;
        });
      } else {
        // For other status changes (e.g. cancelled), refetch
        void fetchData();
      }
    },
  });

  const updateUserState = useCallback((orderId: string, patch: Partial<UserCardState>) => {
    setUserStates((prev) => {
      const next = new Map(prev);
      const old = next.get(orderId);
      if (old) next.set(orderId, { ...old, ...patch });
      return next;
    });
  }, []);

  // Computed values
  const totalPrice = useMemo(() => previews.reduce((s, p) => s + p.finalPrice, 0), [previews]);
  const totalDuration = useMemo(() => previews.reduce((s, p) => s + p.totalMinutes, 0), [previews]);
  const settledCount = useMemo(
    () => Array.from(userStates.values()).filter((s) => s.settled).length,
    [userStates],
  );
  const allSettled = previews.length > 0 && settledCount === previews.length;

  // Compute price with plan override
  const computeUserPrice = useCallback(
    (preview: SettlementPreviewItem, planOverride?: string): number => {
      if (!pricingSnapshot) return preview.finalPrice;
      const pauseLogs = preview.pauseLogs.map((l: { pausedAt: string; resumedAt: string | null }) => ({
        pausedAt: new Date(l.pausedAt).getTime(),
        resumedAt: l.resumedAt ? new Date(l.resumedAt).getTime() : null,
      }));
      const startAt = new Date(preview.order.startAt).getTime();
      const endAt = preview.order.endAt ? new Date(preview.order.endAt).getTime() : Date.now();
      const scope = preview.order.table?.scope ?? "basic";
      const result = calculatePrice(startAt, endAt, scope, pricingSnapshot, pauseLogs);
      return result?.finalPrice ?? preview.finalPrice;
    },
    [pricingSnapshot],
  );

  // Batch settle validation schema
  const batchSettleSchema = useMemo(() => z.object({
    paymentPreset: z.enum(["stored_value", "points", "external", "custom"]),
    deductAmount: z.number(),
    deductPoints: z.number(),
    pointsChange: z.number(),
    note: z.string().trim().max(200),
  }), []);

  // Settle single user
  const handleSettleUser = useCallback(async (orderId: string) => {
    const state = userStates.get(orderId);
    if (!state) {
      console.warn("[settle] no state found for orderId:", orderId, "map size:", userStates.size);
      return;
    }

    const parsed = batchSettleSchema.safeParse(state);
    if (!parsed.success) {
      msgRef.current.error(parsed.error.issues[0]?.message ?? t("dashSettle.batchValidationFailed"));
      return;
    }

    // Build effective values based on preset
    let effectiveDeductAmount = 0;
    let effectiveDeductPoints = 0;
    let effectiveNote = state.note.trim();

    switch (state.paymentPreset) {
      case 'stored_value':
        effectiveDeductAmount = state.deductAmount;
        break;
      case 'points':
        effectiveDeductPoints = state.deductPoints;
        break;
      case 'external':
        effectiveNote = effectiveNote ? `${t("dashSettle.noteExternalPayment")}; ${effectiveNote}` : t("dashSettle.noteExternalPayment");
        break;
      case 'custom':
        effectiveDeductAmount = state.deductAmount;
        effectiveDeductPoints = state.deductPoints;
        effectiveNote = effectiveNote ? `${t("dashSettle.noteCustomPayment")}; ${effectiveNote}` : t("dashSettle.noteCustomPayment");
        break;
    }

    // Confirm if resulting balance would go below -1元 or below 1点
    const preview = previews.find((p) => p.order.id === orderId);
    const currentSvBalance = preview?.membership.storedValueBalance ?? 0;
    const currentPtsBalance = (preview?.membership as unknown as { pointsBalance: number })?.pointsBalance ?? 0;
    const resultingSv = currentSvBalance - effectiveDeductAmount;
    const resultingPts = currentPtsBalance - effectiveDeductPoints;
    const svWarning = effectiveDeductAmount > 0 && resultingSv < -100;
    const ptsWarning = effectiveDeductPoints > 0 && resultingPts < 1;
    if (svWarning || ptsWarning) {
      const warnings: string[] = [];
      if (svWarning) warnings.push(t("dashSettle.svBalanceWarning", { balance: (resultingSv / 100).toFixed(2) }));
      if (ptsWarning) warnings.push(t("dashSettle.ptsBalanceWarning", { balance: resultingPts }));
      const confirmMsg = `${warnings.join(", ")} — ${t("dashSettle.confirmSettle")}`;
      if (!confirm(confirmMsg)) return;
    }

    try {
      await settleOrder({
        variables: {
          input: {
            id: orderId,
            deductFromStoredValue: state.paymentPreset === 'stored_value',
            deductAmount: effectiveDeductAmount !== 0 ? effectiveDeductAmount : null,
            deductPoints: effectiveDeductPoints !== 0 ? effectiveDeductPoints : null,
            pointsChange: state.pointsChange || 0,
            note: effectiveNote || null,
          },
        },
      });
      updateUserState(orderId, { settled: true });
      msgRef.current.success(t("dashSettle.batchSettleSuccess"));
      // Check if all settled
      const newSettledCount = settledCount + 1;
      if (newSettledCount === previews.length) {
        void import("canvas-confetti").then((m) => m.default({ particleCount: 150, spread: 80, origin: { y: 0.7 } }));
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 500);
      }
    } catch (err) {
      console.error("[settle] settleOrder failed:", err);
      msgRef.current.error(err instanceof Error ? err.message : t("dashSettle.batchSettleFailed"));
    }
  }, [userStates, settleOrder, updateUserState, settledCount, previews.length, batchSettleSchema]);

  // Resume order
  const handleResumeUser = useCallback(async (orderId: string) => {
    if (!confirm(t("dashSettle.confirmResumeBilling"))) return;
    try {
      await resumeOrder({ variables: { id: orderId } });
      msgRef.current.success(t("dashSettle.batchResumeSuccess"));
      const remaining = ids.filter((id) => id !== orderId);
      if (remaining.length === 0) {
        void navigate({ to: "/dash/orders", search: { q: "", sortBy: "start_at", sortOrder: "desc", groupBy: "none", page: "1" } });
      } else {
        void navigate({ to: "/dash/orders/settle", search: { ids: remaining } });
      }
    } catch (err) {
      msgRef.current.error(err instanceof Error ? err.message : t("dashSettle.batchResumeFailed"));
    }
  }, [ids, resumeOrder, navigate]);

  // Scroll to next pending card
  const scrollToNextPending = useCallback(() => {
    for (const p of previews) {
      const state = userStates.get(p.order.id);
      if (state && !state.settled) {
        const el = cardRefs.current.get(p.order.id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
  }, [previews, userStates]);

  // --- Render ---

  if (ids.length === 0) {
    return (
      <main className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-base-content/60">{t("dashOrders.noSelection")}</p>
        <Link to="/dash/orders" search={{ q: "", sortBy: "start_at", sortOrder: "desc", groupBy: "none", page: "1" }} className="btn btn-primary btn-sm">
          {t("dashOrders.backToList")}
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

  if (previews.length === 0) {
    return (
      <main className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-base-content/60">{errorMsg ?? t("dashOrders.notFound")}</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void fetchData()}>
            {t("common.retry")}
          </button>
          <Link to="/dash/orders" search={{ q: "", sortBy: "start_at", sortOrder: "desc", groupBy: "none", page: "1" }} className="btn btn-primary btn-sm">
            {t("dashOrders.backToList")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <ClientOnly>
      <main className="size-full overflow-y-auto scroll-smooth">
        <OverviewSection
          previews={previews}
          totalPrice={totalPrice}
          totalDuration={totalDuration}
          pricingSnapshot={pricingSnapshot}
        />

          <div className="mx-auto w-full max-w-4xl px-4 pb-[50vh] md:pb-32">
          {previews.map((preview) => {
            const state = userStates.get(preview.order.id);
            if (!state) return null;
            return (
              <UserBillingCard
                key={preview.order.id}
                ref={(el) => { if (el) cardRefs.current.set(preview.order.id, el); }}
                preview={preview}
                state={state}
                pricingSnapshot={pricingSnapshot}
                computePrice={computeUserPrice}
                onStateChange={(patch) => updateUserState(preview.order.id, patch)}
                onSettle={() => void handleSettleUser(preview.order.id)}
                onResume={() => void handleResumeUser(preview.order.id)}
              />
            );
          })}

          <PendingBar
            settledCount={settledCount}
            totalCount={previews.length}
            onScrollToPending={scrollToNextPending}
            allSettled={allSettled}
          />

          {allSettled && (
            <div ref={bottomRef} className="flex flex-col items-center justify-center gap-4 py-12">
              <CheckCircleIcon className="size-12 text-success animate-bounce" />
              <p className="text-lg font-bold text-success">{t("dashOrders.allSettled")}</p>
              <button
                type="button"
                className="btn btn-primary gap-2"
                onClick={() => void navigate({ to: "/dash" })}
              >
                <HouseIcon className="size-4" />
                {t("dashOrders.backToHome")}
              </button>
            </div>
          )}
        </div>
      </main>
    </ClientOnly>
  );
}

// === Overview Section ===

function OverviewSection({
  previews,
  totalPrice,
  totalDuration,
  pricingSnapshot,
}: {
  previews: SettlementPreviewItem[];
  totalPrice: number;
  totalDuration: number;
  pricingSnapshot: SnapshotData | null;
}) {
  const { t } = useTranslation();

  const chartOption = useMemo<EChartsOption>(() => {
    if (previews.length === 0) return {};

    const globalStart = Math.min(...previews.map((p) => new Date(p.order.startAt).getTime()));
    const globalEnd = Math.max(...previews.map((p) =>
      p.order.endAt ? new Date(p.order.endAt).getTime() : Date.now(),
    ));
    const duration = globalEnd - globalStart;
    const intervals = Math.min(48, Math.max(1, Math.ceil(duration / HALF_HOUR_MS)));

    const timePoints: string[] = [];
    for (let i = 0; i <= intervals; i++) {
      timePoints.push(dayjs(globalStart + i * HALF_HOUR_MS).format("HH:mm"));
    }

    // Per-user cumulative prices
    const userSeries: { name: string; data: number[] }[] = [];
    for (const p of previews) {
      const startAt = new Date(p.order.startAt).getTime();
      const endAt = p.order.endAt ? new Date(p.order.endAt).getTime() : Date.now();
      const pauseLogs = p.pauseLogs.map((l: { pausedAt: string; resumedAt: string | null }) => ({
        pausedAt: new Date(l.pausedAt).getTime(),
        resumedAt: l.resumedAt ? new Date(l.resumedAt).getTime() : null,
      }));
      const scope = p.order.table?.scope ?? "basic";
      const points: number[] = [];
      for (let i = 0; i <= intervals; i++) {
        const t = globalStart + i * HALF_HOUR_MS;
        if (t < startAt) { points.push(0); continue; }
        const currentEnd = Math.min(t, endAt);
        if (pricingSnapshot) {
          const result = calculatePrice(startAt, currentEnd, scope, pricingSnapshot, pauseLogs);
          points.push(result?.finalPrice ?? 0);
        } else {
          const pct = Math.max(0, currentEnd - startAt) / Math.max(1, endAt - startAt);
          points.push(Math.round(p.finalPrice * pct));
        }
      }
      userSeries.push({ name: p.order.nickname ?? p.order.uid ?? t("dashSettle.userFallback"), data: points });
    }

    // Total line
    const totalData: number[] = [];
    for (let i = 0; i <= intervals; i++) {
      totalData.push(userSeries.reduce((s, u) => s + (u.data[i] ?? 0), 0));
    }

    const colors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

    return {
      animation: true,
      grid: { top: 10, bottom: 10, left: 10, right: 10 },
      xAxis: { type: "category", data: timePoints, show: false },
      yAxis: { type: "value", show: false },
      series: [
        {
          name: "Total",
          type: "line",
          data: totalData,
          smooth: true,
          lineStyle: { width: 2.5, color: "rgba(99, 102, 241, 0.4)" },
          areaStyle: { color: "rgba(99, 102, 241, 0.06)" },
          symbol: "none",
        },
        ...userSeries.map((s, i) => ({
          name: s.name,
          type: "line" as const,
          data: s.data,
          smooth: true,
          lineStyle: { width: 1.5, color: `${colors[i % colors.length]}40` },
          symbol: "none",
        })),
      ],
      tooltip: { show: false },
    };
  }, [previews, pricingSnapshot]);

  return (
    <div className="relative overflow-hidden mb-6">
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <Suspense fallback={null}>
          <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
        </Suspense>
      </div>

      <div className="relative z-10 px-4 pt-4 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <h1 className="text-xl font-bold">{t("dashSettle.batchTitle")}</h1>
        </div>

        <div className="mx-auto max-w-4xl flex flex-wrap gap-6 items-end">
          <div>
            <div className="text-xs text-base-content/50 uppercase tracking-wider">{t("dashSettle.totalAmountLabel")}</div>
            <div className="text-3xl font-bold font-mono">{formatPrice(totalPrice)}</div>
          </div>
          <div>
            <div className="text-xs text-base-content/50 uppercase tracking-wider">{t("dashSettle.totalDurationLabel")}</div>
            <div className="text-xl font-semibold">{formatMinutes(totalDuration, t)}</div>
          </div>
          <div className="flex flex-wrap gap-3 ml-auto">
            {previews.map((p) => (
              <div key={p.order.id} className="text-sm">
                <span className="text-base-content/60">{p.order.nickname ?? p.order.uid ?? t("dashSettle.userFallback")}</span>
                <span className="ml-1 font-mono font-semibold">{formatPrice(p.finalPrice)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// === Per-User Billing Card ===

function getPaymentPresets(t: (key: string) => string) {
  return [
    { key: 'stored_value', label: t("dashSettle.batchSvDeduct") },
    { key: 'points', label: t("dashSettle.batchPtsDeduct") },
    { key: 'external', label: t("dashSettle.batchExternalPayment") },
    { key: 'custom', label: t("dashSettle.batchCustom") },
  ] as const;
}

const UserBillingCard = forwardRef<HTMLDivElement, {
  preview: SettlementPreviewItem;
  state: UserCardState;
  pricingSnapshot: SnapshotData | null;
  computePrice: (preview: SettlementPreviewItem, plan?: string) => number;
  onStateChange: (patch: Partial<UserCardState>) => void;
  onSettle: () => void;
  onResume: () => void;
}>(function UserBillingCard({ preview, state, pricingSnapshot, computePrice, onStateChange, onSettle, onResume }, ref) {
  const { t } = useTranslation();
  const calculatedPrice = useMemo(
    () => computePrice(preview, state.selectedPlan),
    [preview, state.selectedPlan, computePrice],
  );

  // Extract finalPoints and pointsBalance from preview with type assertion
  const finalPoints = (preview as unknown as { finalPoints: number }).finalPoints ?? 0;
  const pointsBalance = (preview.membership as unknown as { pointsBalance: number }).pointsBalance ?? 0;
  const storedValueBalance = preview.membership.storedValueBalance;

  // Determine which presets are disabled
  const presetDisabled = useMemo(() => ({
    stored_value: storedValueBalance < calculatedPrice,
    points: pointsBalance < finalPoints,
    external: false,
    custom: false,
  }), [storedValueBalance, calculatedPrice, pointsBalance, finalPoints]);

  const presetDisabledReason = useMemo(() => ({
    stored_value: storedValueBalance < calculatedPrice
      ? t("dashSettle.svInsufficientDetail", { balance: (storedValueBalance / 100).toFixed(2) })
      : null,
    points: pointsBalance < finalPoints
      ? t("dashSettle.ptsInsufficientDetail", { balance: pointsBalance })
      : null,
    external: null,
    custom: null,
  }), [storedValueBalance, calculatedPrice, pointsBalance, finalPoints]);

  // Bar chart for 30min intervals with event annotations
  const barChartOption = useMemo(() => {
    const startAt = new Date(preview.order.startAt).getTime();
    const endAt = preview.order.endAt ? new Date(preview.order.endAt).getTime() : Date.now();
    const duration = endAt - startAt;
    const intervals = Math.min(48, Math.max(1, Math.ceil(duration / HALF_HOUR_MS)));
    const scope = preview.order.table?.scope ?? "basic";

    const pauseLogs = preview.pauseLogs.map((l: { pausedAt: string; resumedAt: string | null }) => ({
      pausedAt: new Date(l.pausedAt).getTime(),
      resumedAt: l.resumedAt ? new Date(l.resumedAt).getTime() : null,
    }));

    // Compute incremental price per interval
    const barData: number[] = [];
    const labels: string[] = [];
    let prevPrice = 0;
    for (let i = 1; i <= intervals; i++) {
      const t = startAt + i * HALF_HOUR_MS;
      const currentEnd = Math.min(t, endAt);
      labels.push(dayjs(currentEnd).format("HH:mm"));
      if (pricingSnapshot) {
        const result = calculatePrice(startAt, currentEnd, scope, pricingSnapshot, pauseLogs);
        const cumPrice = result?.finalPrice ?? 0;
        barData.push(cumPrice - prevPrice);
        prevPrice = cumPrice;
      } else {
        const pct = Math.min(1, (i * HALF_HOUR_MS) / Math.max(1, duration));
        const cumPrice = Math.round(preview.finalPrice * pct);
        barData.push(cumPrice - prevPrice);
        prevPrice = cumPrice;
      }
    }

    // Event marklines: pauses, daytime/nighttime boundary
    const markLines: Array<{ xAxis: number; label: { formatter: string; fontSize: number }; lineStyle?: { color: string } }> = [];

    // Pause events
    for (const log of preview.pauseLogs) {
      const pauseIdx = Math.floor((new Date(log.pausedAt).getTime() - startAt) / HALF_HOUR_MS);
      markLines.push({
        xAxis: Math.min(pauseIdx, intervals - 1),
        label: { formatter: t("dashSettle.chartPause"), fontSize: 9 },
        lineStyle: { color: "#f59e0b" },
      });
      if (log.resumedAt) {
        const resumeIdx = Math.floor((new Date(log.resumedAt).getTime() - startAt) / HALF_HOUR_MS);
        markLines.push({
          xAxis: Math.min(resumeIdx, intervals - 1),
          label: { formatter: t("dashSettle.chartResume"), fontSize: 9 },
          lineStyle: { color: "#10b981" },
        });
      }
    }

    // Daytime/nighttime boundary
    if (pricingSnapshot) {
      const daytimeEnd = pricingSnapshot.config.daytime_end;
      if (daytimeEnd) {
        const [hh, mm] = daytimeEnd.split(":").map(Number);
        const startDay = dayjs(startAt);
        let boundary = startDay.startOf("day").add(hh, "hour").add(mm, "minute").valueOf();
        if (boundary < startAt) boundary += 24 * 60 * 60 * 1000;
        if (boundary > startAt && boundary < endAt) {
          const idx = Math.floor((boundary - startAt) / HALF_HOUR_MS);
          markLines.push({
            xAxis: Math.min(idx, intervals - 1),
            label: { formatter: t("dashSettle.chartNight"), fontSize: 9 },
            lineStyle: { color: "#8b5cf6" },
          });
        }
      }
    }

    return {
      animation: true,
      grid: { top: 20, bottom: 30, left: 40, right: 10 },
      xAxis: { type: "category", data: labels, axisLabel: { fontSize: 10 } },
      yAxis: {
        type: "value",
        axisLabel: { fontSize: 10, formatter: (v: number) => `¥${(v / 100).toFixed(0)}` },
      },
      series: [
        {
          type: "bar",
          data: barData,
          itemStyle: { color: "#6366f1", borderRadius: [4, 4, 0, 0] },
          markLine: markLines.length > 0 ? {
            silent: true,
            symbol: "none",
            lineStyle: { type: "dashed", color: "#f59e0b" },
            data: markLines,
          } : undefined,
        },
      ],
      tooltip: {
        trigger: "axis",
        formatter: (params: Array<{ name: string; value: number }>) => {
          const p = params[0];
          return t("dashSettle.chartTooltip", { name: p?.name ?? "", price: formatPrice(p?.value ?? 0) }).replace("\n", "<br/>");
        },
      },
    };
  }, [preview, pricingSnapshot]);

  // Handle preset selection
  const handlePresetSelect = (preset: UserCardState['paymentPreset']) => {
    if (presetDisabled[preset]) return;
    const patch: Partial<UserCardState> = { paymentPreset: preset };
    switch (preset) {
      case 'stored_value':
        patch.deductAmount = calculatedPrice;
        patch.deductPoints = 0;
        break;
      case 'points':
        patch.deductAmount = 0;
        patch.deductPoints = finalPoints;
        break;
      case 'external':
        patch.deductAmount = 0;
        patch.deductPoints = 0;
        break;
      case 'custom':
        patch.deductAmount = calculatedPrice;
        patch.deductPoints = finalPoints;
        break;
    }
    onStateChange(patch);
  };

  // Preset card description
  const getPresetDescription = (key: UserCardState['paymentPreset']): string => {
    switch (key) {
      case 'stored_value':
        return `-¥${(calculatedPrice / 100).toFixed(2)}`;
      case 'points':
        return t("dashSettle.ptsDeductSummary", { amount: finalPoints });
      case 'external':
        return t("dashSettle.noDeduction");
      case 'custom':
        return t("dashSettle.customDeduction");
    }
  };

  // Settled receipt view
  if (state.settled) {
    return (
      <div ref={ref} id={`card-${preview.order.id}`} className="bg-base-200 rounded-xl p-5 mb-4 opacity-70">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="size-5 text-success" />
            <span className="font-bold">{preview.order.nickname ?? preview.order.uid ?? t("dashSettle.userFallback")}</span>
            <span className="badge badge-success badge-sm">{t("dashSettle.settledBadge")}</span>
          </div>
          <span className="font-mono text-lg font-bold">{formatDualPrice(preview.finalPrice, finalPoints)}</span>
        </div>
        <div className="text-sm text-base-content/60 space-y-1">
          <div>{t("dashSettle.durationSummary", { billable: formatMinutes(preview.billableMinutes, t), paused: formatMinutes(preview.pausedMinutes, t) })}</div>
          <div>{t("dashSettle.tableLabel", { name: preview.order.table?.name ?? "-" })}</div>
          {state.deductAmount > 0 && <div>{t("dashSettle.svDeductSummary", { amount: formatPrice(state.deductAmount) })}</div>}
          {state.deductPoints > 0 && <div>{t("dashSettle.ptsDeductSummary", { amount: formatPoints(state.deductPoints) })}</div>}
          {state.pointsChange !== 0 && <div>{t("dashSettle.pointsChangeSummary", { change: `${state.pointsChange > 0 ? "+" : ""}${state.pointsChange}` })}</div>}
          {state.note && <div>{t("dashSettle.noteSummary", { note: state.note })}</div>}
        </div>
        <div className="flex gap-2 mt-3">
          <Link to="/dash/tables/$id" params={{ id: preview.order.table?.id ?? "" }} search={{ tab: "basic" }} className="btn btn-xs btn-ghost gap-1">
            <LinkIcon className="size-3" /> {t("dashSettle.tableDetailLink")}
          </Link>
          {preview.order.userId && (
            <Link to="/dash/users/$id" params={{ id: preview.order.userId }} search={{ tab: "basic" }} className="btn btn-xs btn-ghost gap-1">
              <UserIcon className="size-3" /> {t("dashSettle.userDetailLink")}
            </Link>
          )}
          <Link to="/dash/orders/settle" search={{ ids: [preview.order.id] }} className="btn btn-xs btn-ghost gap-1">
            <ReceiptIcon className="size-3" /> {t("dashSettle.orderDetailLink")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} id={`card-${preview.order.id}`} className="bg-base-200 rounded-xl p-5 mb-4">
      {/* Header: user + plan selector */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UserIcon className="size-5" />
          <span className="font-bold text-lg">{preview.order.nickname ?? preview.order.uid ?? t("dashSettle.userFallback")}</span>
          <span className="text-sm text-base-content/50">{preview.order.table?.name}</span>
          <Link to="/dash/orders/settle" search={{ ids: [preview.order.id] }} className="btn btn-xs btn-ghost gap-0.5 ml-1">
            <LinkIcon className="size-3" /> {t("dashSettle.detailLink")}
          </Link>
        </div>
        <select
          className="select select-sm select-bordered"
          value={state.selectedPlan}
          onChange={(e) => onStateChange({ selectedPlan: e.target.value })}
        >
          {getPlanOptions(t).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Bar chart */}
      <div className="rounded-lg overflow-hidden mb-4 bg-base-100">
        <Suspense fallback={<div className="h-48 flex items-center justify-center"><span className="loading loading-dots" /></div>}>
          <ReactECharts option={barChartOption} style={{ height: 200 }} opts={{ renderer: "svg" }} />
        </Suspense>
      </div>

      {/* Price display - dual format */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-base-content/60">{t("dashSettle.subtotalLabel")}</span>
        <span className="font-mono text-2xl font-bold text-primary">{formatDualPrice(calculatedPrice, finalPoints)}</span>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSettle(); }}>
      {/* Payment preset cards - 2x2 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {getPaymentPresets(t).map(({ key, label }) => {
          const disabled = presetDisabled[key];
          const selected = state.paymentPreset === key;
          const reason = presetDisabledReason[key];
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => handlePresetSelect(key)}
              className={[
                "rounded-lg p-3 text-left transition-all border-2",
                selected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-base-300 bg-base-100",
                disabled ? "opacity-40 cursor-not-allowed" : "hover:border-primary/50 cursor-pointer",
              ].join(" ")}
            >
              <div className="font-semibold text-sm mb-1">{label}</div>
              {disabled && reason ? (
                <div className="text-xs text-error">{reason}</div>
              ) : (
                <div className="text-xs text-base-content/60 font-mono">{getPresetDescription(key)}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom preset form */}
      {state.paymentPreset === 'custom' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-base-100 rounded-lg border border-base-300">
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">{t("dashSettle.storedValueDeductField")}</span></div>
            <div className="join">
              <span className="join-item btn btn-sm btn-disabled font-mono">-</span>
              <input
                type="number"
                className="input input-bordered input-sm font-mono join-item w-full"
                value={Math.abs(state.deductAmount) / 100}
                min={0}
                step={0.01}
                onChange={(e) => onStateChange({ deductAmount: Math.round(Math.abs(Number(e.target.value)) * 100) })}
              />
            </div>
          </label>
          <label className="form-control">
            <div className="label"><span className="label-text text-xs">{t("dashSettle.pointsDeductField")}</span></div>
            <div className="join">
              <span className="join-item btn btn-sm btn-disabled font-mono">-</span>
              <input
                type="number"
                className="input input-bordered input-sm font-mono join-item w-full"
                value={Math.abs(state.deductPoints)}
                min={0}
                step={1}
                onChange={(e) => onStateChange({ deductPoints: Math.abs(Math.round(Number(e.target.value))) })}
              />
            </div>
          </label>
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-2 mb-3">
        <Link to="/dash/orders" search={{ q: "", sortBy: "start_at", sortOrder: "desc", groupBy: "none", page: "1" }} className="btn btn-xs btn-ghost gap-1">
          <LinkIcon className="size-3" /> {t("dashSettle.orderListLink")}
        </Link>
        <Link to="/dash/tables/$id" params={{ id: preview.order.table?.id ?? "" }} search={{ tab: "basic" }} className="btn btn-xs btn-ghost gap-1">
          <LinkIcon className="size-3" /> {t("dashSettle.tableDetailLink")}
        </Link>
        {preview.order.userId && (
          <Link to="/dash/users/$id" params={{ id: preview.order.userId }} search={{ tab: "basic" }} className="btn btn-xs btn-ghost gap-1">
            <UserIcon className="size-3" /> {t("dashSettle.userDetailLink")}
          </Link>
        )}
      </div>

      {/* Note */}
      <textarea
        className="textarea textarea-bordered w-full textarea-sm mb-4"
        placeholder={t("dashSettle.notePlaceholder")}
        rows={2}
        value={state.note}
        onChange={(e) => onStateChange({ note: e.target.value })}
      />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button type="submit" className="btn btn-sm btn-primary flex-1 gap-1">
          <CheckCircleIcon className="size-4" /> {t("dashSettle.settleBtn")}
        </button>
        <button type="button" className="btn btn-sm btn-ghost gap-1" onClick={onResume}>
          <ClockIcon className="size-4" /> {t("dashSettle.resumeBillingBtn")}
        </button>
      </div>
      </form>
    </div>
  );
});

// === Pending Bar ===

function PendingBar({
  settledCount,
  totalCount,
  onScrollToPending,
  allSettled,
}: {
  settledCount: number;
  totalCount: number;
  onScrollToPending: () => void;
  allSettled: boolean;
}) {
  const { t } = useTranslation();
  if (allSettled) return null;
  return (
    <div className="sticky bottom-4 z-30 mx-auto max-w-md">
      <div className="bg-base-100 shadow-lg rounded-full px-5 py-3 flex items-center justify-between border border-base-300">
        <span className="text-sm font-medium">
          {t("dashSettle.pendingCount")} <span className="font-bold text-primary">{settledCount}/{totalCount}</span>
        </span>
        <button type="button" className="btn btn-xs btn-primary" onClick={onScrollToPending}>
          {t("dashSettle.goToPending")}
        </button>
      </div>
    </div>
  );
}
