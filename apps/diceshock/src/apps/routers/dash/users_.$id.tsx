import { useApolloClient } from "@apollo/client";
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
import type { BatchAction } from "@/client/components/diceshock/BatchActionBar";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import MembershipBadge, {
  getPlanConfig,
  getStoredValueBalance,
  isActivePlan,
  type MembershipPlan,
  type PlanType,
} from "@/client/components/diceshock/MembershipBadge";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  ActiveMahjongMatchesDocument,
  MembershipPlanType,
  SendWechatTemplateTestDocument,
  UserRole,
  type useActiveMahjongMatchesQuery,
  useBatchPauseOrdersMutation,
  useBatchResumeOrdersMutation,
  useCreateMembershipPlanMutation,
  useDeductStoredValueMutation,
  useMembershipPlansByUserQuery,
  useOccupanciesByUserQuery,
  usePauseOrderMutation,
  useRemoveMembershipPlanMutation,
  useResumeOrderMutation,
  useUpdateMembershipPlanMutation,
  useUpdateUserMutation,
  useUpdateUserRoleMutation,
  useUserQuery,
} from "@/client/graphql/__generated__";
import type { Wind } from "@/shared/mahjong/constants";
import { WIND_LABELS } from "@/shared/mahjong/constants";
import dayjs from "@/shared/utils/dayjs-config";
import { formatPrice } from "@/shared/utils/pricing";

export const Route = createFileRoute("/dash/users_/$id")({
  component: UserDetailPage,
});

type UserDetail = NonNullable<ReturnType<typeof useUserQuery>["data"]>["user"];

/**
 * Admin UI accesses additional user fields not yet in the public GraphQL schema.
 * These are returned by the API but not exposed in the generated gqty types.
 */
interface AdminUser extends UserDetail {
  name?: string | null;
  nickname?: string | null;
  phone?: string | null;
  email?: string | null;
  uid?: string | null;
  role?: string | null;
}

type ActiveMatch = {
  id: string;
  tableCode?: string | null;
  tableName?: string | null;
  mode: string;
  format: string;
  phase: string;
  players: Array<{ userId: string; nickname: string }>;
};

type UserOccupancy = NonNullable<
  ReturnType<typeof useOccupanciesByUserQuery>["data"]
>["occupanciesByUser"][number];

const GSZ_MODE_LABELS: Record<string, string> = {
  "3p": "三麻",
  "4p": "四麻",
  THREE_PLAYER: "三麻",
  FOUR_PLAYER: "四麻",
};

