import {
  CurrencyDollarIcon,
  EyeIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
  TrashIcon,
  WarningCircleIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  ClientOnly,
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import MembershipBadge, {
  getPlanConfig,
  getStoredValueBalance,
  isActivePlan,
  type MembershipPlan,
  type PlanType,
} from "@/client/components/diceshock/MembershipBadge";
import { useMsg } from "@/client/components/diceshock/Msg";
import type { Wind } from "@/shared/mahjong/constants";
import { WIND_LABELS } from "@/shared/mahjong/constants";
import dayjs from "@/shared/utils/dayjs-config";
import { formatPrice } from "@/shared/utils/pricing";
import { trpcClientDash } from "@/shared/utils/trpc";

export const Route = createFileRoute("/dash/users_/$id")({
  component: UserDetailPage,
});

type UserDetail = Awaited<
  ReturnType<typeof trpcClientDash.users.getById.query>
>;

type ActiveMatch = Awaited<
  ReturnType<typeof trpcClientDash.gszManagement.listActive.query>
>[number];

const GSZ_MODE_LABELS: Record<string, string> = {
  "3p": "三麻",
  "4p": "四麻",
};

const GSZ_FORMAT_LABELS: Record<string, string> = {
  tonpuu: "东风场",
  hanchan: "半庄",
};

const GSZ_PHASE_LABELS: Record<string, string> = {
  seat_select: "选座中",
  countdown: "倒计时",
  playing: "对局中",
  scoring: "录入点数",
  round_review: "本局总览",
  voting: "投票结算中",
};

const PLAN_TYPE_OPTIONS: { value: PlanType; label: string }[] = [
  { value: "yearly", label: "桌面通行证 LTS" },
  { value: "monthly", label: "桌面通行证" },
  { value: "monthly_cc", label: "CC桌面通行证" },
  { value: "stored_value", label: "Table AGENT 储值卡" },
];

const TIME_PLAN_TYPES: PlanType[] = ["monthly", "monthly_cc", "yearly"];

const DEFAULT_DURATIONS: Record<string, number> = {
  monthly: 30,
  monthly_cc: 20,
  yearly: 365,
};

function isTimePlan(t: string): boolean {
  return (TIME_PLAN_TYPES as string[]).includes(t);
}

function getAllTimePlanIntervals(plans: MembershipPlan[]) {
  return plans
    .filter((p) => isTimePlan(p.plan_type) && p.start_date && p.end_date)
    .map((p) => ({
      id: p.id,
      start: dayjs(p.start_date!).startOf("day").valueOf(),
      end: dayjs(p.end_date!).startOf("day").valueOf(),
    }))
    .sort((a, b) => a.start - b.start);
}

function checkOverlap(
  intervals: { id: string; start: number; end: number }[],
  target: { start: number; end: number },
  excludeId?: string,
): string[] {
  const ids: string[] = [];
  for (const iv of intervals) {
    if (excludeId && iv.id === excludeId) continue;
    if (target.start < iv.end && target.end > iv.start) {
      ids.push(iv.id);
    }
  }
  return ids;
}

function findNextAvailableStart(
  intervals: { id: string; start: number; end: number }[],
): string {
  if (intervals.length === 0) return dayjs().format("YYYY-MM-DD");
  const sorted = [...intervals].sort((a, b) => b.end - a.end);
  return dayjs(sorted[0].end).format("YYYY-MM-DD");
}

function detectAllConflicts(plans: MembershipPlan[]): Set<string> {
  const intervals = getAllTimePlanIntervals(plans);
  const conflictIds = new Set<string>();
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      if (
        intervals[i].end > intervals[j].start &&
        intervals[i].start < intervals[j].end
      ) {
        conflictIds.add(intervals[i].id);
        conflictIds.add(intervals[j].id);
      }
    }
  }
  return conflictIds;
}

function UserDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const msg = useMsg();

  const [user, setUser] = useState<UserDetail>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "basic" | "membership" | "occupancy"
  >("basic");

  const [editForm, setEditForm] = useState({
    name: "",
    nickname: "",
    phone: "",
  });
  const [editPending, setEditPending] = useState(false);

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [serverConflictIds, setServerConflictIds] = useState<Set<string>>(
    new Set(),
  );

  const localConflictIds = useMemo(() => detectAllConflicts(plans), [plans]);

  const allConflictIds = useMemo(() => {
    const merged = new Set(localConflictIds);
    for (const cid of serverConflictIds) merged.add(cid);
    return merged;
  }, [localConflictIds, serverConflictIds]);

  const addDialogRef = useRef<HTMLDialogElement>(null);
  const [addForm, setAddForm] = useState({
    planType: "monthly" as PlanType,
    amount: "",
    startDate: dayjs().format("YYYY-MM-DD"),
    endDate: dayjs().add(30, "day").format("YYYY-MM-DD"),
  });
  const [addPending, setAddPending] = useState(false);
  const [addFormError, setAddFormError] = useState("");

  const deductDialogRef = useRef<HTMLDialogElement>(null);
  const [deductAmount, setDeductAmount] = useState("");
  const [deductNote, setDeductNote] = useState("");
  const [deductDate, setDeductDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [deductPending, setDeductPending] = useState(false);

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({
    planType: "monthly" as PlanType,
    amount: "",
    startDate: "",
    endDate: "",
  });
  const [editPlanPending, setEditPlanPending] = useState(false);
  const [editPlanError, setEditPlanError] = useState("");

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [deletingPlan, setDeletingPlan] = useState<MembershipPlan | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  type UserOccupancy = Awaited<
    ReturnType<
      typeof trpcClientDash.tablesManagement.getOccupancyByUserId.query
    >
  >;
  const [occupancies, setOccupancies] = useState<UserOccupancy>([]);
  const [occupanciesLoading, setOccupanciesLoading] = useState(false);
  const [orderActionPending, setOrderActionPending] = useState<string | null>(
    null,
  );

  const [selectedOccIds, setSelectedOccIds] = useState<Set<string>>(new Set());

  const toggleOccSelect = (occId: string) => {
    setSelectedOccIds((prev) => {
      const next = new Set(prev);
      if (next.has(occId)) next.delete(occId);
      else next.add(occId);
      return next;
    });
  };

  const handleBatchSettleOcc = () => {
    const ids = Array.from(selectedOccIds);
    if (ids.length === 0) return;
    void navigate({
      to: "/dash/orders/settle",
      search: { ids: ids.join(",") },
    });
  };

  const handleBatchPauseOcc = async () => {
    const activeIds = occupancies
      .filter((o) => selectedOccIds.has(o.id) && o.status === "active")
      .map((o) => o.id);
    if (activeIds.length === 0) return;
    setOrderActionPending("batch");
    try {
      await trpcClientDash.ordersManagement.batchPause.mutate({ ids: activeIds });
      msg.success(`已暂停 ${activeIds.length} 个订单`);
      setSelectedOccIds(new Set());
      await fetchOccupancies();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "批量暂停失败");
    } finally {
      setOrderActionPending(null);
    }
  };

  const handleBatchResumeOcc = async () => {
    const pausedIds = occupancies
      .filter((o) => selectedOccIds.has(o.id) && o.status === "paused")
      .map((o) => o.id);
    if (pausedIds.length === 0) return;
    setOrderActionPending("batch");
    try {
      await trpcClientDash.ordersManagement.batchResume.mutate({ ids: pausedIds });
      msg.success(`已继续 ${pausedIds.length} 个订单`);
      setSelectedOccIds(new Set());
      await fetchOccupancies();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "批量继续失败");
    } finally {
      setOrderActionPending(null);
    }
  };

  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);
  const [activeMatchesLoading, setActiveMatchesLoading] = useState(false);

  const [, setOccTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setOccTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const addFormOverlapError = useMemo(() => {
    if (!isTimePlan(addForm.planType) || !addForm.startDate || !addForm.endDate)
      return "";
    const start = dayjs(addForm.startDate).startOf("day").valueOf();
    const end = dayjs(addForm.endDate).startOf("day").valueOf();
    if (end <= start) return "结束日期必须晚于开始日期";
    const existing = getAllTimePlanIntervals(plans);
    const conflicts = checkOverlap(existing, { start, end });
    if (conflicts.length > 0) return "与已有通行证计划时间重叠";
    return "";
  }, [addForm.planType, addForm.startDate, addForm.endDate, plans]);

  const editPlanOverlapError = useMemo(() => {
    if (
      !editingPlanId ||
      !isTimePlan(editPlanForm.planType) ||
      !editPlanForm.startDate ||
      !editPlanForm.endDate
    )
      return "";
    const start = dayjs(editPlanForm.startDate).startOf("day").valueOf();
    const end = dayjs(editPlanForm.endDate).startOf("day").valueOf();
    if (end <= start) return "结束日期必须晚于开始日期";
    const existing = getAllTimePlanIntervals(plans);
    const conflicts = checkOverlap(existing, { start, end }, editingPlanId);
    if (conflicts.length > 0) return "与已有通行证计划时间重叠";
    return "";
  }, [
    editingPlanId,
    editPlanForm.planType,
    editPlanForm.startDate,
    editPlanForm.endDate,
    plans,
  ]);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trpcClientDash.users.getById.query({ id });
      setUser(data);
      if (data) {
        setEditForm({
          name: data.name ?? "",
          nickname: data.userInfo?.nickname ?? "",
          phone: data.phone ?? "",
        });
      }
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载用户失败");
    } finally {
      setLoading(false);
    }
  }, [id, msg]);

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const data = await trpcClientDash.membershipPlans.getByUserId.query({
        userId: id,
      });
      setPlans(data as MembershipPlan[]);
      setServerConflictIds(new Set());
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载会员计划失败");
    } finally {
      setPlansLoading(false);
    }
  }, [id, msg]);

  const fetchOccupancies = useCallback(async () => {
    setOccupanciesLoading(true);
    try {
      const data =
        await trpcClientDash.tablesManagement.getOccupancyByUserId.query({
          userId: id,
        });
      setOccupancies(data);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载使用信息失败");
    } finally {
      setOccupanciesLoading(false);
    }
  }, [id, msg]);

  const fetchActiveMatches = useCallback(async () => {
    setActiveMatchesLoading(true);
    try {
      const all = await trpcClientDash.gszManagement.listActive.query();
      const userMatches = all.filter((m) =>
        m.players.some((p) => p.userId === id),
      );
      setActiveMatches(userMatches);
    } catch {
      // noop — active matches are supplementary
    } finally {
      setActiveMatchesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
    fetchPlans();
    fetchOccupancies();
    fetchActiveMatches();
  }, [fetchUser, fetchPlans, fetchOccupancies, fetchActiveMatches]);

  useEffect(() => {
    const interval = setInterval(() => void fetchActiveMatches(), 10000);
    return () => clearInterval(interval);
  }, [fetchActiveMatches]);

  const handleEndOccOrder = async (occId: string, status: string) => {
    setOrderActionPending(occId);
    try {
      if (status === "active") {
        await trpcClientDash.ordersManagement.pauseOrder.mutate({ id: occId });
      }
      void navigate({
        to: "/dash/orders/settle",
        search: { ids: occId },
      });
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setOrderActionPending(null);
    }
  };

  const handlePauseOccOrder = async (occId: string) => {
    setOrderActionPending(occId);
    try {
      await trpcClientDash.ordersManagement.pauseOrder.mutate({ id: occId });
      msg.success("已暂停");
      await fetchOccupancies();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "暂停失败");
    } finally {
      setOrderActionPending(null);
    }
  };

  const handleResumeOccOrder = async (occId: string) => {
    setOrderActionPending(occId);
    try {
      await trpcClientDash.ordersManagement.resumeOrder.mutate({ id: occId });
      msg.success("已继续");
      await fetchOccupancies();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "继续失败");
    } finally {
      setOrderActionPending(null);
    }
  };

  const computeSmartDates = useCallback(
    (planType: PlanType) => {
      if (!isTimePlan(planType)) return { startDate: "", endDate: "" };
      const existing = getAllTimePlanIntervals(plans);
      const startDate = findNextAvailableStart(existing);
      const duration = DEFAULT_DURATIONS[planType] ?? 30;
      const endDate = dayjs(startDate)
        .add(duration, "day")
        .format("YYYY-MM-DD");
      return { startDate, endDate };
    },
    [plans],
  );

  const handleAddPlanTypeChange = useCallback(
    (planType: PlanType) => {
      const { startDate, endDate } = computeSmartDates(planType);
      setAddForm((p) => ({
        ...p,
        planType,
        startDate: startDate || p.startDate,
        endDate: endDate || p.endDate,
      }));
      setAddFormError("");
    },
    [computeSmartDates],
  );

  function parseConflictIds(err: unknown): string[] {
    if (!(err instanceof Error)) return [];
    try {
      const parsed = JSON.parse(err.message);
      if (parsed?.data?.message) {
        const inner = JSON.parse(parsed.data.message);
        if (Array.isArray(inner.conflictIds)) return inner.conflictIds;
      }
    } catch {}
    try {
      const match = err.message.match(/\{.*"conflictIds".*\}/);
      if (match) {
        const inner = JSON.parse(match[0]);
        if (Array.isArray(inner.conflictIds)) return inner.conflictIds;
      }
    } catch {}
    return [];
  }

  const handleBasicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditPending(true);
    try {
      await trpcClientDash.users.mutation.mutate({
        id,
        name: editForm.name.trim() || undefined,
        nickname: editForm.nickname.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
      });
      msg.success("用户信息已更新");
      await fetchUser();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setEditPending(false);
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addFormOverlapError) {
      setAddFormError(addFormOverlapError);
      return;
    }
    setAddFormError("");
    setAddPending(true);
    try {
      await trpcClientDash.membershipPlans.create.mutate({
        userId: id,
        planType: addForm.planType,
        amount:
          addForm.planType === "stored_value" && addForm.amount
            ? Math.round(Number.parseFloat(addForm.amount) * 100)
            : null,
        startDate: dayjs(addForm.startDate).valueOf(),
        endDate:
          addForm.planType === "stored_value"
            ? null
            : dayjs(addForm.endDate).valueOf(),
      });
      msg.success("会员计划已添加");
      addDialogRef.current?.close();
      setAddForm({
        planType: "monthly",
        amount: "",
        startDate: dayjs().format("YYYY-MM-DD"),
        endDate: dayjs().add(30, "day").format("YYYY-MM-DD"),
      });
      setAddFormError("");
      await fetchPlans();
    } catch (err) {
      const cIds = parseConflictIds(err);
      if (cIds.length > 0) {
        setServerConflictIds(new Set(cIds));
        addDialogRef.current?.close();
        msg.error("与已有计划时间冲突，冲突计划已标红");
      } else {
        msg.error(err instanceof Error ? err.message : "添加失败");
      }
    } finally {
      setAddPending(false);
    }
  };

  const handleDeduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(Number.parseFloat(deductAmount) * 100);
    if (!cents || cents <= 0) {
      msg.error("请输入有效扣费金额");
      return;
    }
    if (!deductNote.trim()) {
      msg.error("请输入扣费说明");
      return;
    }
    setDeductPending(true);
    try {
      await trpcClientDash.membershipPlans.deduct.mutate({
        userId: id,
        amount: cents,
        note: deductNote.trim(),
        date: dayjs(deductDate).valueOf(),
      });
      msg.success(`已扣费 ¥${(cents / 100).toFixed(0)}`);
      deductDialogRef.current?.close();
      setDeductAmount("");
      setDeductNote("");
      setDeductDate(dayjs().format("YYYY-MM-DD"));
      await fetchPlans();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "扣费失败");
    } finally {
      setDeductPending(false);
    }
  };

  const startEditPlan = (plan: MembershipPlan) => {
    setEditingPlanId(plan.id);
    setEditPlanForm({
      planType: plan.plan_type,
      amount:
        plan.plan_type === "stored_value" && plan.amount != null
          ? (plan.amount / 100).toString()
          : "",
      startDate: plan.start_date
        ? dayjs(plan.start_date).format("YYYY-MM-DD")
        : "",
      endDate: plan.end_date ? dayjs(plan.end_date).format("YYYY-MM-DD") : "",
    });
    setEditPlanError("");
    setServerConflictIds(new Set());
  };

  const handleUpdatePlan = async (planId: string) => {
    if (editPlanOverlapError) {
      setEditPlanError(editPlanOverlapError);
      return;
    }
    setEditPlanError("");
    setEditPlanPending(true);
    try {
      await trpcClientDash.membershipPlans.update.mutate({
        id: planId,
        planType: editPlanForm.planType,
        amount:
          editPlanForm.planType === "stored_value" && editPlanForm.amount
            ? Math.round(Number.parseFloat(editPlanForm.amount) * 100)
            : null,
        startDate: editPlanForm.startDate
          ? dayjs(editPlanForm.startDate).valueOf()
          : undefined,
        endDate:
          editPlanForm.planType === "stored_value"
            ? null
            : editPlanForm.endDate
              ? dayjs(editPlanForm.endDate).valueOf()
              : null,
      });
      msg.success("会员计划已更新");
      setEditingPlanId(null);
      setEditPlanError("");
      await fetchPlans();
    } catch (err) {
      const cIds = parseConflictIds(err);
      if (cIds.length > 0) {
        setServerConflictIds(new Set(cIds));
        setEditingPlanId(null);
        msg.error("与已有计划时间冲突，冲突计划已标红");
      } else {
        msg.error(err instanceof Error ? err.message : "更新失败");
      }
    } finally {
      setEditPlanPending(false);
    }
  };

  const openDeleteDialog = (plan: MembershipPlan) => {
    setDeletingPlan(plan);
    setTimeout(() => deleteDialogRef.current?.showModal(), 0);
  };

  const confirmDelete = async () => {
    if (!deletingPlan) return;
    setDeletePending(true);
    try {
      await trpcClientDash.membershipPlans.remove.mutate({
        id: deletingPlan.id,
      });
      msg.success("会员计划已删除");
      deleteDialogRef.current?.close();
      setDeletingPlan(null);
      await fetchPlans();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletePending(false);
    }
  };

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-base-content/60">用户不存在</p>
        <Link to="/dash/users" className="btn btn-primary btn-sm">
          返回用户列表
        </Link>
      </main>
    );
  }

  return (
    <ClientOnly>
      <main className="size-full overflow-y-auto">
        <div className="px-4 pt-4">
          <DashBackButton to="/dash/users" />
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pb-20">
          <div className="flex items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {user.userInfo?.nickname ?? user.name ?? "未命名用户"}
              </h1>
              <p className="text-sm text-base-content/60 font-mono">
                {user.id}
              </p>
            </div>
            <MembershipBadge plans={plans} />
          </div>

          <div role="tablist" className="tabs tabs-bordered mb-6">
            <button
              type="button"
              role="tab"
              className={clsx("tab", activeTab === "basic" && "tab-active")}
              onClick={() => setActiveTab("basic")}
            >
              基本信息
            </button>
            <button
              type="button"
              role="tab"
              className={clsx(
                "tab",
                activeTab === "membership" && "tab-active",
              )}
              onClick={() => setActiveTab("membership")}
            >
              会员计划
            </button>
            <button
              type="button"
              role="tab"
              className={clsx("tab", activeTab === "occupancy" && "tab-active")}
              onClick={() => setActiveTab("occupancy")}
            >
              订单 (
              {occupancies.filter((o) => o.status === "active").length +
                occupancies.filter((o) => o.status === "paused").length}
              )
            </button>
          </div>

          {activeTab === "basic" && (
            <form onSubmit={handleBasicSubmit} className="flex flex-col gap-6">
              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">用户 ID</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={user.id}
                  disabled
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">姓名</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="用户姓名"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">昵称</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editForm.nickname}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, nickname: e.target.value }))
                  }
                  placeholder="用户昵称"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">手机号</span>
                <input
                  type="tel"
                  className="input input-bordered w-full"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="手机号"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">邮箱</span>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  value={user.email ?? ""}
                  disabled
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">UID</span>
                <input
                  type="text"
                  className="input input-bordered w-full font-mono"
                  value={user.userInfo?.uid ?? ""}
                  disabled
                />
              </label>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => navigate({ to: "/dash/users" })}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={clsx("btn btn-primary", editPending && "loading")}
                  disabled={editPending}
                >
                  {editPending ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "membership" && (
            <div className="flex flex-col gap-4">
              {allConflictIds.size > 0 && (
                <div role="alert" className="alert alert-error">
                  <WarningIcon className="size-5" />
                  <span>
                    存在时间冲突的通行证计划（桌面通行证、CC桌面通行证、桌面通行证
                    LTS
                    之间不可重叠），冲突条目已标红。请修改日期或删除冲突计划。
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">会员计划历史</h3>
                  {getStoredValueBalance(plans) > 0 && (
                    <span className="badge badge-accent badge-lg">
                      储值余额: ¥
                      {(getStoredValueBalance(plans) / 100).toFixed(0)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-accent btn-sm"
                    onClick={() => {
                      setDeductAmount("");
                      deductDialogRef.current?.showModal();
                    }}
                  >
                    <CurrencyDollarIcon />
                    扣费
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const { startDate, endDate } =
                        computeSmartDates("monthly");
                      setAddForm({
                        planType: "monthly",
                        amount: "",
                        startDate,
                        endDate,
                      });
                      setAddFormError("");
                      setServerConflictIds(new Set());
                      addDialogRef.current?.showModal();
                    }}
                  >
                    <PlusIcon />
                    添加计划
                  </button>
                </div>
              </div>

              {plansLoading ? (
                <div className="py-12 text-center">
                  <span className="loading loading-dots loading-md" />
                </div>
              ) : plans.length === 0 ? (
                <div className="py-12 text-center text-base-content/60">
                  暂无会员计划
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>状态</th>
                        <th>计划类型</th>
                        <th>金额</th>
                        <th>开始日期</th>
                        <th>结束日期</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((plan) => {
                        const config = getPlanConfig(plan.plan_type);
                        const active = isActivePlan(plan);
                        const isEditing = editingPlanId === plan.id;
                        const hasConflict = allConflictIds.has(plan.id);

                        if (isEditing) {
                          return (
                            <tr
                              key={plan.id}
                              className={clsx(
                                "bg-base-200",
                                hasConflict && "border-b-2 border-b-error",
                              )}
                            >
                              <td>
                                <span
                                  className={clsx(
                                    "badge badge-sm",
                                    active ? "badge-success" : "badge-ghost",
                                  )}
                                >
                                  {active ? "生效中" : "已过期"}
                                </span>
                              </td>
                              <td>
                                <select
                                  className="select select-bordered select-sm"
                                  value={editPlanForm.planType}
                                  onChange={(e) => {
                                    const newType = e.target.value as PlanType;
                                    setEditPlanForm((p) => ({
                                      ...p,
                                      planType: newType,
                                    }));
                                    setEditPlanError("");
                                  }}
                                >
                                  {PLAN_TYPE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                {editPlanForm.planType === "stored_value" ? (
                                  <input
                                    type="number"
                                    className="input input-bordered input-sm w-24"
                                    value={editPlanForm.amount}
                                    onChange={(e) =>
                                      setEditPlanForm((p) => ({
                                        ...p,
                                        amount: e.target.value,
                                      }))
                                    }
                                    placeholder="¥"
                                  />
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td>
                                <input
                                  type="date"
                                  className={clsx(
                                    "input input-bordered input-sm",
                                    editPlanOverlapError && "input-error",
                                  )}
                                  value={editPlanForm.startDate}
                                  onChange={(e) => {
                                    setEditPlanForm((p) => ({
                                      ...p,
                                      startDate: e.target.value,
                                    }));
                                    setEditPlanError("");
                                  }}
                                />
                              </td>
                              <td>
                                {editPlanForm.planType !== "stored_value" ? (
                                  <input
                                    type="date"
                                    className={clsx(
                                      "input input-bordered input-sm",
                                      editPlanOverlapError && "input-error",
                                    )}
                                    value={editPlanForm.endDate}
                                    onChange={(e) => {
                                      setEditPlanForm((p) => ({
                                        ...p,
                                        endDate: e.target.value,
                                      }));
                                      setEditPlanError("");
                                    }}
                                  />
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-primary"
                                      onClick={() => handleUpdatePlan(plan.id)}
                                      disabled={
                                        editPlanPending ||
                                        !!editPlanOverlapError
                                      }
                                    >
                                      {editPlanPending ? "保存中..." : "保存"}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-ghost"
                                      onClick={() => {
                                        setEditingPlanId(null);
                                        setEditPlanError("");
                                      }}
                                    >
                                      取消
                                    </button>
                                  </div>
                                  {(editPlanOverlapError || editPlanError) && (
                                    <span className="text-error text-xs flex items-center gap-1">
                                      <WarningCircleIcon className="size-3" />
                                      {editPlanOverlapError || editPlanError}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={plan.id}
                            className={clsx(
                              hasConflict &&
                                "border-b-2 border-b-error bg-error/5",
                            )}
                          >
                            <td>
                              {hasConflict ? (
                                <span className="badge badge-error badge-sm gap-1">
                                  <WarningCircleIcon className="size-3" />
                                  {active ? "生效中" : "已过期"}
                                </span>
                              ) : (
                                <span
                                  className={clsx(
                                    "badge badge-sm",
                                    active ? "badge-success" : "badge-ghost",
                                  )}
                                >
                                  {active ? "生效中" : "已过期"}
                                </span>
                              )}
                            </td>
                            <td>
                              <span
                                className={`badge ${hasConflict ? "badge-error" : config.badgeClass} badge-sm gap-1`}
                              >
                                {hasConflict && (
                                  <WarningCircleIcon className="size-3" />
                                )}
                                <config.icon className="size-3" />
                                {config.label}
                              </span>
                            </td>
                            <td>
                              {plan.plan_type === "stored_value" &&
                              plan.amount != null
                                ? `¥${(plan.amount / 100).toFixed(0)}`
                                : "—"}
                            </td>
                            <td>
                              {plan.start_date
                                ? dayjs(plan.start_date).format("YYYY/MM/DD")
                                : "—"}
                            </td>
                            <td>
                              {plan.end_date
                                ? dayjs(plan.end_date).format("YYYY/MM/DD")
                                : "—"}
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="btn btn-xs btn-ghost btn-primary"
                                  onClick={() => startEditPlan(plan)}
                                >
                                  编辑
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-ghost btn-error"
                                  onClick={() => openDeleteDialog(plan)}
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "occupancy" && (() => {
            const sortedOccupancies = [...occupancies].sort((a, b) => {
              const order = { active: 0, paused: 1, ended: 2 };
              return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
            });

            return (
            <div className="flex flex-col gap-4">
              {!activeMatchesLoading && activeMatches.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex size-full rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-success" />
                    </span>
                    立直麻将进行中 ({activeMatches.length})
                  </div>
                  {activeMatches.map((m) => (
                    <div
                      key={m.tableCode}
                      className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{m.tableName}</span>
                          <span
                            className={`badge badge-xs ${m.mode === "4p" ? "badge-primary" : "badge-secondary"}`}
                          >
                            {GSZ_MODE_LABELS[m.mode] ?? m.mode}
                          </span>
                          <span className="badge badge-xs badge-outline">
                            {GSZ_FORMAT_LABELS[m.format] ?? m.format}
                          </span>
                          <span className="badge badge-xs badge-info">
                            {GSZ_PHASE_LABELS[m.phase] ?? m.phase}
                          </span>
                        </div>
                        <div className="text-xs text-base-content/50 mt-1 truncate">
                          {m.players.map((p) => p.nickname).join(", ")}
                        </div>
                      </div>
                      <Link
                        to="/dash/gsz"
                        className="btn btn-xs btn-ghost btn-primary shrink-0"
                      >
                        <EyeIcon className="size-3.5" />
                        查看
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">订单</h3>
                <Link
                  to="/dash/orders"
                  className="btn btn-xs btn-ghost btn-primary"
                >
                  查看全部订单
                </Link>
              </div>

              {occupanciesLoading ? (
                <div className="py-12 text-center">
                  <span className="loading loading-dots loading-md" />
                </div>
              ) : occupancies.length === 0 ? (
                <div className="py-12 text-center text-base-content/60">
                  该用户暂无订单
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <td className="w-10">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={
                                sortedOccupancies.filter((o) => o.status !== "ended").length > 0 &&
                                sortedOccupancies
                                  .filter((o) => o.status !== "ended")
                                  .every((o) => selectedOccIds.has(o.id))
                              }
                              onChange={() => {
                                const nonEnded = sortedOccupancies
                                  .filter((o) => o.status !== "ended")
                                  .map((o) => o.id);
                                if (nonEnded.every((oid) => selectedOccIds.has(oid))) {
                                  setSelectedOccIds(new Set());
                                } else {
                                  setSelectedOccIds(new Set(nonEnded));
                                }
                              }}
                            />
                          </td>
                          <td>状态</td>
                          <td>桌台</td>
                          <td>开始时间</td>
                          <td>时长</td>
                          <td>费用</td>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedOccupancies.map((occ) => {
                          const start = dayjs(occ.start_at);
                          const diffMin = dayjs().diff(start, "minute");
                          const hours = Math.floor(diffMin / 60);
                          const minutes = diffMin % 60;
                          const durationStr =
                            hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;

                          return (
                            <tr key={occ.id}>
                              <td>
                                {occ.status !== "ended" && (
                                  <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm"
                                    checked={selectedOccIds.has(occ.id)}
                                    onChange={() => toggleOccSelect(occ.id)}
                                  />
                                )}
                              </td>
                              <td>
                                {occ.status === "active" ? (
                                  <span className="badge badge-success badge-sm">
                                    进行中
                                  </span>
                                ) : occ.status === "paused" ? (
                                  <span className="badge badge-neutral badge-sm">
                                    已暂停
                                  </span>
                                ) : (
                                  <span className="badge badge-ghost badge-sm">
                                    已结束
                                  </span>
                                )}
                              </td>
                              <td>
                                <Link
                                  to="/dash/tables/$id"
                                  params={{ id: occ.table_id }}
                                  className="link link-hover"
                                >
                                  {occ.table?.name ?? occ.table_id}
                                </Link>
                              </td>
                              <td className="text-sm">
                                {start.isValid()
                                  ? start.format("MM/DD HH:mm")
                                  : "—"}
                              </td>
                              <td className="text-sm">{durationStr}</td>
                              <td className="font-mono text-sm">
                                {occ.final_price != null
                                  ? formatPrice(occ.final_price)
                                  : "—"}
                              </td>
                              <th>
                                <div className="flex items-center gap-1">
                                  {occ.status === "active" && (
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-ghost"
                                      onClick={() =>
                                        void handlePauseOccOrder(occ.id)
                                      }
                                      disabled={orderActionPending === occ.id}
                                    >
                                      <PauseIcon className="size-3.5" />
                                      暂停
                                    </button>
                                  )}
                                  {occ.status === "paused" && (
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-ghost btn-success"
                                      onClick={() =>
                                        void handleResumeOccOrder(occ.id)
                                      }
                                      disabled={orderActionPending === occ.id}
                                    >
                                      <PlayIcon className="size-3.5" />
                                      继续
                                    </button>
                                  )}
                                  {occ.status !== "ended" && (
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-ghost btn-error"
                                      onClick={() =>
                                        void handleEndOccOrder(occ.id, occ.status)
                                      }
                                      disabled={orderActionPending === occ.id}
                                    >
                                      <StopIcon className="size-3.5" />
                                      终止
                                    </button>
                                  )}
                                  {occ.status === "ended" && (
                                    <Link
                                      to="/dash/orders/settle"
                                      search={{ ids: occ.id }}
                                      className="btn btn-xs btn-ghost"
                                    >
                                      <EyeIcon className="size-3.5" />
                                      详情
                                    </Link>
                                  )}
                                </div>
                              </th>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            );
          })()}
        </div>

        {selectedOccIds.size > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-box border border-base-content/10 backdrop-blur-sm bg-base-100/80 shadow-lg">
            <span className="text-sm font-medium shrink-0">
              已选择 {selectedOccIds.size} 个订单
            </span>
            {occupancies.some((o) => selectedOccIds.has(o.id) && o.status === "active") && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => void handleBatchPauseOcc()}
                disabled={orderActionPending === "batch"}
              >
                <PauseIcon className="size-4" />
                批量暂停
              </button>
            )}
            {occupancies.some((o) => selectedOccIds.has(o.id) && o.status === "paused") && (
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={() => void handleBatchResumeOcc()}
                disabled={orderActionPending === "batch"}
              >
                <PlayIcon className="size-4" />
                批量继续
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleBatchSettleOcc}
            >
              <StopIcon className="size-4" />
              批量结算
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setSelectedOccIds(new Set())}
            >
              取消选择
            </button>
          </div>
        )}

        <dialog ref={addDialogRef} className="modal">
          <form method="dialog" className="modal-box" onSubmit={handleAddPlan}>
            <div className="modal-action flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">添加会员计划</h3>
              <button
                type="button"
                className="btn btn-ghost btn-square"
                onClick={() => addDialogRef.current?.close()}
              >
                <XIcon />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">计划类型</span>
                <select
                  className="select select-bordered w-full"
                  value={addForm.planType}
                  onChange={(e) =>
                    handleAddPlanTypeChange(e.target.value as PlanType)
                  }
                >
                  {PLAN_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              {addForm.planType === "stored_value" && (
                <label className="flex flex-col gap-2">
                  <span className="label text-sm font-semibold">
                    储值金额 (元)
                  </span>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={addForm.amount}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, amount: e.target.value }))
                    }
                    placeholder="输入金额"
                    min="0"
                    step="1"
                  />
                </label>
              )}

              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">开始日期</span>
                <input
                  type="date"
                  className={clsx(
                    "input input-bordered w-full",
                    addFormOverlapError && "input-error",
                  )}
                  value={addForm.startDate}
                  onChange={(e) => {
                    setAddForm((p) => ({ ...p, startDate: e.target.value }));
                    setAddFormError("");
                  }}
                />
              </label>

              {addForm.planType !== "stored_value" && (
                <label className="flex flex-col gap-2">
                  <span className="label text-sm font-semibold">结束日期</span>
                  <input
                    type="date"
                    className={clsx(
                      "input input-bordered w-full",
                      addFormOverlapError && "input-error",
                    )}
                    value={addForm.endDate}
                    onChange={(e) => {
                      setAddForm((p) => ({ ...p, endDate: e.target.value }));
                      setAddFormError("");
                    }}
                  />
                </label>
              )}

              {(addFormOverlapError || addFormError) && (
                <div className="flex items-center gap-2 text-error text-sm">
                  <WarningCircleIcon className="size-4 shrink-0" />
                  <span>{addFormOverlapError || addFormError}</span>
                </div>
              )}
            </div>

            <div className="modal-action mt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={addPending || !!addFormOverlapError}
              >
                {addPending ? "添加中..." : "添加"}
              </button>
            </div>
          </form>
        </dialog>

        <dialog ref={deductDialogRef} className="modal">
          <form method="dialog" className="modal-box" onSubmit={handleDeduct}>
            <div className="modal-action flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">储值扣费</h3>
              <button
                type="button"
                className="btn btn-ghost btn-square"
                onClick={() => deductDialogRef.current?.close()}
              >
                <XIcon />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-base-content/70">
                当前储值余额:{" "}
                <span className="font-mono font-bold text-accent">
                  ¥{(getStoredValueBalance(plans) / 100).toFixed(0)}
                </span>
              </p>
              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">
                  扣费金额 (元)
                </span>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={deductAmount}
                  onChange={(e) => setDeductAmount(e.target.value)}
                  placeholder="输入扣费金额"
                  min="0"
                  step="1"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">扣费说明</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={deductNote}
                  onChange={(e) => setDeductNote(e.target.value)}
                  placeholder="例：活动消费、桌游租赁"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">扣费日期</span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={deductDate}
                  onChange={(e) => setDeductDate(e.target.value)}
                />
              </label>
            </div>

            <div className="modal-action mt-6">
              <button
                type="submit"
                className="btn btn-accent"
                disabled={deductPending || !deductNote.trim() || !deductDate}
              >
                {deductPending ? "扣费中..." : "确认扣费"}
              </button>
            </div>
          </form>
        </dialog>

        <dialog ref={deleteDialogRef} className="modal">
          {deletingPlan && (
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">确认删除</h3>
              <p>确定要删除此会员计划记录吗？此操作不可撤销。</p>
              <div className="mt-4 p-4 bg-base-200 rounded-lg">
                <p className="text-sm">
                  <strong>计划类型:</strong>{" "}
                  {getPlanConfig(deletingPlan.plan_type).label}
                </p>
                <p className="text-sm">
                  <strong>开始日期:</strong>{" "}
                  {deletingPlan.start_date
                    ? dayjs(deletingPlan.start_date).format("YYYY/MM/DD")
                    : "—"}
                </p>
              </div>
              <div className="modal-action mt-6">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    deleteDialogRef.current?.close();
                    setDeletingPlan(null);
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
    </ClientOnly>
  );
}
