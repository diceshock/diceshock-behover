import { useSession } from "@hono/auth-js/react";
import {
  DotsThreeVerticalIcon,
  EyeIcon,
  UserMinusIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashTable } from "@/client/components/dash/DashTable";
import { DateRangeFilter } from "@/client/components/dash/DateRangeFilter";
import { usePendingSearch } from "@/client/components/dash/SearchBridge";
import { TableToolbar } from "@/client/components/dash/TableToolbar";
import { useSelectedTableData } from "@/client/components/dash/useSelectedTableData";
import type { BatchAction } from "@/client/components/diceshock/BatchActionBar";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
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
  useUsersQuery,
} from "@/client/graphql/__generated__";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import { useTranslation } from "@/client/hooks/useTranslation";
import {
  type ParsedSearch,
  parseSearch,
  serialize,
  USER_SEARCH_GRAMMAR,
} from "@/client/lib/searchParser";
import dayjs from "@/shared/utils/dayjs-config";

type UserList = NonNullable<
  ReturnType<typeof useUsersQuery>["data"]
>["managedUsers"];
type UserItem = UserList["items"][number];

const PAGE_SIZE = 30;
const PLAN_TYPE_BY_RAW: Record<string, MembershipPlan["plan_type"]> = {
  [MembershipPlanType.Monthly]: "monthly",
  [MembershipPlanType.MonthlyCc]: "monthly_cc",
  [MembershipPlanType.StoredValue]: "stored_value",
  [MembershipPlanType.Yearly]: "yearly",
};

export const Route = createFileRoute("/dash/users")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
    page: Number(search.page) > 0 ? Number(search.page) : 1,
  }),
  component: RouteComponent,
});

