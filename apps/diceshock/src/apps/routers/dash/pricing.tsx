import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  ClockIcon,
  CloudArrowUpIcon,
  DotsSixVerticalIcon,
  FloppyDiskIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import { trpcClientDash } from "@/shared/utils/trpc";
import { pricingDataAtom } from "./pricing_.$id";

function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const Route = createFileRoute("/dash/pricing")({
  component: PricingPage,
});

type SnapshotData = Awaited<
  ReturnType<typeof trpcClientDash.pricingPlansManagement.load.query>
>["data"];

type PlanEntry = SnapshotData["plans"][number];
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
  member:
    | { type: "irrelevant" }
    | { type: "non_member" }
    | { type: "any_member" }
    | { type: "specific"; planTypes: string[] };
  scope: string[];
};

type SnapshotRow = Awaited<
  ReturnType<typeof trpcClientDash.pricingPlansManagement.listSnapshots.query>
>[number];

const PLAN_TYPE_OPTIONS = [
  { value: "yearly", label: "桌面通行证 LTS" },
  { value: "monthly", label: "桌面通行证" },
  { value: "monthly_cc", label: "CC桌面通行证" },
  { value: "stored_value", label: "Table AGENT 储值卡" },
];

const SCOPE_OPTIONS = [
  { value: "boardgame", label: "桌游" },
  { value: "mahjong", label: "日麻" },
  { value: "trpg", label: "跑团" },
  { value: "console", label: "电玩" },
];

const WEEKDAY_OPTIONS = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 0, label: "周日" },
];

const MONTHLY_UNIT_OPTIONS = [
  { value: "natural" as const, label: "自然日" },
  { value: "workday" as const, label: "工作日" },
  { value: "holiday" as const, label: "节假日" },
];

function centsToYuan(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toString();
}

function getDateLabel(date: Conditions["date"]): string {
  switch (date.type) {
    case "fixed":
      return `${date.start} ~ ${date.end}`;
    case "workdays":
      return "全部工作日";
    case "holidays":
      return "全部节假日";
    case "weekly":
      return `每周${date.days.map((d: number) => WEEKDAY_OPTIONS.find((o) => o.value === d)?.label ?? d).join("/")}`;
    case "monthly":
      return `每月第${date.nth}个${MONTHLY_UNIT_OPTIONS.find((o) => o.value === date.unit)?.label ?? date.unit}`;
    default:
      return "";
  }
}

function getTimeLabel(time: Conditions["time"]): string {
  switch (time.type) {
    case "all_day":
      return "全天";
    case "daytime":
      return "白天";
    case "nighttime":
      return "晚上";
    case "custom":
      return `${time.start}~${time.end}`;
    default:
      return "";
  }
}

function getMemberLabel(member: Conditions["member"]): string {
  switch (member.type) {
    case "irrelevant":
      return "会员无关";
    case "non_member":
      return "非会员";
    case "any_member":
      return "任意会员";
    case "specific":
      return member.planTypes
        .map(
          (pt: string) =>
            PLAN_TYPE_OPTIONS.find((o) => o.value === pt)?.label ?? pt,
        )
        .join(", ");
    default:
      return "";
  }
}

