import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  ClockIcon,
  CloudArrowUpIcon,
  DotsSixVerticalIcon,
  EyeIcon,
  FloppyDiskIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useImmerAtom } from "jotai-immer";
import { useEffect, useRef, useState } from "react";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  type PricingSnapshotsQuery,
  usePricingDraftQuery,
  usePricingSnapshotQuery,
  usePricingSnapshotsQuery,
  usePublishPricingSnapshotMutation,
  useRestorePricingSnapshotMutation,
  useSavePricingSnapshotMutation,
} from "@/client/graphql/__generated__";
import { useAdminStoreFilter } from "@/client/hooks/useAdminStoreFilter";
import { useTranslation } from "@/client/hooks/useTranslation";
import { formatMessage } from "@/shared/i18n";
import { pricingStoreAtom, EMPTY_DATA, type SnapshotData, type PlanEntry } from "./pricing.store";

function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const Route = createFileRoute("/dash/pricing")({
  component: PricingPage,
});

type Identity = "temporary" | "registered";
type Translator = ReturnType<typeof useTranslation>["t"];

type Conditions = NonNullable<PlanEntry["conditions"]> & {
  date:
    | { type: "fixed"; start: string; end: string }
    | { type: "workdays" }
    | { type: "holidays" }
    | { type: "weekly"; days: number[] }
    | { type: "monthly"; nth: number; unit: "natural" | "workday" | "holiday" };
  time:
    | { type: "all_day" }
    | { type: "daytime" }
    | { type: "nighttime" }
    | { type: "custom"; start: string; end: string };
  identity: Identity[];
  member:
    | { type: "irrelevant" }
    | { type: "non_member" }
    | { type: "any_member" }
    | { type: "specific"; planTypes: string[] };
  scope: string[];
};

type SnapshotRow = NonNullable<
  ReturnType<typeof usePricingSnapshotsQuery>["data"]
>["pricingSnapshots"][number];

const PLAN_TYPE_OPTIONS = [
  { value: "yearly", labelKey: "dashPricing.planTypes.yearly" },
  { value: "monthly", labelKey: "dashPricing.planTypes.monthly" },
  { value: "monthly_cc", labelKey: "dashPricing.planTypes.monthlyCc" },
  { value: "stored_value", labelKey: "dashPricing.planTypes.storedValue" },
];

const SCOPE_OPTIONS = [
  { value: "boardgame", labelKey: "dashPricing.scopes.boardgame" },
  { value: "mahjong", labelKey: "dashPricing.scopes.mahjong" },
  { value: "trpg", labelKey: "dashPricing.scopes.trpg" },
  { value: "console", labelKey: "dashPricing.scopes.console" },
];

const WEEKDAY_OPTIONS = [
  { value: 1, labelKey: "dashPricing.weekdays.monday" },
  { value: 2, labelKey: "dashPricing.weekdays.tuesday" },
  { value: 3, labelKey: "dashPricing.weekdays.wednesday" },
  { value: 4, labelKey: "dashPricing.weekdays.thursday" },
  { value: 5, labelKey: "dashPricing.weekdays.friday" },
  { value: 6, labelKey: "dashPricing.weekdays.saturday" },
  { value: 0, labelKey: "dashPricing.weekdays.sunday" },
];

const MONTHLY_UNIT_OPTIONS = [
  { value: "natural" as const, labelKey: "dashPricing.monthlyUnits.natural" },
  { value: "workday" as const, labelKey: "dashPricing.monthlyUnits.workday" },
  { value: "holiday" as const, labelKey: "dashPricing.monthlyUnits.holiday" },
];

function centsToYuan(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toString();
}

function getDateLabel(date: Conditions["date"], t: Translator): string {
  switch (date.type) {
    case "fixed":
      return `${date.start} ~ ${date.end}`;
    case "workdays":
      return t("dashPricing.labels.allWorkdays");
    case "holidays":
      return t("dashPricing.labels.allHolidays");
    case "weekly":
      return formatMessage(t("dashPricing.labels.weekly"), {
        days: date.days
          .map((d: number) => {
            const option = WEEKDAY_OPTIONS.find((o) => o.value === d);
            return option ? t(option.labelKey) : d;
          })
          .join("/"),
      });
    case "monthly":
      return formatMessage(t("dashPricing.labels.monthlyNth"), {
        nth: date.nth,
        unit: (() => {
          const option = MONTHLY_UNIT_OPTIONS.find(
            (o) => o.value === date.unit,
          );
          return option ? t(option.labelKey) : date.unit;
        })(),
      });
    default:
      return "";
  }
}

function getTimeLabel(time: Conditions["time"], t: Translator): string {
  switch (time.type) {
    case "all_day":
      return t("dashPricing.labels.allDay");
    case "daytime":
      return t("dashPricing.labels.daytime");
    case "nighttime":
      return t("dashPricing.labels.nighttime");
    case "custom":
      return `${time.start}~${time.end}`;
    default:
      return "";
  }
}