const GSZ_FORMAT_LABELS: Record<string, string> = {
  tonpuu: "东风场",
  hanchan: "半庄",
  TONPUU: "东风场",
  HANCHAN: "半庄",
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

const USER_ROLE_BY_FORM_VALUE: Record<string, UserRole> = {
  admin: UserRole.Admin,
  customer: UserRole.Customer,
  staff: UserRole.Staff,
};

const MEMBERSHIP_PLAN_TYPE_BY_FORM_VALUE: Record<PlanType, MembershipPlanType> =
  {
    monthly: MembershipPlanType.Monthly,
    monthly_cc: MembershipPlanType.MonthlyCc,
    stored_value: MembershipPlanType.StoredValue,
    yearly: MembershipPlanType.Yearly,
  };

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
  const client = useApolloClient();

  const { data: userQlData, loading } = useUserQuery({
    variables: { id },
    skip: !id,
  });
  const rawUser = userQlData?.user ?? null;

  const [activeTab, setActiveTab] = useState<
    "basic" | "membership" | "occupancy"
  >("basic");

  const [editForm, setEditForm] = useState({
    name: "",
    nickname: "",
    phone: "",
  });
  const [editPending, setEditPending] = useState(false);
  const [rolePending, setRolePending] = useState(false);

  const { data: plansQlData } = useMembershipPlansByUserQuery({
    variables: { userId: id },
    skip: !id,
  });
  const membershipPlans = useMemo(
    () => (plansQlData?.membershipPlansByUser ?? []) as MembershipPlan[],
    [plansQlData],
  );

  const [serverConflictIds, setServerConflictIds] = useState<Set<string>>(
    new Set(),
  );

  const localConflictIds = useMemo(
    () => detectAllConflicts(membershipPlans),
    [membershipPlans],
  );

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

  const [updateUser] = useUpdateUserMutation();
  const [updateUserRole] = useUpdateUserRoleMutation();
  const [createMembershipPlan] = useCreateMembershipPlanMutation({
    refetchQueries: ["MembershipPlansByUser"],
  });
  const [updateMembershipPlan] = useUpdateMembershipPlanMutation({
    refetchQueries: ["MembershipPlansByUser"],
  });
  const [removeMembershipPlan] = useRemoveMembershipPlanMutation({
    refetchQueries: ["MembershipPlansByUser"],
  });
  const [deductStoredValue] = useDeductStoredValueMutation({
    refetchQueries: ["MembershipPlansByUser"],
  });
  const [pauseOrder] = usePauseOrderMutation({
    refetchQueries: ["OccupanciesByUser"],
  });
  const [resumeOrder] = useResumeOrderMutation({
    refetchQueries: ["OccupanciesByUser"],
  });
  const [batchPauseOrders] = useBatchPauseOrdersMutation({
    refetchQueries: ["OccupanciesByUser"],
  });
  const [batchResumeOrders] = useBatchResumeOrdersMutation({
    refetchQueries: ["OccupanciesByUser"],
  });

  const { data: occupanciesQlData } = useOccupanciesByUserQuery({
    variables: { userId: id },
    skip: !id,
  });
  const rawOccupancies = occupanciesQlData?.occupanciesByUser ?? [];

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
      search: { ids: ids },
    });
  };

  type OccStatus = "active" | "paused" | "ended";

  const handleBatchPauseOcc = async () => {
    const activeIds = rawOccupancies
      .filter(
        (o: UserOccupancy) =>
          selectedOccIds.has(o.id) &&
          (o.status as string).toLowerCase() === "active",
      )
      .map((o: UserOccupancy) => o.id);
    if (activeIds.length === 0) return;
    setOrderActionPending("batch");
    try {
      await batchPauseOrders({ variables: { ids: activeIds } });
      msg.success(`已暂停 ${activeIds.length} 个订单`);
      setSelectedOccIds(new Set());
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "批量暂停失败");
    } finally {
      setOrderActionPending(null);
    }
  };

  const handleBatchResumeOcc = async () => {
    const pausedIds = rawOccupancies
      .filter(
        (o: UserOccupancy) =>
          selectedOccIds.has(o.id) &&
          (o.status as string).toLowerCase() === "paused",
      )
      .map((o: UserOccupancy) => o.id);
    if (pausedIds.length === 0) return;
    setOrderActionPending("batch");
    try {
      await batchResumeOrders({ variables: { ids: pausedIds } });
      msg.success(`已继续 ${pausedIds.length} 个订单`);
      setSelectedOccIds(new Set());
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "批量继续失败");
    } finally {
      setOrderActionPending(null);
    }
  };

  const [notifySlot, setNotifySlot] = useState("order_start");
  const [notifyPending, setNotifyPending] = useState(false);

  const handleSendTestNotify = async () => {
    setNotifyPending(true);
    try {
      const res = await client.mutate({
        mutation: SendWechatTemplateTestDocument,
        variables: { userId: id, slot: notifySlot },
      });
      const data = res.data?.sendWechatTemplateTest;
      if (data?.success) {
        msg.success("通知已发送");
      } else {
        msg.error(data?.error ?? "发送失败");
      }
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "发送失败");
    } finally {
      setNotifyPending(false);
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
    const existing = getAllTimePlanIntervals(membershipPlans);
    const conflicts = checkOverlap(existing, { start, end });
    if (conflicts.length > 0) return "与已有通行证计划时间重叠";
    return "";
  }, [addForm.planType, addForm.startDate, addForm.endDate, membershipPlans]);

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
    const existing = getAllTimePlanIntervals(membershipPlans);
    const conflicts = checkOverlap(existing, { start, end }, editingPlanId);
    if (conflicts.length > 0) return "与已有通行证计划时间重叠";
    return "";
  }, [
    editingPlanId,
    editPlanForm.planType,
    editPlanForm.startDate,
    editPlanForm.endDate,
    membershipPlans,
  ]);

  const fetchActiveMatches = useCallback(async () => {
    setActiveMatchesLoading(true);
    try {
      const result = await client.query({
        query: ActiveMahjongMatchesDocument,
      });
      const all = (result.data?.activeMahjongMatches ?? []) as ActiveMatch[];
      const userMatches = all.filter((m) =>
        m.players.some((p) => p.userId === id),
      );
      setActiveMatches(userMatches as ActiveMatch[]);
    } catch {
    } finally {
      setActiveMatchesLoading(false);
    }
  }, [id, client]);

  useEffect(() => {
    void fetchActiveMatches();
  }, [fetchActiveMatches]);

  useEffect(() => {
    const interval = setInterval(() => void fetchActiveMatches(), 10000);
    return () => clearInterval(interval);
  }, [fetchActiveMatches]);

  const handleEndOccOrder = async (occId: string, status: string) => {
    setOrderActionPending(occId);
    try {
      if (status === "active") {
        await pauseOrder({ variables: { id: occId } });
      }
    } catch {
    } finally {
      setOrderActionPending(null);
      void navigate({
        to: "/dash/orders/settle",
        search: { ids: [occId] },
      });
    }
  };

  const handlePauseOccOrder = async (occId: string) => {
    setOrderActionPending(occId);
    try {
      await pauseOrder({ variables: { id: occId } });
      msg.success("已暂停");
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "暂停失败");
    } finally {
      setOrderActionPending(null);
    }
  };

  const handleResumeOccOrder = async (occId: string) => {
    setOrderActionPending(occId);
    try {
      await resumeOrder({ variables: { id: occId } });
      msg.success("已继续");
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "继续失败");
    } finally {
      setOrderActionPending(null);
    }
  };

  const computeSmartDates = useCallback(
    (planType: PlanType) => {
      if (!isTimePlan(planType)) return { startDate: "", endDate: "" };
      const existing = getAllTimePlanIntervals(membershipPlans);
      const startDate = findNextAvailableStart(existing);
      const duration = DEFAULT_DURATIONS[planType] ?? 30;
      const endDate = dayjs(startDate)
        .add(duration, "day")
        .format("YYYY-MM-DD");
      return { startDate, endDate };
    },
    [membershipPlans],
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
      const parsed = JSON.parse(err.message) as { data?: { message?: string } };
      if (typeof parsed?.data?.message === "string") {
        const inner = JSON.parse(parsed.data.message);
        if (Array.isArray((inner as Record<string, unknown>).conflictIds))
          return (inner as Record<string, unknown>).conflictIds as string[];
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
      await updateUser({
        variables: {
          input: {
            id,
            name: editForm.name.trim() || undefined,
            nickname: editForm.nickname.trim() || undefined,
            phone: editForm.phone.trim() || undefined,
          },
        },
      });
      msg.success("用户信息已更新");
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setEditPending(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    setRolePending(true);
    try {
      await updateUserRole({
        variables: {
          input: {
            id,
            role: USER_ROLE_BY_FORM_VALUE[newRole] ?? UserRole.Customer,
          },
        },
      });
      msg.success("角色已更新");
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "修改角色失败");
    } finally {
      setRolePending(false);
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
      await createMembershipPlan({
        variables: {
          input: {
            userId: id,
            planType: MEMBERSHIP_PLAN_TYPE_BY_FORM_VALUE[addForm.planType],
            amount:
              addForm.planType === "stored_value" && addForm.amount
                ? Math.round(Number.parseFloat(addForm.amount) * 100)
                : null,
            startDate: new Date(
              dayjs(addForm.startDate).valueOf(),
            ).toISOString(),
            endDate: isTimePlan(addForm.planType)
              ? new Date(dayjs(addForm.endDate).valueOf()).toISOString()
              : null,
          },
        },
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
      await deductStoredValue({
        variables: {
          input: {
            userId: id,
            amount: cents,
            note: deductNote.trim(),
            date: new Date(dayjs(deductDate).valueOf()).toISOString(),
          },
        },
      });
      msg.success(`已扣费 ¥${(cents / 100).toFixed(0)}`);
      deductDialogRef.current?.close();
      setDeductAmount("");
      setDeductNote("");
      setDeductDate(dayjs().format("YYYY-MM-DD"));
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
      await updateMembershipPlan({
        variables: {
          input: {
            id: planId,
            planType: MEMBERSHIP_PLAN_TYPE_BY_FORM_VALUE[editPlanForm.planType],
            amount:
              editPlanForm.planType === "stored_value" && editPlanForm.amount
                ? Math.round(Number.parseFloat(editPlanForm.amount) * 100)
                : null,
            startDate: editPlanForm.startDate
              ? new Date(dayjs(editPlanForm.startDate).valueOf()).toISOString()
              : undefined,
            endDate: isTimePlan(editPlanForm.planType)
              ? editPlanForm.endDate
                ? new Date(dayjs(editPlanForm.endDate).valueOf()).toISOString()
                : null
              : null,
          },
        },
      });
      msg.success("会员计划已更新");
      setEditingPlanId(null);
      setEditPlanError("");
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
      await removeMembershipPlan({
        variables: { id: deletingPlan.id },
      });
      msg.success("会员计划已删除");
      deleteDialogRef.current?.close();
      setDeletingPlan(null);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletePending(false);
    }
  };

  useEffect(() => {
    if (rawUser) {
      setEditForm({
        name: (rawUser as AdminUser).name ?? "",
        nickname: (rawUser as AdminUser).nickname ?? "",
        phone: (rawUser as AdminUser).phone ?? "",
      });
    }
  }, [rawUser]);

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  if (!rawUser) {
    return (
      <main className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-base-content/60">用户不存在</p>
        <Link
          to="/dash/users"
          search={{ q: "", page: 1 }}
          className="btn btn-primary btn-sm"
        >
          返回用户列表
        </Link>
      </main>
    );
  }

  const user = rawUser;

  return (
    <ClientOnly>
      <main className="size-full overflow-y-auto">
        <div className="px-4 pt-4">
          <DashBackButton to="/dash/users" />
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pb-24">
          <div className="flex items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {user.nickname || user.name || "未命名用户"}
              </h1>
              <p className="text-sm text-base-content/60 font-mono">
                {user.id}
              </p>
            </div>
            <MembershipBadge plans={membershipPlans} />
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
              {
                rawOccupancies.filter(
                  (o: UserOccupancy) =>
                    (o.status as string).toLowerCase() === "active" ||
                    (o.status as string).toLowerCase() === "paused",
                ).length
              }
              )
            </button>
          </div>

          {activeTab === "basic" && (
            <>
              <form
                onSubmit={handleBasicSubmit}
                className="flex flex-col gap-6"
              >
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
                      setEditForm((p) => ({
                        ...p,
                        nickname: e.target.value,
                      }))
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
                  <span className="label text-sm font-semibold">角色</span>
                  <select
                    className="select select-bordered w-full"
                    value={
                      (user as AdminUser).role?.toLowerCase() ?? "customer"
                    }
                    onChange={(e) => handleRoleChange(e.target.value)}
                    disabled={rolePending}
                  >
                    <option value="customer">顾客</option>
                    <option value="staff">店员</option>
                    <option value="admin">管理员</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="label text-sm font-semibold">邮箱</span>
                  <input
                    type="email"
                    className="input input-bordered w-full"
                    value={(user as AdminUser).email ?? ""}
                    disabled
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="label text-sm font-semibold">UID</span>
                  <input
                    type="text"
                    className="input input-bordered w-full font-mono"
                    value={(user as AdminUser).uid ?? ""}
                    disabled
                  />
                </label>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      navigate({
                        to: "/dash/users",
                        search: { q: "", page: 1 },
                      })
                    }
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className={clsx(
                      "btn btn-primary",
                      editPending && "loading",
                    )}
                    disabled={editPending}
                  >
                    {editPending ? "保存中..." : "保存"}
                  </button>
                </div>
              </form>

              <div className="divider" />

              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold">发送模板通知测试</h3>
                <div className="flex items-center gap-3">
                  <select
                    className="select select-bordered flex-1"
                    value={notifySlot}
                    onChange={(e) => setNotifySlot(e.target.value)}
                  >
                    <option value="order_start">计时开始</option>
                    <option value="table_transfer">换桌</option>
                    <option value="mahjong_start">日麻开局</option>
                    <option value="mahjong_gsz_sync">公式站同步</option>
                    <option value="phone_bound">手机号绑定</option>
                    <option value="order_settled">订单结算</option>
                    <option value="membership_change">会员变更</option>
                    <option value="pass_expiring">通行卡到期</option>
                  </select>
                  <button
                    type="button"
                    className={clsx(
                      "btn btn-secondary",
                      notifyPending && "loading",
                    )}
                    disabled={notifyPending}
                    onClick={() => void handleSendTestNotify()}
                  >
                    {notifyPending ? "发送中..." : "发送"}
                  </button>
                </div>
              </div>
            </>
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
                  {getStoredValueBalance(membershipPlans) > 0 && (
                    <span className="badge badge-accent badge-lg">
                      储值余额: ¥
                      {(getStoredValueBalance(membershipPlans) / 100).toFixed(
                        0,
                      )}
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

              {membershipPlans.length === 0 ? (
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
                      {membershipPlans.map((plan) => {
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

          {activeTab === "occupancy" && (
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
                            className={`badge badge-xs ${m.mode === "4p" || m.mode === "FOUR_PLAYER" ? "badge-primary" : "badge-secondary"}`}
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
                        search={{
                          q: "",
                          page: 1,
                        }}
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
                  search={{
                    q: "",
                    sortBy: "start_at",
                    sortOrder: "desc",
                    groupBy: "none",
                    page: 1,
                  }}
                  className="btn btn-xs btn-ghost btn-primary"
                >
                  查看全部订单
                </Link>
              </div>

              {rawOccupancies.length === 0 ? (
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
                                rawOccupancies.filter(
                                  (o: UserOccupancy) =>
                                    (o.status as string).toLowerCase() !==
                                    "ended",
                                ).length > 0 &&
                                rawOccupancies
                                  .filter(
                                    (o: UserOccupancy) =>
                                      (o.status as string).toLowerCase() !==
                                      "ended",
                                  )
                                  .every((o: UserOccupancy) =>
                                    selectedOccIds.has(o.id),
                                  )
                              }
                              onChange={() => {
                                const nonEnded = rawOccupancies
                                  .filter(
                                    (o: UserOccupancy) =>
                                      (o.status as string).toLowerCase() !==
                                      "ended",
                                  )
                                  .map((o: UserOccupancy) => o.id);
                                if (
                                  nonEnded.every((oid: string) =>
                                    selectedOccIds.has(oid),
                                  )
                                ) {
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
                        {rawOccupancies.map((occ: UserOccupancy) => {
                          const start = dayjs(occ.startAt);
                          const diffMin = dayjs().diff(start, "minute");
                          const hours = Math.floor(diffMin / 60);
                          const minutes = diffMin % 60;
                          const durationStr =
                            hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;
                          const occStatus = (
                            occ.status as string
                          ).toLowerCase() as OccStatus;

                          return (
                            <tr key={occ.id}>
                              <td>
                                {occStatus !== "ended" && (
                                  <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm"
                                    checked={selectedOccIds.has(occ.id)}
                                    onChange={() => toggleOccSelect(occ.id)}
                                  />
                                )}
                              </td>
                              <td>
                                {occStatus === "active" ? (
                                  <span className="badge badge-success badge-sm">
                                    进行中
                                  </span>
                                ) : occStatus === "paused" ? (
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
                                  params={{
                                    id: occ.tableId,
                                  }}
                                  className="link link-hover"
                                >
                                  {occ.table?.name ?? occ.tableId}
                                </Link>
                              </td>
                              <td className="text-sm">
                                {start.isValid()
                                  ? start.format("MM/DD HH:mm")
                                  : "—"}
                              </td>
                              <td className="text-sm">{durationStr}</td>
                              <td className="font-mono text-sm">
                                {occ.finalPrice != null
                                  ? formatPrice(occ.finalPrice)
                                  : "—"}
                              </td>
                              <th>
                                <div className="flex items-center gap-1">
                                  {occStatus === "active" && (
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
                                  {occStatus === "paused" && (
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
                                  {occStatus !== "ended" && (
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-ghost btn-error"
                                      onClick={() =>
                                        void handleEndOccOrder(
                                          occ.id,
                                          occStatus,
                                        )
                                      }
                                      disabled={orderActionPending === occ.id}
                                    >
                                      <StopIcon className="size-3.5" />
                                      终止
                                    </button>
                                  )}
                                  {occStatus === "ended" && (
                                    <Link
                                      to="/dash/orders/settle"
                                      search={{ ids: [occ.id] }}
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
          )}
        </div>

        {selectedOccIds.size > 0 && (
          <BatchActionBar
            count={selectedOccIds.size}
            unit="个订单"
            onClear={() => setSelectedOccIds(new Set())}
            actions={[
              ...(rawOccupancies.some(
                (o: UserOccupancy) =>
                  selectedOccIds.has(o.id) &&
                  (o.status as string).toLowerCase() === "active",
              )
                ? [
                    {
                      key: "pause",
                      label: "批量暂停",
                      icon: <PauseIcon className="size-4" />,
                      className: "btn-ghost",
                      disabled: orderActionPending === "batch",
                      onClick: () => void handleBatchPauseOcc(),
                    } satisfies BatchAction,
                  ]
                : []),
              ...(rawOccupancies.some(
                (o: UserOccupancy) =>
                  selectedOccIds.has(o.id) &&
                  (o.status as string).toLowerCase() === "paused",
              )
                ? [
                    {
                      key: "resume",
                      label: "批量继续",
                      icon: <PlayIcon className="size-4" />,
                      className: "btn-success",
                      disabled: orderActionPending === "batch",
                      onClick: () => void handleBatchResumeOcc(),
                    } satisfies BatchAction,
                  ]
                : []),
              {
                key: "settle",
                label: "批量结算",
                icon: <StopIcon className="size-4" />,
                className: "btn-primary",
                onClick: handleBatchSettleOcc,
              },
            ]}
          />
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
                      setAddForm((p) => ({
                        ...p,
                        amount: e.target.value,
                      }))
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
                    setAddForm((p) => ({
                      ...p,
                      startDate: e.target.value,
                    }));
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
                      setAddForm((p) => ({
                        ...p,
                        endDate: e.target.value,
                      }));
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
                  ¥{(getStoredValueBalance(membershipPlans) / 100).toFixed(0)}
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
