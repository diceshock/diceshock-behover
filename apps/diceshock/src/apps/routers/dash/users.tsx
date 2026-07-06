import { useSession } from "@hono/auth-js/react";
import {
  DotsThreeVerticalIcon,
  EyeIcon,
  UserMinusIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useCallback, useMemo, useRef, useState } from "react";
import { DataTable } from "@/client/components/dash/DataTable"
import { IdCell } from "@/client/components/dash/IdCell";
import type { FilterValue } from "@/client/components/dash/launcher/types";
import { useSelectedTableData } from "@/client/components/dash/useSelectedTableData";
import type { BatchAction } from "@/client/components/diceshock/BatchActionBar";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import {
  getPlanConfig,
  getStoredValueBalance,
  isActivePlan,
  type MembershipPlan,
} from "@/client/components/diceshock/MembershipBadge";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  MembershipPlanType,
  SortOrder,
  useDisableUserMutation,
  useEnableUserMutation,
  useUsersQuery,
} from "@/client/graphql/__generated__";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import {
  filtersToGqlVariables,
  useRouteFilters,
} from "@/client/hooks/useRouteFilters";
import { useTranslation } from "@/client/hooks/useTranslation";
import dayjs from "@/shared/utils/dayjs-config";

/** Shape of a single user item from the UsersQuery response */
interface UserItem {
  id: string;
  uid: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  disabled: boolean | null;
  nickname: string | null;
  phone: string | null;
  points: number | null;
  preferredLocale: string | null;
  preferredStoreId: string | null;
  meta: string | null;
  createdAt: string | null;
  membershipPlans: Array<{
    id: string;
    userId: string;
    planType: string;
    amount: number | null;
    note: string | null;
    startDate: string;
    endDate: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
}

const BATCH_SIZE = 100

const PLAN_TYPE_BY_RAW: Record<string, MembershipPlan["plan_type"]> = {
  [MembershipPlanType.Monthly]: "monthly",
  [MembershipPlanType.MonthlyCc]: "monthly_cc",
  [MembershipPlanType.StoredValue]: "stored_value",
  [MembershipPlanType.Yearly]: "yearly",
};

export const Route = createFileRoute("/dash/users")({
  validateSearch: (search) => search as Record<string, string>,
  component: RouteComponent,
});

function buildQueryFilter(
  filters: FilterValue[],
  query: string,
  sorting: SortingState,
  offset: number,
) {
  const vars = filtersToGqlVariables(filters, query);

  const search = typeof vars.search === "string" ? vars.search : undefined;
  const role = typeof vars.role === "string"
    ? [vars.role.toUpperCase()]
    : undefined;
  const store = typeof vars.store === "string" ? vars.store : undefined;
  const dateFrom = typeof vars.dateFrom === "string" ? vars.dateFrom : undefined;
  const dateTo = typeof vars.dateTo === "string" ? vars.dateTo : undefined;

  const sortBy = sorting.length > 0
    ? sorting[0].id
    : typeof vars.sortBy === "string"
      ? vars.sortBy
      : undefined;
  const sortOrder = sorting[0]?.desc
    ? SortOrder.Desc
    : vars.sortOrder === "desc"
      ? SortOrder.Desc
      : SortOrder.Asc;

  return {
    search,
    role,
    store,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    pagination: { offset, limit: BATCH_SIZE },
  };
}

function hasRole(user: unknown): user is { role: string } {
  return (
    typeof user === "object" &&
    user !== null &&
    "role" in user &&
    typeof user.role === "string"
  );
}

function RouteComponent() {
  const msg = useMsg();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState(0);
  const { data: session } = useSession();
  const isAdmin = hasRole(session?.user) && session.user.role === "admin";

  const { filters, query } = useRouteFilters();

  // Raw membership plan data shape from GraphQL query
  interface RawMembershipPlan {
    id: string;
    userId: string;
    planType: string;
    amount: number | null;
    startDate: string | null;
    endDate: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }

  const mapRawPlan = useCallback((p: RawMembershipPlan): MembershipPlan => {
    return {
      id: p.id,
      user_id: p.userId,
      plan_type: PLAN_TYPE_BY_RAW[p.planType] ?? "monthly",
      amount: p.amount,
      start_date: p.startDate ?? null,
      end_date: p.endDate ?? null,
      create_at: p.createdAt ?? null,
      update_at: p.updatedAt ?? null,
    };
  }, []);

  const filter = useMemo(
    () => buildQueryFilter(filters, query, sorting, offset),
    [filters, query, sorting, offset],
  );

  const { data, loading, fetchMore } = useUsersQuery({
    variables: { filter },
    onError: (err) => {
      msg.error(err.message || t("dashUsers.fetchFailed"));
    },
  });

  const [disableUser] = useDisableUserMutation({
    refetchQueries: ["Users"],
  });
  const [enableUser] = useEnableUserMutation({ refetchQueries: ["Users"] });

  const confirmEnable = async (userId: string) => {
    try {
      await enableUser({ variables: { id: userId } });
      msg.success(t("dashUsers.restoreSuccess"));
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashUsers.restoreFailed"),
      );
    }
  };