function formatTime(val: Date | number | null | undefined): string {
  if (val == null) return "";
  const d = val instanceof Date ? val : new Date(Number(val));
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EMPTY_DATA: SnapshotData = {
  config: { daytime_start: "10:00", daytime_end: "18:00" },
  plans: [],
};

function PricingPage() {
  const msg = useMsg();
  const navigate = useNavigate();

  const [data, setData] = useState<SnapshotData>(EMPTY_DATA);
  const [savedData, setSavedData] = useState<SnapshotData>(EMPTY_DATA);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pricingAtom, setPricingAtom] = useAtom(pricingDataAtom);

  const hasChanges = !isEqual(data, savedData);
  const hasDraft = snapshots.some((s) => s.status === "draft");

  useEffect(() => {
    setPricingAtom(data);
  }, [data, setPricingAtom]);

  useEffect(() => {
    if (pricingAtom && !isEqual(pricingAtom, data)) {
      setData(pricingAtom);
    }
  }, [pricingAtom]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [loaded, snapshotList] = await Promise.all([
        trpcClientDash.pricingPlansManagement.load.query(),
        trpcClientDash.pricingPlansManagement.listSnapshots.query(),
      ]);
      const d = loaded.data ?? EMPTY_DATA;
      setData(d);
      setSavedData(d);
      setSnapshots(snapshotList);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [msg]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const fallbackPlan =
    data.plans.find((p) => p.plan_type === "fallback") ?? null;
  const conditionalPlans = data.plans.filter(
    (p) => p.plan_type === "conditional",
  );

  const updatePlan = (index: number, updates: Partial<PlanEntry>) => {
    setData((prev) => ({
      ...prev,
      plans: prev.plans.map((p, i) => (i === index ? { ...p, ...updates } : p)),
    }));
  };

  const removePlan = (index: number) => {
    setData((prev) => ({
      ...prev,
      plans: prev.plans.filter((_, i) => i !== index),
    }));
  };

  const addConditionalPlan = () => {
    const newPlan: PlanEntry = {
      plan_type: "conditional",
      name: "新条件计划",
      sort_order: conditionalPlans.length + 1,
      enabled: true,
      conditions: {
        date: { type: "workdays" },
        time: { type: "all_day" },
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
    };
    setData((prev) => ({ ...prev, plans: [...prev.plans, newPlan] }));
  };

  const addFallbackPlan = () => {
    const newPlan: PlanEntry = {
      plan_type: "fallback",
      name: "兜底计划",
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
    };
    setData((prev) => ({ ...prev, plans: [newPlan, ...prev.plans] }));
  };

  const configDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  const [configForm, setConfigForm] = useState({
    daytime_start: "10:00",
    daytime_end: "18:00",
  });

  useEffect(() => {
    setConfigForm({
      daytime_start: data.config.daytime_start,
      daytime_end: data.config.daytime_end,
    });
  }, [data.config]);

  const handleSaveConfig = () => {
    setData((prev) => ({ ...prev, config: { ...configForm } }));
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

    setData((prev) => {
      const plans = [...prev.plans];
      const [moved] = plans.splice(sourceIdx, 1);
      plans.splice(targetIdx, 0, moved);
      return {
        ...prev,
        plans: plans.map((p, i) => ({ ...p, sort_order: i })),
      };
    });
  };

  const handleToggle = (globalIdx: number) => {
    updatePlan(globalIdx, {
      enabled: !data.plans[globalIdx].enabled,
    });
  };

  const [savePending, setSavePending] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const [restorePending, setRestorePending] = useState<string | null>(null);

  const handleSaveDraft = async () => {
    setSavePending(true);
    try {
      await trpcClientDash.pricingPlansManagement.save.mutate({ data });
      setSavedData(data);
      const snapshotList =
        await trpcClientDash.pricingPlansManagement.listSnapshots.query();
      setSnapshots(snapshotList);
      msg.success("草稿已保存");
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavePending(false);
    }
  };

  const handlePublish = async () => {
    setPublishPending(true);
    try {
      await trpcClientDash.pricingPlansManagement.publish.mutate();
      const snapshotList =
        await trpcClientDash.pricingPlansManagement.listSnapshots.query();
      setSnapshots(snapshotList);
      msg.success("已发布");
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "发布失败");
    } finally {
      setPublishPending(false);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    setRestorePending(snapshotId);
    try {
      const result =
        await trpcClientDash.pricingPlansManagement.restoreSnapshot.mutate({
          id: snapshotId,
        });
      const d = (result.data ?? EMPTY_DATA) as SnapshotData;
      setData(d);
      setSavedData(d);
      const snapshotList =
        await trpcClientDash.pricingPlansManagement.listSnapshots.query();
      setSnapshots(snapshotList);
      msg.success("已回退到此版本（已创建为新草稿）");
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "回退失败");
    } finally {
      setRestorePending(null);
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
    pendingDeleteIdx != null ? data.plans[pendingDeleteIdx] : null;

  return (
    <main className="size-full overflow-y-auto">
      <div className="px-4 pt-4 flex items-center justify-between">
        <DashBackButton />
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="badge badge-warning badge-sm">未保存</span>
          )}
          <button
            type="button"
            className="btn btn-sm btn-ghost gap-2"
            onClick={() => {
              setConfigForm({
                daytime_start: data.config.daytime_start,
                daytime_end: data.config.daytime_end,
              });
              configDialogRef.current?.showModal();
            }}
          >
            <ClockIcon className="size-4" />
            时段设置
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 pb-28 space-y-6">
        <div className="text-sm text-base-content/60">
          白天 {data.config.daytime_start} ~ {data.config.daytime_end} / 晚上{" "}
          {data.config.daytime_end} ~ 次日{data.config.daytime_start}
        </div>

        {/* Fallback */}
        {!fallbackPlan ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body items-center py-8 gap-4">
              <p className="text-base-content/60">尚未创建兜底计划</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={addFallbackPlan}
              >
                初始化兜底计划
              </button>
            </div>
          </div>
        ) : (
          <FallbackSection
            plan={fallbackPlan}
            onChange={(updates) => {
              const idx = data.plans.findIndex(
                (p) => p.plan_type === "fallback",
              );
              if (idx !== -1) updatePlan(idx, updates);
            }}
          />
        )}

        {/* Conditional */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">条件计划</h2>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={addConditionalPlan}
          >
            <PlusIcon className="size-4" />
            新建条件计划
          </button>
        </div>

        {conditionalPlans.length === 0 ? (
          <div className="py-12 text-center text-base-content/60">
            暂无条件计划。点击上方按钮新建。
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.plans.map((plan, globalIdx) => {
              if (plan.plan_type !== "conditional") return null;
              const cond = (plan.conditions ?? {
                date: { type: "workdays" },
                time: { type: "all_day" },
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
                          <span className="font-semibold">{plan.name}</span>
                          {!plan.enabled && (
                            <span className="badge badge-ghost badge-sm">
                              未启用
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="badge badge-outline badge-xs">
                            {getDateLabel(cond.date)}
                          </span>
                          <span className="badge badge-outline badge-xs">
                            {getTimeLabel(cond.time)}
                          </span>
                          {cond.member.type !== "irrelevant" && (
                            <span className="badge badge-outline badge-xs">
                              {getMemberLabel(cond.member)}
                            </span>
                          )}
                          {cond.scope.length > 0 && (
                            <span className="badge badge-outline badge-xs">
                              {cond.scope
                                .map(
                                  (s: string) =>
                                    SCOPE_OPTIONS.find((o) => o.value === s)
                                      ?.label ?? s,
                                )
                                .join("/")}
                            </span>
                          )}
                          <span className="badge badge-outline badge-xs">
                            {plan.billing_type === "fixed"
                              ? `固定 ¥${centsToYuan(plan.price)}`
                              : `¥${centsToYuan(plan.price)}/时`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="toggle toggle-sm toggle-success"
                          checked={plan.enabled}
                          onChange={() => handleToggle(globalIdx)}
                        />
                        <Link
                          to="/dash/pricing/$id"
                          params={{ id: String(globalIdx) }}
                          className="btn btn-xs btn-ghost"
                        >
                          <PencilSimpleIcon className="size-4" />
                          编辑
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

        {/* History */}
        <div className="mt-8">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-semibold text-base-content/70 hover:text-base-content transition-colors"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <CaretDownIcon
              className={`size-4 transition-transform ${historyOpen ? "rotate-0" : "-rotate-90"}`}
            />
            历史记录 ({snapshots.length})
          </button>

          {historyOpen && (
            <div className="mt-3 flex flex-col gap-2">
              {snapshots.length === 0 ? (
                <div className="py-6 text-center text-base-content/50 text-sm">
                  暂无保存记录
                </div>
              ) : (
                snapshots.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between bg-base-200 rounded-lg px-4 py-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`badge badge-sm ${s.status === "published" ? "badge-success" : "badge-ghost"}`}
                        >
                          {s.status === "published" ? "已发布" : "草稿"}
                        </span>
                        <span className="text-sm">
                          {formatTime(s.created_at)}
                        </span>
                        {s.published_at && (
                          <span className="text-xs text-base-content/50">
                            · 发布于 {formatTime(s.published_at)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-base-content/50">
                        {s.summary}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost gap-1"
                      onClick={() => void handleRestore(s.id)}
                      disabled={restorePending === s.id}
                    >
                      <ArrowCounterClockwiseIcon className="size-3.5" />
                      {restorePending === s.id ? "回退中..." : "回退"}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-200 px-4 py-3 flex items-center justify-end gap-3 z-50">
        {hasChanges && (
          <span className="text-xs text-warning mr-auto">有未保存的改动</span>
        )}
        <button
          type="button"
          className="btn btn-sm gap-2"
          onClick={() => void handleSaveDraft()}
          disabled={savePending || !hasChanges}
        >
          <FloppyDiskIcon className="size-4" />
          {savePending ? "保存中..." : "保存草稿"}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary gap-2"
          onClick={() => void handlePublish()}
          disabled={publishPending || hasChanges || !hasDraft}
          title={
            hasChanges ? "请先保存草稿" : !hasDraft ? "没有可发布的草稿" : ""
          }
        >
          <CloudArrowUpIcon className="size-4" />
          {publishPending ? "发布中..." : "发布"}
        </button>
      </div>

      {/* Config dialog */}
      <dialog ref={configDialogRef} className="modal">
        <div className="modal-box">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">时段设置</h3>
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
              <span className="label text-sm font-semibold">白天开始时间</span>
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
              <span className="label text-sm font-semibold">白天结束时间</span>
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
              确认
            </button>
          </div>
        </div>
      </dialog>

      {/* Delete dialog */}
      <dialog ref={deleteDialogRef} className="modal">
        {pendingDeletePlan && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">确认删除计划</h3>
            <p>
              确定要删除 <strong>{pendingDeletePlan.name}</strong>{" "}
              吗？此操作需保存后生效。
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
                取消
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={confirmDelete}
              >
                确认删除
              </button>
            </div>
          </div>
        )}
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
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="card-title text-lg">兜底计划</h2>
          <span className="badge badge-success badge-sm">始终生效</span>
        </div>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="label text-sm font-semibold">每小时价格 (元)</span>
            <input
              type="number"
              className="input input-bordered w-full max-w-xs"
              value={centsToYuan(plan.price)}
              onChange={(e) => {
                const n = Number.parseFloat(e.target.value);
                onChange({ price: Number.isNaN(n) ? 0 : Math.round(n * 100) });
              }}
              min={0}
              step={0.01}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="label text-sm font-semibold">封顶设置</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fallback-cap-unit"
                  className="radio radio-sm"
                  checked={plan.cap_unit === "per_day"}
                  onChange={() =>
                    onChange({
                      cap_unit: "per_day",
                      cap_price_day: null,
                      cap_price_night: null,
                    })
                  }
                />
                <span className="text-sm">按天封顶</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fallback-cap-unit"
                  className="radio radio-sm"
                  checked={plan.cap_unit === "split_day_night"}
                  onChange={() =>
                    onChange({ cap_unit: "split_day_night", cap_price: null })
                  }
                />
                <span className="text-sm">白天/晚上分别封顶</span>
              </label>
            </div>

            {plan.cap_unit === "per_day" ? (
              <label className="flex flex-col gap-1">
                <span className="text-sm text-base-content/60">
                  封顶价格 (元)
                </span>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full max-w-xs"
                  value={centsToYuan(plan.cap_price)}
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
            ) : (
              <div className="flex gap-4">
                <label className="flex flex-col gap-1 flex-1 max-w-xs">
                  <span className="text-sm text-base-content/60">
                    白天封顶 (元)
                  </span>
                  <input
                    type="number"
                    className="input input-bordered input-sm w-full"
                    value={centsToYuan(plan.cap_price_day)}
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
                    晚上封顶 (元)
                  </span>
                  <input
                    type="number"
                    className="input input-bordered input-sm w-full"
                    value={centsToYuan(plan.cap_price_night)}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
