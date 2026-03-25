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
import { useCallback, useEffect, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import { trpcClientDash } from "@/shared/utils/trpc";

export const Route = createFileRoute("/dash/pricing")({
  component: PricingPage,
});

type PricingPlan = Awaited<
  ReturnType<typeof trpcClientDash.pricingPlansManagement.list.query>
>[number];

type Conditions = NonNullable<PricingPlan["conditions"]>;

type GlobalConfig = Awaited<
  ReturnType<typeof trpcClientDash.pricingPlansManagement.getConfig.query>
>;

type Snapshot = Awaited<
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

function yuanToCents(yuan: string): number {
  const n = Number.parseFloat(yuan);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
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
      return `每周${date.days.map((d) => WEEKDAY_OPTIONS.find((o) => o.value === d)?.label ?? d).join("/")}`;
    case "monthly":
      return `每月第${date.nth}个${MONTHLY_UNIT_OPTIONS.find((o) => o.value === date.unit)?.label ?? date.unit}`;
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
        .map((pt) => PLAN_TYPE_OPTIONS.find((o) => o.value === pt)?.label ?? pt)
        .join(", ");
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

function PricingPage() {
  const msg = useMsg();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [planData, configData, snapshotData] = await Promise.all([
        trpcClientDash.pricingPlansManagement.list.query(),
        trpcClientDash.pricingPlansManagement.getConfig.query(),
        trpcClientDash.pricingPlansManagement.listSnapshots.query(),
      ]);
      setPlans(planData);
      setConfig(configData);
      setSnapshots(snapshotData);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [msg]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const fallbackPlan = plans.find((p) => p.plan_type === "fallback") ?? null;
  const conditionalPlans = plans.filter((p) => p.plan_type === "conditional");

  const configDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  const [configForm, setConfigForm] = useState({
    daytime_start: "10:00",
    daytime_end: "18:00",
  });

  useEffect(() => {
    if (config) {
      setConfigForm({
        daytime_start: config.daytime_start,
        daytime_end: config.daytime_end,
      });
    }
  }, [config]);

  const [configPending, setConfigPending] = useState(false);

  const handleSaveConfig = async () => {
    setConfigPending(true);
    try {
      await trpcClientDash.pricingPlansManagement.updateConfig.mutate(
        configForm,
      );
      msg.success("时段设置已保存");
      configDialogRef.current?.close();
      await refreshData();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setConfigPending(false);
    }
  };

  const [pendingDelete, setPendingDelete] = useState<PricingPlan | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const openDeleteDialog = (plan: PricingPlan) => {
    setPendingDelete(plan);
    setTimeout(() => deleteDialogRef.current?.showModal(), 0);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletePending(true);
    try {
      await trpcClientDash.pricingPlansManagement.remove.mutate({
        id: pendingDelete.id,
      });
      msg.success("计划已删除");
      deleteDialogRef.current?.close();
      setPendingDelete(null);
      await refreshData();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletePending(false);
    }
  };

  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragItemRef = useRef<string | null>(null);

  const handleDragStart = (id: string) => {
    dragItemRef.current = id;
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (targetId: string) => {
    setDragOverId(null);
    const sourceId = dragItemRef.current;
    dragItemRef.current = null;
    if (!sourceId || sourceId === targetId) return;

    const ids = conditionalPlans.map((p) => p.id);
    const fromIdx = ids.indexOf(sourceId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, sourceId);

    try {
      await trpcClientDash.pricingPlansManagement.reorder.mutate({ ids });
      await refreshData();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "排序失败");
    }
  };

  const [createPending, setCreatePending] = useState(false);

  const handleCreate = async () => {
    setCreatePending(true);
    try {
      const created = await trpcClientDash.pricingPlansManagement.create.mutate(
        {
          plan_type: "conditional",
          name: "新条件计划",
          billing_type: "hourly",
          price: 1000,
          conditions: {
            date: { type: "workdays" },
            time: { type: "all_day" },
            member: { type: "irrelevant" },
            scope: [],
          },
          cap_enabled: true,
          cap_unit: "per_day",
          cap_price: 5000,
        },
      );
      void navigate({
        to: "/dash/pricing/$id",
        params: { id: created.id },
      });
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreatePending(false);
    }
  };

  const handleToggle = async (plan: PricingPlan) => {
    try {
      await trpcClientDash.pricingPlansManagement.update.mutate({
        id: plan.id,
        enabled: !plan.enabled,
      });
      await refreshData();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  const [savePending, setSavePending] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const [restorePending, setRestorePending] = useState<string | null>(null);

  const handleSaveDraft = async () => {
    setSavePending(true);
    try {
      await trpcClientDash.pricingPlansManagement.saveSnapshot.mutate();
      msg.success("草稿已保存");
      await refreshData();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "保存草稿失败");
    } finally {
      setSavePending(false);
    }
  };

  const handlePublish = async () => {
    setPublishPending(true);
    try {
      await trpcClientDash.pricingPlansManagement.publish.mutate();
      msg.success("已发布");
      await refreshData();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "发布失败");
    } finally {
      setPublishPending(false);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    setRestorePending(snapshotId);
    try {
      await trpcClientDash.pricingPlansManagement.restoreSnapshot.mutate({
        id: snapshotId,
      });
      msg.success("已回退到此版本");
      await refreshData();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "回退失败");
    } finally {
      setRestorePending(null);
    }
  };

  const latestPublished = snapshots.find((s) => s.status === "published");
  const hasDraft = snapshots.some((s) => s.status === "draft");

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  return (
    <main className="size-full overflow-y-auto">
      <div className="px-4 pt-4 flex items-center justify-between">
        <DashBackButton />
        <div className="flex items-center gap-2">
          {latestPublished && (
            <span className="text-xs text-base-content/50">
              最近发布: {formatTime(latestPublished.published_at)}
            </span>
          )}
          <button
            type="button"
            className="btn btn-sm btn-ghost gap-2"
            onClick={() => {
              if (config) {
                setConfigForm({
                  daytime_start: config.daytime_start,
                  daytime_end: config.daytime_end,
                });
              }
              configDialogRef.current?.showModal();
            }}
          >
            <ClockIcon className="size-4" />
            时段设置
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 pb-28 space-y-6">
        {config && (
          <div className="text-sm text-base-content/60">
            白天 {config.daytime_start} ~ {config.daytime_end} / 晚上{" "}
            {config.daytime_end} ~ 次日{config.daytime_start}
          </div>
        )}

        <FallbackSection
          plan={fallbackPlan}
          onRefresh={refreshData}
          msg={msg}
        />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">条件计划</h2>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => void handleCreate()}
            disabled={createPending}
          >
            <PlusIcon className="size-4" />
            {createPending ? "创建中..." : "新建条件计划"}
          </button>
        </div>

        {conditionalPlans.length === 0 ? (
          <div className="py-12 text-center text-base-content/60">
            暂无条件计划。点击上方按钮新建。
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {conditionalPlans.map((plan) => {
              const cond = plan.conditions ?? {
                date: { type: "workdays" as const },
                time: { type: "all_day" as const },
                member: { type: "irrelevant" as const },
                scope: [],
              };

              return (
                <div
                  key={plan.id}
                  draggable
                  onDragStart={() => handleDragStart(plan.id)}
                  onDragOver={(e) => handleDragOver(e, plan.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    e.preventDefault();
                    void handleDrop(plan.id);
                  }}
                  className={`card bg-base-100 shadow-sm transition-all ${dragOverId === plan.id ? "ring-2 ring-primary" : ""}`}
                  style={{ opacity: dragOverId === plan.id ? 0.6 : 1 }}
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
                                  (s) =>
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
                          onChange={() => void handleToggle(plan)}
                        />
                        <Link
                          to="/dash/pricing/$id"
                          params={{ id: plan.id }}
                          className="btn btn-xs btn-ghost"
                        >
                          <PencilSimpleIcon className="size-4" />
                          编辑
                        </Link>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost btn-error"
                          onClick={() => openDeleteDialog(plan)}
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

      <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-200 px-4 py-3 flex items-center justify-end gap-3 z-50">
        <button
          type="button"
          className="btn btn-sm gap-2"
          onClick={() => void handleSaveDraft()}
          disabled={savePending}
        >
          <FloppyDiskIcon className="size-4" />
          {savePending ? "保存中..." : "保存草稿"}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary gap-2"
          onClick={() => void handlePublish()}
          disabled={publishPending}
        >
          <CloudArrowUpIcon className="size-4" />
          {publishPending ? "发布中..." : "发布"}
        </button>
      </div>

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
              onClick={() => void handleSaveConfig()}
              disabled={configPending}
            >
              {configPending ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={deleteDialogRef} className="modal">
        {pendingDelete && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">确认删除计划</h3>
            <p>
              确定要删除 <strong>{pendingDelete.name}</strong>{" "}
              吗？此操作不可撤销。
            </p>
            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  deleteDialogRef.current?.close();
                  setTimeout(() => setPendingDelete(null), 100);
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={() => void confirmDelete()}
                disabled={deletePending}
              >
                {deletePending ? "删除中..." : "确认删除"}
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
  onRefresh,
  msg,
}: {
  plan: PricingPlan | null;
  onRefresh: () => Promise<void>;
  msg: ReturnType<typeof useMsg>;
}) {
  const [price, setPrice] = useState("");
  const [capUnit, setCapUnit] = useState<"per_day" | "split_day_night">(
    "per_day",
  );
  const [capPrice, setCapPrice] = useState("");
  const [capPriceDay, setCapPriceDay] = useState("");
  const [capPriceNight, setCapPriceNight] = useState("");
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (plan) {
      setPrice(centsToYuan(plan.price));
      setCapUnit(plan.cap_unit ?? "per_day");
      setCapPrice(centsToYuan(plan.cap_price));
      setCapPriceDay(centsToYuan(plan.cap_price_day));
      setCapPriceNight(centsToYuan(plan.cap_price_night));
    }
  }, [plan]);

  const handleInit = async () => {
    setSaving(true);
    try {
      await trpcClientDash.pricingPlansManagement.create.mutate({
        plan_type: "fallback",
        name: "兜底计划",
        billing_type: "hourly",
        price: 1000,
        cap_enabled: true,
        cap_unit: "per_day",
        cap_price: 5000,
      });
      msg.success("兜底计划已初始化");
      await onRefresh();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "初始化失败");
    } finally {
      setSaving(false);
    }
  };

  const autoSave = useCallback(
    (updates: Record<string, unknown>) => {
      if (!plan) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          await trpcClientDash.pricingPlansManagement.update.mutate({
            id: plan.id,
            ...updates,
          });
        } catch {}
      }, 800);
    },
    [plan],
  );

  const handlePriceChange = (val: string) => {
    setPrice(val);
    autoSave({ price: yuanToCents(val) });
  };

  const handleCapUnitChange = (unit: "per_day" | "split_day_night") => {
    setCapUnit(unit);
    autoSave({
      cap_unit: unit,
      cap_price: unit === "per_day" ? yuanToCents(capPrice) : null,
      cap_price_day:
        unit === "split_day_night" ? yuanToCents(capPriceDay) : null,
      cap_price_night:
        unit === "split_day_night" ? yuanToCents(capPriceNight) : null,
    });
  };

  const handleCapPriceChange = (val: string) => {
    setCapPrice(val);
    autoSave({ cap_price: yuanToCents(val) });
  };

  const handleCapPriceDayChange = (val: string) => {
    setCapPriceDay(val);
    autoSave({ cap_price_day: yuanToCents(val) });
  };

  const handleCapPriceNightChange = (val: string) => {
    setCapPriceNight(val);
    autoSave({ cap_price_night: yuanToCents(val) });
  };

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="card-title text-lg">兜底计划</h2>
          <span className="badge badge-success badge-sm">始终生效</span>
        </div>

        {!plan ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-base-content/60">尚未创建兜底计划</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleInit()}
              disabled={saving}
            >
              {saving ? "创建中..." : "初始化兜底计划"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">
                每小时价格 (元)
              </span>
              <input
                type="number"
                className="input input-bordered w-full max-w-xs"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
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
                    checked={capUnit === "per_day"}
                    onChange={() => handleCapUnitChange("per_day")}
                  />
                  <span className="text-sm">按天封顶</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fallback-cap-unit"
                    className="radio radio-sm"
                    checked={capUnit === "split_day_night"}
                    onChange={() => handleCapUnitChange("split_day_night")}
                  />
                  <span className="text-sm">白天/晚上分别封顶</span>
                </label>
              </div>

              {capUnit === "per_day" ? (
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-base-content/60">
                    封顶价格 (元)
                  </span>
                  <input
                    type="number"
                    className="input input-bordered input-sm w-full max-w-xs"
                    value={capPrice}
                    onChange={(e) => handleCapPriceChange(e.target.value)}
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
                      value={capPriceDay}
                      onChange={(e) => handleCapPriceDayChange(e.target.value)}
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
                      value={capPriceNight}
                      onChange={(e) =>
                        handleCapPriceNightChange(e.target.value)
                      }
                      min={0}
                      step={0.01}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