  const disableDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDisable, setPendingDisable] = useState<UserItem | null>(null);
  const [disablePending, setDisablePending] = useState(false);

  const openDisableDialog = (user: UserItem) => {
    setPendingDisable(user);
    setTimeout(() => {
      disableDialogRef.current?.showModal();
    }, 0);
  };

  const confirmDisable = async () => {
    if (!pendingDisable) return;
    setDisablePending(true);
    try {
      await disableUser({ variables: { id: pendingDisable.id } });
      msg.success(t("dashUsers.disableSuccess"));
      disableDialogRef.current?.close();
      setPendingDisable(null);
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashUsers.disableFailed"),
      );
    } finally {
      setDisablePending(false);
    }
  };

  const columns = useMemo<ColumnDef<UserItem, unknown>[]>(
    () => [
      {
        accessorKey: "image",
        header: "",
        cell: ({ row }) =>
          row.original.image ? (
            <img
              src={row.original.image}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center text-sm">
              {(row.original.nickname || row.original.name || "?")
                .charAt(0)
                .toUpperCase()}
            </div>
          ),
      },
      {
        accessorKey: "nickname",
        header: t("dashUsers.nickname"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.nickname || row.original.name || "—"}
          </span>
        ),
      },
      {
        accessorKey: "uid",
        header: "UID",
        size: 120,
        cell: ({ row }) => <IdCell value={row.original.uid ?? ""} />,
      },
      {
        accessorKey: "role",
        header: t("dashUsers.role"),
        cell: ({ row }) => {
          switch (row.original.role) {
            case "ADMIN":
              return (
                <span className="badge badge-sm badge-error">
                  {t("dashUsers.admin")}
                </span>
              );
            case "STAFF":
              return (
                <span className="badge badge-sm badge-info">
                  {t("dashUsers.staff")}
                </span>
              );
            default:
              return (
                <span className="badge badge-sm badge-ghost">
                  {t("dashUsers.customer")}
                </span>
              );
          }
        },
      },
      {
        accessorKey: "phone",
        header: t("dashUsers.phone"),
        cell: ({ row }) => {
          if (!isAdmin)
            return <span className="text-base-content/40">***</span>;
          return (
            <span className="whitespace-nowrap">
              {row.original.phone || "—"}
            </span>
          );
        },
      },
      {
        id: "membership",
        header: t("dashUsers.membershipPlan"),
        cell: ({ row }) => {
          const plans: MembershipPlan[] = (
            row.original.membershipPlans ?? []
          ).map(mapRawPlan);
          const activePlans = plans.filter(isActivePlan);
          const uniqueTypes = [
            ...new Set(activePlans.map((p) => p.plan_type)),
          ].sort(
            (a, b) => getPlanConfig(a).priority - getPlanConfig(b).priority,
          );
          if (uniqueTypes.length === 0) return "—";
          return (
            <div className="flex items-center gap-1.5">
              {uniqueTypes.map((t) => {
                const cfg = getPlanConfig(t);
                return <cfg.icon key={t} className="size-5" />;
              })}
            </div>
          );
        },
      },
      {
        id: "storedBalance",
        header: t("dashUsers.storedBalance"),
        cell: ({ row }) => {
          const plans: MembershipPlan[] = (
            row.original.membershipPlans ?? []
          ).map(mapRawPlan);
          const storedBalance = getStoredValueBalance(plans);
          return storedBalance > 0 ? (
            <span className="font-mono text-sm">
              ¥{(storedBalance / 100).toFixed(0)}
            </span>
          ) : (
            "—"
          );
        },
      },
      {
        accessorKey: "points",
        header: t("dashUsers.points"),
        cell: ({ row }) => (
          <span className="font-mono whitespace-nowrap">
            {row.original.points ?? 0}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("dashUsers.createdAt"),
        cell: ({ row }) =>
          row.original.createdAt
            ? dayjs(row.original.createdAt).format("YYYY/MM/DD HH:mm")
            : "—",
      },
    ],
    [t, isAdmin, mapRawPlan],
  );

  const users = (data?.managedUsers?.items ?? []) as UserItem[];
  const pageInfo = data?.managedUsers?.pageInfo;
  const hasMore = pageInfo?.hasMore ?? false;

  const clearSelectedIds = useCallback(() => setSelectedIds(new Set()), []);
  useSelectedTableData({
    entityType: "用户",
    rows: users,
    selectedIds,
    getRowId: (user) => user.id,
    onClear: clearSelectedIds,
  });

  const handleLoadMore = useCallback(() => {
    const nextOffset = offset + BATCH_SIZE;
    setOffset(nextOffset);
    void fetchMore({
      variables: {
        filter: { ...filter, pagination: { offset: nextOffset, limit: BATCH_SIZE } },
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          ...fetchMoreResult,
          managedUsers: {
            ...fetchMoreResult.managedUsers,
            items: [
              ...prev.managedUsers.items,
              ...fetchMoreResult.managedUsers.items,
            ],
          },
        };
      },
    });
  }, [offset, filter, fetchMore]);

  const selectedActions: BatchAction[] = [
    {
      key: "export-csv",
      label: t("dashUsers.exportCsv"),
      className: "btn-primary",
      onClick: () => {
        const selectedUsers = users.filter((user) => selectedIds.has(user.id));
        const csv = [
          ["id", "nickname", "name", "role", "phone", "uid"].join(","),
          ...selectedUsers.map((user) =>
            [user.id, user.nickname, user.name, user.role, user.phone, user.uid]
              .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
              .join(","),
          ),
        ].join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "users.csv";
        link.click();
        URL.revokeObjectURL(url);
      },
    },
  ];

  return (
    <main className="flex-1 min-h-0 flex flex-col">
      <DataTable columns={columns}
      data={users}
      loading={loading}
      emptyMessage={t("dashUsers.noData")}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
      sorting={sorting}
      onSortingChange={setSorting}
      sortableColumns={["nickname", "role", "points", "createdAt"]}
      enableRowSelection
      selectedRows={selectedIds}
      onSelectedRowsChange={setSelectedIds}
      getRowId={(row) => row.id}
      renderActions={(row) =>
        isMobile ? (
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-xs btn-ghost btn-square"
            >
              <DotsThreeVerticalIcon className="size-4" weight="bold" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-200 rounded-box z-50 w-32 p-2 shadow-lg"
            >
              <li>
                <Link to="/dash/users/$id" params={{ id: row.id }} search={{ tab: "basic" }}>
                  <EyeIcon className="size-4" />
                  {t("dashUsers.details")}
                </Link>
              </li>
              <li>
                {row.disabled ? (
                  <button
                    type="button"
                    className="text-success"
                    onClick={() => confirmEnable(row.id)}
                  >
                    <UserMinusIcon className="size-4" />
                    {t("dashUsers.restore")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-error"
                    onClick={() => openDisableDialog(row)}
                  >
                    <UserMinusIcon className="size-4" />
                    {t("dashUsers.disable")}
                  </button>
                )}
              </li>
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Link
              to="/dash/users/$id"
              params={{ id: row.id }}
              search={{ tab: "basic" }}
              className="btn btn-xs btn-ghost btn-primary"
            >
              {t("dashUsers.details")}
              <EyeIcon />
            </Link>
            {row.disabled ? (
              <button
                type="button"
                className="btn btn-xs btn-ghost btn-success"
                onClick={() => confirmEnable(row.id)}
              >
                {t("dashUsers.restore")}
                <UserMinusIcon />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-xs btn-ghost btn-error"
                onClick={() => openDisableDialog(row)}
              >
                {t("dashUsers.disable")}
                <UserMinusIcon />
              </button>
            )}
          </div>
        )
      } />

      <BatchActionBar
        count={selectedIds.size}
        actions={selectedActions}
        onClear={clearSelectedIds}
        unit="用户"
      />

      <dialog ref={disableDialogRef} className="modal">
        {pendingDisable && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {t("dashUsers.confirmDisableTitle")}
            </h3>
            <p>{t("dashUsers.confirmDisableDescription")}</p>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>{t("dashUsers.userIdLabel")}</strong>{" "}
                {pendingDisable.id}
              </p>
              <p className="text-sm">
                <strong>{t("dashUsers.nicknameLabel")}</strong>{" "}
                {pendingDisable.nickname || "—"}
              </p>
              <p className="text-sm">
                <strong>{t("dashUsers.emailLabel")}</strong>{" "}
                {pendingDisable.email || "—"}
              </p>
            </div>
            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  disableDialogRef.current?.close();
                  setTimeout(() => {
                    setPendingDisable(null);
                  }, 100);
                }}
              >
                {t("dashUsers.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void confirmDisable();
                }}
                disabled={disablePending}
              >
                {disablePending
                  ? t("dashUsers.disabling")
                  : t("dashUsers.confirmDisable")}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