export function buildFilter(
  parsed: ParsedSearch,
  page: number,
  sorting: SortingState,
) {
  const roleFilter = parsed.filters.role?.value;
  const storeFilter = parsed.filters.store?.value;
  const nameFilter = parsed.filters.name?.value;
  const dateFilter = parsed.filters.date?.value;

  let dateFrom: string | undefined;
  let dateTo: string | undefined;
  if (dateFilter) {
    if (typeof dateFilter === "string") {
      dateFrom = dateTo = dateFilter;
    } else if (Array.isArray(dateFilter) && dateFilter.length === 2) {
      dateFrom = dateFilter[0];
      dateTo = dateFilter[1];
    }
  }

  const searchParts = [parsed.freeText];
  if (typeof nameFilter === "string") searchParts.push(nameFilter);
  const search = searchParts.filter(Boolean).join(" ") || undefined;

  return {
    search,
    role:
      typeof roleFilter === "string"
        ? [roleFilter.toUpperCase()]
        : Array.isArray(roleFilter)
          ? roleFilter.map((r) => r.toUpperCase())
          : undefined,
    store: typeof storeFilter === "string" ? storeFilter : undefined,
    dateFrom,
    dateTo,
    sortBy: sorting.length > 0 ? sorting[0].id : undefined,
    sortOrder: sorting[0]?.desc ? SortOrder.Desc : SortOrder.Asc,
    pagination: { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
  };
}

function RouteComponent() {
  const msg = useMsg();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { q, page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchInput, setSearchInput] = useState(q);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const { pendingSearch, clearPendingSearch } = usePendingSearch();

  const parsed = useMemo(() => parseSearch(q, USER_SEARCH_GRAMMAR), [q]);

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
    () => buildFilter(parsed, page, sorting),
    [parsed, page, sorting],
  );

  const { data, loading } = useUsersQuery({
    variables: { filter },
    onError: (err) => {
      msg.error(err.message || t("dashUsers.fetchFailed"));
    },
  });

  const [disableUser] = useDisableUserMutation({
    refetchQueries: ["Users"],
  });

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

  const setSearchParam = useCallback(
    (updates: Partial<{ q: string; page: number }>) =>
      navigate({ search: (prev) => ({ ...prev, ...updates }), replace: true }),
    [navigate],
  );

  useEffect(() => {
    if (pendingSearch !== null) {
      setSearchInput(pendingSearch);
      setSearchParam({ q: pendingSearch, page: 1 });
      clearPendingSearch();
    }
  }, [pendingSearch, clearPendingSearch, setSearchParam]);

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
        cell: ({ row }) => (
          <span className="font-mono whitespace-nowrap">
            {row.original.uid || "—"}
          </span>
        ),
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
  const clearSelectedIds = useCallback(() => setSelectedIds(new Set()), []);
  useSelectedTableData({
    entityType: "用户",
    rows: users,
    selectedIds,
    getRowId: (user) => user.id,
    onClear: clearSelectedIds,
  });
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
  const pageInfo = data?.managedUsers?.pageInfo;
  const total = pageInfo?.total ?? users.length;
  const hasMore = pageInfo?.hasMore ?? false;

  return (
    <main className="size-full flex flex-col">
      <div className="px-4 pt-4 flex items-center gap-3">
        <DashBackButton />
        <TableToolbar
          searchBar={{
            grammar: USER_SEARCH_GRAMMAR,
            value: searchInput,
            onChange: setSearchInput,
            onSubmit: (parsedResult) => {
              const serialized = serialize(parsedResult, USER_SEARCH_GRAMMAR);
              setSearchParam({ q: serialized, page: 1 });
            },
            placeholder: t("dashUsers.searchPlaceholder") ?? "Search users…",
          }}
          quickFilters={[
            {
              label: t("dashUsers.admin"),
              key: "role",
              value: "admin",
              active: parsed.filters.role?.value === "admin",
            },
            {
              label: t("dashUsers.staff"),
              key: "role",
              value: "staff",
              active: parsed.filters.role?.value === "staff",
            },
            {
              label: t("dashUsers.customer"),
              key: "role",
              value: "authenticated",
              active: parsed.filters.role?.value === "authenticated",
            },
          ]}
          extra={
            <DateRangeFilter
              value={
                parsed.filters.date
                  ? {
                      from: Array.isArray(parsed.filters.date.value)
                        ? parsed.filters.date.value[0]
                        : typeof parsed.filters.date.value === "string"
                          ? parsed.filters.date.value
                          : undefined,
                      to: Array.isArray(parsed.filters.date.value)
                        ? parsed.filters.date.value[1]
                        : typeof parsed.filters.date.value === "string"
                          ? parsed.filters.date.value
                          : undefined,
                    }
                  : undefined
              }
              onChange={(range) => {
                const nextFilters = { ...parsed.filters };
                if (!range) {
                  delete nextFilters.date;
                } else if (range.from && range.to) {
                  nextFilters.date = { operator: "range", value: [range.from, range.to] };
                } else if (range.from) {
                  nextFilters.date = { operator: "gt", value: range.from };
                } else if (range.to) {
                  nextFilters.date = { operator: "lt", value: range.to };
                }
                const serialized = serialize(
                  { ...parsed, filters: nextFilters, errors: [] },
                  USER_SEARCH_GRAMMAR,
                );
                setSearchInput(serialized);
                setSearchParam({ q: serialized, page: 1 });
              }}
            />
          }
        />
      </div>

      <div className="flex-1 min-h-0">
        <DashTable
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage={t("dashUsers.noData")}
          pagination={{
            offset: (page - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
            total,
            hasMore,
          }}
          onPaginationChange={(p) =>
            setSearchParam({
              page: Math.floor(p.offset / PAGE_SIZE) + 1,
            })
          }
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
                    <button
                      type="button"
                      className="text-error"
                      onClick={() => openDisableDialog(row)}
                    >
                      <UserMinusIcon className="size-4" />
                      {t("dashUsers.disable")}
                    </button>
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
                <button
                  type="button"
                  className="btn btn-xs btn-ghost btn-error"
                  onClick={() => openDisableDialog(row)}
                >
                  {t("dashUsers.disable")}
                  <UserMinusIcon />
                </button>
              </div>
            )
          }
        />
      </div>

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