const IDENTITY_LABEL_KEYS: Record<string, string> = {
  temporary: "dashPricing.identities.temporary",
  registered: "dashPricing.identities.registered",
};

function getIdentityLabel(identity: string[], t: Translator): string {
  if (!identity || identity.length === 0)
    return t("dashPricing.identities.registered");
  return identity
    .map((v) => (IDENTITY_LABEL_KEYS[v] ? t(IDENTITY_LABEL_KEYS[v]) : v))
    .join(", ");
}

function getMemberLabel(member: Conditions["member"], t: Translator): string {
  switch (member.type) {
    case "irrelevant":
      return t("dashPricing.members.irrelevant");
    case "non_member":
      return t("dashPricing.members.nonMember");
    case "any_member":
      return t("dashPricing.members.anyMember");
    case "specific":
      return member.planTypes
        .map((pt: string) => {
          const option = PLAN_TYPE_OPTIONS.find((o) => o.value === pt);
          return option ? t(option.labelKey) : pt;
        })
        .join(", ");
    default:
      return "";
  }
}

function formatTime(val: Date | number | string | null | undefined): string {
  if (val == null) return "";
  const d = val instanceof Date ? val : new Date(Number(val));
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseSnapshotData(raw: {
  config?: { daytimeStart?: string | null; daytimeEnd?: string | null } | null;
  plans?: string | null;
}): SnapshotData | null {
  if (!raw.plans) return null;
  try {
    return {
      config: {
        daytime_start: raw.config?.daytimeStart ?? "10:00",
        daytime_end: raw.config?.daytimeEnd ?? "18:00",
      },
      plans: JSON.parse(raw.plans),
    };
  } catch {
    return null;
  }
}

function PricingPage() {
  const msg = useMsg();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { storeFilter } = useAdminStoreFilter();

  const [store, setStore] = useImmerAtom(pricingStoreAtom);

  const { data: qlData, loading } = usePricingDraftQuery();
  const { data: snapshotsData } = usePricingSnapshotsQuery();
  const [saveSnapshot] = useSavePricingSnapshotMutation();
  const [publishSnapshot] = usePublishPricingSnapshotMutation();
  const [restoreSnapshot] = useRestorePricingSnapshotMutation();
  const { data: detailData, refetch: refetchDetail } = usePricingSnapshotQuery({
    variables: { id: "" },
    skip: true,
  });

  const snapshots = snapshotsData?.pricingSnapshots ?? [];

  useEffect(() => {
    if (qlData?.pricingDraft && !store.initialized) {
      const parsed = parseSnapshotData(qlData.pricingDraft.data);
      const d = parsed ?? EMPTY_DATA;
      setStore((draft) => {
        draft.data = d;
        draft.savedData = d;
        draft.snapshotName =
          qlData.pricingDraft!.snapshotName ?? t("dashPricing.untitled");
        draft.initialized = true;
      });
    }
  }, [qlData, store.initialized, setStore, t]);

  const effectiveData = store.data;
  const hasChanges = !isEqual(effectiveData, store.savedData);
  const hasDraft = snapshots.some((s: PricingSnapshotsQuery["pricingSnapshots"][number]) => s.status === "DRAFT");

  const fallbackPlan =
    effectiveData.plans.find(
      (p: Record<string, unknown>) => p.plan_type === "fallback",
    ) ?? null;
  const conditionalPlans = effectiveData.plans.filter(
    (p: Record<string, unknown>) => p.plan_type === "conditional",
  );

  const updatePlan = (index: number, updates: Partial<PlanEntry>) => {
    setStore((draft) => {
      Object.assign(draft.data.plans[index], updates);
    });
  };

  const removePlan = (index: number) => {
    setStore((draft) => {
      draft.data.plans.splice(index, 1);
    });
  };

  const addConditionalPlan = () => {
    setStore((draft) => {
      draft.data.plans.push({
        plan_type: "conditional",
        name: t("dashPricing.defaultConditionalPlanName"),
        sort_order: draft.data.plans.filter(
          (p: Record<string, unknown>) => p.plan_type === "conditional",
        ).length + 1,
        enabled: true,
        conditions: {
          date: { type: "workdays" },
          time: { type: "all_day" },
          identity: ["registered"],
          member: { type: "irrelevant" },
          scope: [],
        },
        billing_type: "hourly",
        price: 1000,
        cap_enabled: true,
        cap_unit: "per_day",
        cap_price: 5000,
        cap_price_day: null,
        cap_price_night: null,
      });
    });
  };

  const addFallbackPlan = () => {
    setStore((draft) => {
      draft.data.plans.unshift({
        plan_type: "fallback",
        name: t("dashPricing.fallbackPlan"),
        sort_order: 0,
        enabled: true,
        conditions: null,
        billing_type: "hourly",
        price: 1000,
        cap_enabled: true,
        cap_unit: "per_day",
        cap_price: 5000,
        cap_price_day: null,
        cap_price_night: null,
      });
    });
  };

  const configDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  const [historyOpen, setHistoryOpen] = useState(false);

  const [configForm, setConfigForm] = useState({
    daytime_start: "10:00",
    daytime_end: "18:00",
  });

  useEffect(() => {
    setConfigForm({
      daytime_start: effectiveData.config.daytime_start,
      daytime_end: effectiveData.config.daytime_end,
    });
  }, [effectiveData.config]);

  const handleSaveConfig = () => {
    setStore((draft) => {
      draft.data.config = { ...configForm };
    });
    configDialogRef.current?.close();
  };

  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);

  const openDeleteDialog = (globalIdx: number) => {
    setPendingDeleteIdx(globalIdx);
    setTimeout(() => deleteDialogRef.current?.showModal(), 0);
  };

  const confirmDelete = () => {
    if (pendingDeleteIdx != null) {
      removePlan(pendingDeleteIdx);
      deleteDialogRef.current?.close();
      setPendingDeleteIdx(null);
    }
  };

  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const handleDragStart = (idx: number) => {
    dragItemRef.current = idx;
  };

  const handleDrop = (targetIdx: number) => {
    setDragOverIdx(null);
    const sourceIdx = dragItemRef.current;
    dragItemRef.current = null;
    if (sourceIdx == null || sourceIdx === targetIdx) return;

    setStore((draft) => {
      const plans = draft.data.plans;
      const [moved] = plans.splice(sourceIdx, 1);
      if (!moved) return;
      plans.splice(targetIdx, 0, moved);
      for (let i = 0; i < plans.length; i++) {
        plans[i].sort_order = i;
      }
    });
  };

  const handleToggle = (globalIdx: number) => {
    setStore((draft) => {
      draft.data.plans[globalIdx].enabled = !draft.data.plans[globalIdx].enabled;
    });
  };

  const [savePending, setSavePending] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const [restorePending, setRestorePending] = useState<string | null>(null);
  const saveDialogRef = useRef<HTMLDialogElement>(null);

  const handleSaveDraft = async () => {
    if (!store.snapshotName.trim()) {
      msg.error(t("dashPricing.errors.enterSnapshotName"));
      return;
    }
    setSavePending(true);
    try {
      await saveSnapshot({
        variables: {
          input: {
            name: store.snapshotName.trim(),
            data: {
              config: JSON.stringify({
                daytimeStart: effectiveData.config.daytime_start,
                daytimeEnd: effectiveData.config.daytime_end,
              }),
              plans: JSON.stringify(effectiveData.plans),
            },
          },
        },
      });
      setStore((draft) => {
        draft.savedData = draft.data;
      });
      saveDialogRef.current?.close();
      msg.success(t("dashPricing.messages.draftSaved"));
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashPricing.errors.saveFailed"),
      );
    } finally {
      setSavePending(false);
    }
  };

  const handlePublish = async () => {
    setPublishPending(true);
    try {
      await publishSnapshot();
      msg.success(t("dashPricing.messages.published"));
    } catch (err) {
      msg.error(
        err instanceof Error
          ? err.message
          : t("dashPricing.errors.publishFailed"),
      );
    } finally {
      setPublishPending(false);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    setRestorePending(snapshotId);
    try {
      const result = await restoreSnapshot({
        variables: { id: snapshotId },
      });
      const parsed = parseSnapshotData(
        result.data?.restorePricingSnapshot?.data ?? {},
      );
      const d = parsed ?? EMPTY_DATA;
      setStore((draft) => {
        draft.data = d;
        draft.savedData = d;
      });
      msg.success(t("dashPricing.messages.restored"));
    } catch (err) {
      msg.error(
        err instanceof Error
          ? err.message
          : t("dashPricing.errors.restoreFailed"),
      );
    } finally {
      setRestorePending(null);
    }
  };

  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const [detailSnapshot, setDetailSnapshot] = useState<SnapshotRow | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const handleViewDetail = async (snapshotId: string) => {
    setDetailLoading(true);
    try {
      const result = await refetchDetail({ id: snapshotId });
      if (result.data?.pricingSnapshot) {
        setDetailSnapshot(result.data.pricingSnapshot);
      }
      detailDialogRef.current?.showModal();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashPricing.errors.loadFailed"),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  const pendingDeletePlan =
    pendingDeleteIdx != null
      ? (effectiveData.plans[pendingDeleteIdx] as
          | Record<string, unknown>
          | undefined)
      : null;

  return (
    <main className="size-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 pb-28 space-y-6 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <EditableTitle value={store.snapshotName} onChange={(v) => setStore((draft) => { draft.snapshotName = v; })} />
          </div>
          {hasChanges && (
            <span className="badge badge-warning badge-sm">
              {t("dashPricing.unsaved")}
            </span>
          )}
          <button
            type="button"
            className="btn btn-sm btn-ghost gap-2"
            onClick={() => {
              setConfigForm({
                daytime_start: effectiveData.config.daytime_start,
                daytime_end: effectiveData.config.daytime_end,
              });
              configDialogRef.current?.showModal();
            }}
          >
            <ClockIcon className="size-4" />
            {t("dashPricing.timeSettings")}
          </button>
        </div>
        <div className="text-sm text-base-content/60">
          {formatMessage(t("dashPricing.timeSummary"), {
            dayStart: effectiveData.config.daytime_start,
            dayEnd: effectiveData.config.daytime_end,
          })}
        </div>

        {!fallbackPlan ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body items-center py-8 gap-4">
              <p className="text-base-content/60">
                {t("dashPricing.noFallbackPlan")}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={addFallbackPlan}
              >
                {t("dashPricing.initializeFallbackPlan")}
              </button>
            </div>
          </div>
        ) : (
          <FallbackSection
            plan={fallbackPlan}
            onChange={(updates) => {
              const idx = effectiveData.plans.findIndex(
                (p: Record<string, unknown>) => p.plan_type === "fallback",
              );
              if (idx !== -1) updatePlan(idx, updates);
            }}
          />
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {t("dashPricing.conditionalPlans")}
          </h2>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={addConditionalPlan}
          >
            <PlusIcon className="size-4" />
            {t("dashPricing.newConditionalPlan")}
          </button>
        </div>

        {conditionalPlans.length === 0 ? (
          <div className="py-12 text-center text-base-content/60">
            {t("dashPricing.noConditionalPlans")}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Virtual free-period plan — display only, not persisted */}
            <div className="card bg-base-100 shadow-sm border border-dashed border-base-content/20 opacity-80">
              <div className="card-body p-4">
                <div className="flex items-center gap-3">
                  <div className="text-base-content/30">
                    <ClockIcon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base-content/70">
                        {t("dashPricing.freePeriodPlanName")}
                      </span>
                      <span className="badge badge-ghost badge-xs">
                        {t("dashPricing.firstThirtyFree")}
                      </span>
                    </div>
                    <p className="text-xs text-base-content/50 mt-1">
                      {t("dashPricing.freePeriodPlanDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {effectiveData.plans.map((plan, globalIdx) => {
              const p = plan as Record<string, unknown>;
              if (p.plan_type !== "conditional") return null;
              const cond = ((p.conditions as Conditions) ?? {
                date: { type: "workdays" },
                time: { type: "all_day" },
                identity: ["registered"],
                member: { type: "irrelevant" },
                scope: [],
              }) as Conditions;

              return (
                <div
                  key={globalIdx}
                  draggable
                  onDragStart={() => handleDragStart(globalIdx)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIdx(globalIdx);
                  }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(globalIdx);
                  }}
                  className={`card bg-base-100 shadow-sm transition-all ${dragOverIdx === globalIdx ? "ring-2 ring-primary" : ""}`}
                  style={{
                    opacity: dragOverIdx === globalIdx ? 0.6 : 1,
                  }}
                >
                  <div className="card-body p-4">
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab active:cursor-grabbing text-base-content/40 hover:text-base-content/70">
                        <DotsSixVerticalIcon className="size-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {String(p.name)}
                          </span>
                          {!p.enabled && (
                            <span className="badge badge-ghost badge-sm">
                              {t("dashPricing.disabled")}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="badge badge-outline badge-xs">
                            {getDateLabel(cond.date, t)}
                          </span>
                          <span className="badge badge-outline badge-xs">
                            {getTimeLabel(cond.time, t)}
                          </span>
                          {cond.identity &&
                            !(
                              cond.identity.length === 1 &&
                              cond.identity[0] === "registered"
                            ) && (
                              <span className="badge badge-outline badge-xs">
                                {getIdentityLabel(cond.identity, t)}
                              </span>
                            )}
                          {cond.member.type !== "irrelevant" && (
                            <span className="badge badge-outline badge-xs">
                              {getMemberLabel(cond.member, t)}
                            </span>
                          )}
                          {cond.scope.length > 0 && (
                            <span className="badge badge-outline badge-xs">
                              {cond.scope
                                .map((s: string) =>
                                  (() => {
                                    const option = SCOPE_OPTIONS.find(
                                      (o) => o.value === s,
                                    );
                                    return option ? t(option.labelKey) : s;
                                  })(),
                                )
                                .join("/")}
                            </span>
                          )}
                          <span className="badge badge-outline badge-xs">
                            {p.billing_type === "fixed"
                              ? formatMessage(t("dashPricing.billing.fixed"), {
                                  price: centsToYuan(p.price as number),
                                })
                              : formatMessage(t("dashPricing.billing.hourly"), {
                                  price: centsToYuan(p.price as number),
                                })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="toggle toggle-sm toggle-success"
                          checked={!!p.enabled}
                          onChange={() => handleToggle(globalIdx)}
                        />
                        <Link
                          to="/dash/pricing/$id"
                          params={{ id: String(globalIdx) }}
                          className="btn btn-xs btn-ghost"
                        >
                          <EyeIcon className="size-4" />
                          {t("dashPricing.details")}
                        </Link>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost btn-error"
                          onClick={() => openDeleteDialog(globalIdx)}
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-semibold text-base-content/70 hover:text-base-content transition-colors"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <CaretDownIcon
              className={`size-4 transition-transform ${historyOpen ? "rotate-0" : "-rotate-90"}`}
            />
            {formatMessage(t("dashPricing.historyWithCount"), {
              count: snapshots.length,
            })}
          </button>

          {historyOpen && (
            <div className="mt-3 flex flex-col gap-2">
              {snapshots.length === 0 ? (
                <div className="py-6 text-center text-base-content/50 text-sm">
                  {t("dashPricing.noSaveRecords")}
                </div>
              ) : (
                snapshots.map((s: PricingSnapshotsQuery["pricingSnapshots"][number]) => (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-base-200 rounded-lg px-4 py-3 gap-2 sm:gap-4"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={`badge badge-sm shrink-0 ${s.status === "PUBLISHED" ? "badge-success" : "badge-ghost"}`}
                        >
                          {s.status === "PUBLISHED"
                            ? t("dashPricing.published")
                            : t("dashPricing.draft")}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {s.name}
                        </span>
                        <span className="text-xs text-base-content/40 whitespace-nowrap">
                          {formatTime(s.createdAt)}
                        </span>
                        {s.publishedAt && (
                          <span className="text-xs text-base-content/50 whitespace-nowrap">
                            {formatMessage(t("dashPricing.publishedAtPrefix"), {
                              time: formatTime(s.publishedAt),
                            })}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-base-content/50 line-clamp-2">
                        {s.summary}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost gap-1"
                        onClick={() => void handleViewDetail(s.id)}
                        disabled={detailLoading}
                      >
                        <EyeIcon className="size-3.5" />
                        {t("dashPricing.view")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost gap-1"
                        onClick={() => void handleRestore(s.id)}
                        disabled={restorePending === s.id}
                      >
                        <ArrowCounterClockwiseIcon className="size-3.5" />
                        {restorePending === s.id
                          ? t("dashPricing.restoring")
                          : t("dashPricing.restore")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 right-0 left-0 lg:left-16 bg-base-100 border-t border-base-200 px-4 py-2 flex items-center justify-end gap-2 z-30">
        {hasChanges && (
          <span className="text-xs text-warning mr-auto">
            {t("dashPricing.unsavedChanges")}
          </span>
        )}
        <button
          type="button"
          className="btn btn-sm gap-2"
          onClick={() => saveDialogRef.current?.showModal()}
          disabled={savePending || !hasChanges}
        >
          <FloppyDiskIcon className="size-4" />
          {savePending ? t("dashPricing.saving") : t("dashPricing.saveDraft")}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary gap-2"
          onClick={() => void handlePublish()}
          disabled={publishPending || hasChanges || !hasDraft}
          title={
            hasChanges
              ? t("dashPricing.saveDraftFirst")
              : !hasDraft
                ? t("dashPricing.noDraftToPublish")
                : ""
          }
        >
          <CloudArrowUpIcon className="size-4" />
          {publishPending
            ? t("dashPricing.publishing")
            : t("dashPricing.publish")}
        </button>
      </div>

      <dialog ref={configDialogRef} className="modal">
        <div className="modal-box">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">
              {t("dashPricing.timeSettings")}
            </h3>
            <button
              type="button"
              className="btn btn-ghost btn-square btn-sm"
              onClick={() => configDialogRef.current?.close()}
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">
                {t("dashPricing.daytimeStart")}
              </span>
              <input
                type="time"
                className="input input-bordered w-full"
                value={configForm.daytime_start}
                onChange={(e) =>
                  setConfigForm({
                    ...configForm,
                    daytime_start: e.target.value,
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">
                {t("dashPricing.daytimeEnd")}
              </span>
              <input
                type="time"
                className="input input-bordered w-full"
                value={configForm.daytime_end}
                onChange={(e) =>
                  setConfigForm({
                    ...configForm,
                    daytime_end: e.target.value,
                  })
                }
              />
            </label>
          </div>
          <div className="modal-action mt-6">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveConfig}
            >
              {t("dashPricing.confirm")}
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={deleteDialogRef} className="modal">
        {pendingDeletePlan && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {t("dashPricing.confirmDeletePlan")}
            </h3>
            <p>
              {formatMessage(t("dashPricing.deletePlanPrefix"), { name: "" })}
              <strong>
                {(pendingDeletePlan as Record<string, unknown>).name as string}
              </strong>{" "}
              {t("dashPricing.deletePlanSuffix")}
            </p>
            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  deleteDialogRef.current?.close();
                  setPendingDeleteIdx(null);
                }}
              >
                {t("dashPricing.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={confirmDelete}
              >
                {t("dashPricing.confirmDelete")}
              </button>
            </div>
          </div>
        )}
      </dialog>

      <dialog ref={saveDialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">
            {t("dashPricing.saveDraft")}
          </h3>
          <label className="flex flex-col gap-2">
            <span className="label text-sm font-semibold">
              {t("dashPricing.snapshotName")}
            </span>
            <input
              type="text"
              className="input input-bordered w-full"
              value={store.snapshotName}
              onChange={(e) => setStore((draft) => { draft.snapshotName = e.target.value; })}
              placeholder={t("dashPricing.snapshotNamePlaceholder")}
              maxLength={50}
            />
          </label>
          <p className="text-xs text-base-content/50 mt-2">
            {t("dashPricing.duplicateNameHint")}
          </p>
          <div className="modal-action mt-6">
            <button
              type="button"
              className="btn"
              onClick={() => saveDialogRef.current?.close()}
            >
              {t("dashPricing.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSaveDraft()}
              disabled={savePending || !store.snapshotName.trim()}
            >
              {savePending ? t("dashPricing.saving") : t("dashPricing.save")}
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={detailDialogRef} className="modal">
        <div className="modal-box max-w-2xl max-h-[80vh]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">
              {detailSnapshot?.name ?? t("dashPricing.snapshotDetails")}
            </h3>
            <button
              type="button"
              className="btn btn-ghost btn-square btn-sm"
              onClick={() => detailDialogRef.current?.close()}
            >
              <XIcon className="size-4" />
            </button>
          </div>
          {detailSnapshot && (
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`badge badge-sm ${detailSnapshot.status === "PUBLISHED" ? "badge-success" : "badge-ghost"}`}
                >
                  {detailSnapshot.status === "PUBLISHED"
                    ? t("dashPricing.published")
                    : t("dashPricing.draft")}
                </span>
                <span className="text-base-content/60">
                  {formatMessage(t("dashPricing.savedAt"), {
                    time: formatTime(detailSnapshot.createdAt),
                  })}
                </span>
                {detailSnapshot.publishedAt && (
                  <span className="text-base-content/60">
                    {formatMessage(t("dashPricing.publishedAtPrefix"), {
                      time: formatTime(detailSnapshot.publishedAt),
                    })}
                  </span>
                )}
              </div>

              <div className="bg-base-200 rounded-lg p-3">
                <span className="font-semibold">
                  ⏰ {t("dashPricing.timeSettings")}
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2 text-base-content/60">
                  <p>
                    {formatMessage(t("dashPricing.detailDaytime"), {
                      start: detailSnapshot.data.config.daytimeStart,
                      end: detailSnapshot.data.config.daytimeEnd,
                    })}
                  </p>
                  <p>
                    {formatMessage(t("dashPricing.detailNighttime"), {
                      start: detailSnapshot.data.config.daytimeEnd,
                      end: detailSnapshot.data.config.daytimeStart,
                    })}
                  </p>
                </div>
              </div>

              {(() => {
                let parsedPlans: Record<string, unknown>[] = [];
                try {
                  parsedPlans = JSON.parse(detailSnapshot.data.plans);
                } catch (e) { console.error("[pricing] plans parse error", e); }
                return parsedPlans.map((plan, i) => {
                  const p = plan as Record<string, unknown>;
                  const cond = (p.conditions as Conditions) ?? null;
                  return (
                    <div
                      key={i}
                      className={`rounded-lg p-3 ${p.enabled ? "bg-base-200" : "bg-base-200/50 opacity-60"}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{String(p.name)}</span>
                        <span
                          className={`badge badge-xs ${p.plan_type === "fallback" ? "badge-success" : "badge-info"}`}
                        >
                          {p.plan_type === "fallback"
                            ? t("dashPricing.fallback")
                            : t("dashPricing.conditional")}
                        </span>
                        {!p.enabled && (
                          <span className="badge badge-xs badge-ghost">
                            {t("dashPricing.disabled")}
                          </span>
                        )}
                        <span className="badge badge-xs badge-outline">
                          #{String(p.sort_order)}
                        </span>
                      </div>

                      {cond && p.plan_type === "conditional" && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="badge badge-outline badge-xs">
                            📅 {getDateLabel(cond.date, t)}
                          </span>
                          <span className="badge badge-outline badge-xs">
                            🕐 {getTimeLabel(cond.time, t)}
                          </span>
                          {cond.identity &&
                            !(
                              cond.identity.length === 1 &&
                              cond.identity[0] === "registered"
                            ) && (
                              <span className="badge badge-outline badge-xs">
                                🪪 {getIdentityLabel(cond.identity, t)}
                              </span>
                            )}
                          {cond.member.type !== "irrelevant" && (
                            <span className="badge badge-outline badge-xs">
                              👤 {getMemberLabel(cond.member, t)}
                            </span>
                          )}
                          {cond.scope.length > 0 && (
                            <span className="badge badge-outline badge-xs">
                              🎮{" "}
                              {cond.scope
                                .map((s: string) =>
                                  (() => {
                                    const option = SCOPE_OPTIONS.find(
                                      (o) => o.value === s,
                                    );
                                    return option ? t(option.labelKey) : s;
                                  })(),
                                )
                                .join("/")}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-2 text-base-content/60 space-y-1">
                        <p>
                          💰 {t("dashPricing.billingLabel")}{" "}
                          {p.billing_type === "fixed"
                            ? formatMessage(t("dashPricing.billing.fixed"), {
                                price: (
                                  ((p.price as number) ?? 0) / 100
                                ).toFixed(2),
                              })
                            : formatMessage(
                                t("dashPricing.billing.hourlyWithHalfHour"),
                                {
                                  price: (
                                    ((p.price as number) ?? 0) / 100
                                  ).toFixed(2),
                                  halfHourPrice: (
                                    ((p.price as number) ?? 0) / 200
                                  ).toFixed(2),
                                },
                              )}
                        </p>
                        {p.billing_type === "hourly" && (
                          <p className="text-xs">
                            ⏳ {t("dashPricing.firstThirtyFree")}
                          </p>
                        )}
                        {Boolean(p.cap_enabled) &&
                          p.cap_unit === "per_day" &&
                          p.cap_price != null && (
                            <p>
                              🔒{" "}
                              {formatMessage(t("dashPricing.cap.perDay"), {
                                price: (
                                  ((p.cap_price as number) ?? 0) / 100
                                ).toFixed(2),
                              })}
                            </p>
                          )}
                        {Boolean(p.cap_enabled) &&
                          p.cap_unit === "split_day_night" && (
                            <p>
                              🔒{" "}
                              {formatMessage(
                                t("dashPricing.cap.splitDayNight"),
                                {
                                  dayPrice: (
                                    ((p.cap_price_day as number) ?? 0) / 100
                                  ).toFixed(2),
                                  nightPrice: (
                                    ((p.cap_price_night as number) ?? 0) / 100
                                  ).toFixed(2),
                                },
                              )}
                            </p>
                          )}
                        {!p.cap_enabled && p.billing_type === "hourly" && (
                          <p className="text-xs">{t("dashPricing.noCap")}</p>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}

              {(() => {
                let parsedPlans: Record<string, unknown>[] = [];
                try {
                  parsedPlans = JSON.parse(detailSnapshot.data.plans);
                } catch (e) { console.error("[pricing] plans parse error", e); }
                if (parsedPlans.length === 0)
                  return (
                    <div className="py-6 text-center text-base-content/50">
                      {t("dashPricing.snapshotNoPlans")}
                    </div>
                  );
                return null;
              })()}
            </div>
          )}
        </div>
      </dialog>
    </main>
  );
}

function FallbackSection({
  plan,
  onChange,
}: {
  plan: PlanEntry;
  onChange: (updates: Partial<PlanEntry>) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="card-title text-lg">
            {t("dashPricing.fallbackPlan")}
          </h2>
          <span className="badge badge-success badge-sm">
            {t("dashPricing.alwaysActive")}
          </span>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <label className="flex flex-col gap-2 flex-1">
              <span className="label text-sm font-semibold">
                {t("dashPricing.hourlyPriceYuan")}
              </span>
              <input
                type="number"
                className="input input-bordered w-full max-w-xs"
                value={centsToYuan(
                  (plan as Record<string, unknown>).price as number,
                )}
                onChange={(e) => {
                  const n = Number.parseFloat(e.target.value);
                  onChange({ price: Number.isNaN(n) ? 0 : Math.round(n * 100) });
                }}
                min={0}
                step={0.01}
              />
            </label>
            <label className="flex flex-col gap-2 flex-1">
              <span className="label text-sm font-semibold">
                点/小时
              </span>
              <input
                type="number"
                className="input input-bordered w-full max-w-xs"
                value={((plan as Record<string, unknown>).points as number) ?? 0}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  onChange({ points: Number.isNaN(n) ? 0 : n });
                }}
                min={0}
                step={1}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className="label text-sm font-semibold">
              {t("dashPricing.capSettings")}
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fallback-cap-unit"
                  className="radio radio-sm"
                  checked={
                    (plan as Record<string, unknown>).cap_unit === "per_day"
                  }
                  onChange={() =>
                    onChange({
                      cap_unit: "per_day",
                      cap_price_day: null,
                      cap_price_night: null,
                      cap_points_day: null,
                      cap_points_night: null,
                    })
                  }
                />
                <span className="text-sm">{t("dashPricing.capByDay")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fallback-cap-unit"
                  className="radio radio-sm"
                  checked={
                    (plan as Record<string, unknown>).cap_unit ===
                    "split_day_night"
                  }
                  onChange={() =>
                    onChange({
                      cap_unit: "split_day_night",
                      cap_price: null,
                      cap_points: null,
                    })
                  }
                />
                <span className="text-sm">
                  {t("dashPricing.capSplitDayNight")}
                </span>
              </label>
            </div>

            {(plan as Record<string, unknown>).cap_unit === "per_day" ? (
              <div className="flex gap-4">
                <label className="flex flex-col gap-1 flex-1 max-w-xs">
                  <span className="text-sm text-base-content/60">
                    {t("dashPricing.capPriceYuan")}
                  </span>
                  <input
                    type="number"
                    className="input input-bordered input-sm w-full"
                    value={centsToYuan(
                      (plan as Record<string, unknown>).cap_price as number,
                    )}
                    onChange={(e) => {
                      const n = Number.parseFloat(e.target.value);
                      onChange({
                        cap_price: Number.isNaN(n) ? 0 : Math.round(n * 100),
                      });
                    }}
                    min={0}
                    step={0.01}
                  />
                </label>
                <label className="flex flex-col gap-1 flex-1 max-w-xs">
                  <span className="text-sm text-base-content/60">
                    封顶点数
                  </span>
                  <input
                    type="number"
                    className="input input-bordered input-sm w-full"
                    value={((plan as Record<string, unknown>).cap_points as number) ?? 0}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      onChange({
                        cap_points: Number.isNaN(n) ? 0 : n,
                      });
                    }}
                    min={0}
                    step={1}
                  />
                </label>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex gap-4">
                  <label className="flex flex-col gap-1 flex-1 max-w-xs">
                    <span className="text-sm text-base-content/60">
                      {t("dashPricing.daytimeCapYuan")}
                    </span>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-full"
                      value={centsToYuan(
                        (plan as Record<string, unknown>).cap_price_day as number,
                      )}
                      onChange={(e) => {
                        const n = Number.parseFloat(e.target.value);
                        onChange({
                          cap_price_day: Number.isNaN(n)
                            ? 0
                            : Math.round(n * 100),
                        });
                      }}
                      min={0}
                      step={0.01}
                    />
                  </label>
                  <label className="flex flex-col gap-1 flex-1 max-w-xs">
                    <span className="text-sm text-base-content/60">
                      白天封顶点数
                    </span>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-full"
                      value={((plan as Record<string, unknown>).cap_points_day as number) ?? 0}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        onChange({
                          cap_points_day: Number.isNaN(n) ? 0 : n,
                        });
                      }}
                      min={0}
                      step={1}
                    />
                  </label>
                </div>
                <div className="flex gap-4">
                  <label className="flex flex-col gap-1 flex-1 max-w-xs">
                    <span className="text-sm text-base-content/60">
                      {t("dashPricing.nighttimeCapYuan")}
                    </span>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-full"
                      value={centsToYuan(
                        (plan as Record<string, unknown>)
                          .cap_price_night as number,
                      )}
                      onChange={(e) => {
                        const n = Number.parseFloat(e.target.value);
                        onChange({
                          cap_price_night: Number.isNaN(n)
                            ? 0
                            : Math.round(n * 100),
                        });
                      }}
                      min={0}
                      step={0.01}
                    />
                  </label>
                  <label className="flex flex-col gap-1 flex-1 max-w-xs">
                    <span className="text-sm text-base-content/60">
                      晚上封顶点数
                    </span>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-full"
                      value={((plan as Record<string, unknown>).cap_points_night as number) ?? 0}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        onChange({
                          cap_points_night: Number.isNaN(n) ? 0 : n,
                        });
                      }}
                      min={0}
                      step={1}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableTitle({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="input input-bordered text-2xl font-bold w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setEditing(false);
        }}
        maxLength={50}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-2xl font-bold">
        {value || t("dashPricing.untitled")}
      </h1>
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-square"
        onClick={() => setEditing(true)}
      >
        <PencilSimpleIcon className="size-4" />
      </button>
    </div>
  );
}
