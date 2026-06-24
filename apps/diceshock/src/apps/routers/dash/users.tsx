import {
  CopyIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  UserMinusIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import {
  getPlanConfig,
  getStoredValueBalance,
  isActivePlan,
  type MembershipPlan,
} from "@/client/components/diceshock/MembershipBadge";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  useDisableUserMutation,
  useUsersQuery,
} from "@/client/graphql/__generated__";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import { useTranslation } from "@/client/hooks/useTranslation";
import dayjs from "@/shared/utils/dayjs-config";

type UserList = NonNullable<
  ReturnType<typeof useUsersQuery>["data"]
>["managedUsers"];
type UserItem = UserList["items"][number];

const PAGE_SIZE = 30;

export const Route = createFileRoute("/dash/users")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
    page: Number(search.page) > 0 ? Number(search.page) : 1,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const msg = useMsg();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { q, page } = Route.useSearch();
  const navigate = useNavigate();
  const setSearch = useCallback(
    (updates: Partial<{ q: string; page: number }>) =>
      navigate({
        from: "/dash/users",
        search: (prev) => ({ ...prev, ...updates }),
        replace: true,
      }),
    [navigate],
  );

  const { data, loading } = useUsersQuery({
    variables: {
      input: {
        searchWords: q.trim() || undefined,
        pagination: {
          offset: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        },
      },
    },
    fetchPolicy: "cache-and-network",
  });

  const [disableUser] = useDisableUserMutation();

  const disableDialogRef = useRef<HTMLDialogElement>(null);

  const [pendingDisable, setPendingDisable] = useState<UserItem | null>(null);
  const [disablePending, setDisablePending] = useState(false);

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      msg.success(t("dashUsers.copied"));
    } catch {
      msg.error(t("dashUsers.clipboardDenied"));
    }
  };

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

  const users = data?.managedUsers?.items ?? [];

  return (
    <main className="size-full flex flex-col">
      <div className="px-4 pt-4">
        <DashBackButton />
      </div>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="w-full flex flex-col items-center gap-6 px-4 pt-4 bg-base-100 z-10"
      >
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <input
            type="text"
            value={q}
            onChange={(evt) => {
              setSearch({ q: evt.target.value, page: 1 });
            }}
            placeholder={t("dashUsers.searchPlaceholder")}
            className="input input-lg w-full"
          />
        </div>
      </form>

      <div className="w-full flex-1 min-h-0 overflow-auto">
        <table className="table table-lg table-pin-rows table-pin-cols min-w-[1200px]">
          <thead>
            <tr className="z-20">
              <th></th>
              <td className="whitespace-nowrap">ID</td>
              <td className="whitespace-nowrap">{t("dashUsers.nickname")}</td>
              <td className="whitespace-nowrap">{t("dashUsers.name")}</td>
              <td className="whitespace-nowrap">{t("dashUsers.role")}</td>
              <td className="whitespace-nowrap">
                {t("dashUsers.membershipPlan")}
              </td>
              <td className="whitespace-nowrap">
                {t("dashUsers.storedBalance")}
              </td>
              <td className="whitespace-nowrap">{t("dashUsers.phone")}</td>
              <td className="whitespace-nowrap">UID</td>
              <td className="whitespace-nowrap">{t("dashUsers.createdAt")}</td>
              <th className="whitespace-nowrap">{t("dashUsers.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="py-12 text-center">
                  <span className="loading loading-dots loading-md"></span>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="py-12 text-center text-base-content/60"
                >
                  {t("dashUsers.noData")}
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const plans = (user.membershipPlans ??
                  []) as unknown as MembershipPlan[];
                const storedBalance = getStoredValueBalance(plans);
                return (
                  <tr key={user.id}>
                    <th className="z-10"></th>
                    <td className="font-mono">
                      <div className="relative group flex items-center gap-1">
                        <span className="cursor-default">
                          {user.id.slice(0, 5)}
                        </span>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost btn-square shrink-0"
                          onClick={() => handleCopy(user.id)}
                          title={t("dashUsers.copyUserId")}
                        >
                          <CopyIcon className="size-3.5" />
                        </button>
                        <div className="absolute right-0 top-full z-30 hidden group-hover:block pt-1">
                          <div className="bg-base-200 shadow-lg rounded-lg px-3 py-1.5 text-xs font-mono whitespace-nowrap">
                            {user.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {user.nickname || "—"}
                    </td>
                    <td className="whitespace-nowrap">{user.name || "—"}</td>
                    <td className="whitespace-nowrap">
                      {user.role === "ADMIN" ? (
                        <span className="badge badge-sm badge-error">
                          {t("dashUsers.admin")}
                        </span>
                      ) : user.role === "STAFF" ? (
                        <span className="badge badge-sm badge-info">
                          {t("dashUsers.staff")}
                        </span>
                      ) : (
                        <span className="badge badge-sm badge-ghost">
                          {t("dashUsers.customer")}
                        </span>
                      )}
                    </td>
                    <td className="relative group">
                      {(() => {
                        const activePlans = plans.filter(isActivePlan);
                        const uniqueTypes = [
                          ...new Set(activePlans.map((p) => p.plan_type)),
                        ].sort(
                          (a, b) =>
                            getPlanConfig(a).priority -
                            getPlanConfig(b).priority,
                        );
                        if (uniqueTypes.length === 0) return "—";
                        return (
                          <>
                            <div className="flex items-center gap-1.5">
                              {uniqueTypes.map((t) => {
                                const cfg = getPlanConfig(t);
                                return <cfg.icon key={t} className="size-5" />;
                              })}
                            </div>
                            <div className="absolute left-0 top-full z-30 hidden group-hover:block pt-1">
                              <div className="card card-sm shadow-lg bg-base-200 w-56">
                                <div className="card-body p-3 flex flex-col gap-1.5">
                                  {uniqueTypes.map((t) => {
                                    const cfg = getPlanConfig(t);
                                    return (
                                      <div
                                        key={t}
                                        className="flex items-center gap-2"
                                      >
                                        <cfg.icon className="size-5 shrink-0" />
                                        <span className="text-sm">
                                          {cfg.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </td>
                    <td>
                      {storedBalance > 0 ? (
                        <span className="font-mono text-sm">
                          ¥{(storedBalance / 100).toFixed(0)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap">{user.phone || "—"}</td>
                    <td className="font-mono whitespace-nowrap">
                      {user.uid || "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      {user.createdAt
                        ? dayjs(user.createdAt).format("YYYY/MM/DD HH:mm")
                        : "—"}
                    </td>
                    <th className="whitespace-nowrap">
                      {isMobile ? (
                        <div className="dropdown dropdown-end">
                          <div
                            tabIndex={0}
                            role="button"
                            className="btn btn-xs btn-ghost btn-square"
                          >
                            <DotsThreeVerticalIcon
                              className="size-4"
                              weight="bold"
                            />
                          </div>
                          <ul
                            tabIndex={0}
                            className="dropdown-content menu bg-base-200 rounded-box z-50 w-32 p-2 shadow-lg"
                          >
                            <li>
                              <Link
                                to="/dash/users/$id"
                                params={{ id: user.id }}
                              >
                                <EyeIcon className="size-4" />
                                {t("dashUsers.details")}
                              </Link>
                            </li>
                            <li>
                              <button
                                type="button"
                                className="text-error"
                                onClick={() => openDisableDialog(user)}
                              >
                                <UserMinusIcon className="size-4" />
                                {t("dashUsers.disable")}
                              </button>
                            </li>
                          </ul>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 py-2 h-full">
                          <Link
                            to="/dash/users/$id"
                            params={{ id: user.id }}
                            className="btn btn-xs btn-ghost btn-primary"
                          >
                            {t("dashUsers.details")}
                            <EyeIcon />
                          </Link>

                          <button
                            type="button"
                            className="btn btn-xs btn-ghost btn-error"
                            onClick={() => openDisableDialog(user)}
                          >
                            {t("dashUsers.disable")}
                            <UserMinusIcon />
                          </button>
                        </div>
                      )}
                    </th>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
