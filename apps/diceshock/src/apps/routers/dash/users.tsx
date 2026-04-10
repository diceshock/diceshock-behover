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
import { useIsMobile } from "@/client/hooks/useIsMobile";
import dayjs from "@/shared/utils/dayjs-config";
import { trpcClientDash } from "@/shared/utils/trpc";

type UserList = Awaited<ReturnType<typeof trpcClientDash.users.get.query>>;
type UserItem = UserList[number];

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
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const disableDialogRef = useRef<HTMLDialogElement>(null);

  const [pendingDisable, setPendingDisable] = useState<UserItem | null>(null);
  const [disablePending, setDisablePending] = useState(false);

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      msg.success("已复制");
    } catch {
      msg.error("没有剪贴板访问权限");
    }
  };

  const refreshUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        searchWords?: string;
      } = {};

      if (q.trim()) {
        params.searchWords = q.trim();
      }

      const data = await trpcClientDash.users.get.query({
        page,
        pageSize: PAGE_SIZE,
        params,
      });

      setUsers(data);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "获取用户失败");
    } finally {
      setLoading(false);
    }
  }, [q, page, msg]);

  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

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
      await trpcClientDash.users.disable.mutate({ id: pendingDisable.id });
      msg.success("用户已关停");
      disableDialogRef.current?.close();
      setPendingDisable(null);
      await refreshUsers();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "关停失败");
    } finally {
      setDisablePending(false);
    }
  };

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
            placeholder="搜索用户 ID、手机号、UID、邮箱、昵称..."
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
              <td className="whitespace-nowrap">昵称</td>
              <td className="whitespace-nowrap">姓名</td>
              <td className="whitespace-nowrap">会员计划</td>
              <td className="whitespace-nowrap">储值余额</td>
              <td className="whitespace-nowrap">手机号</td>
              <td className="whitespace-nowrap">UID</td>
              <td className="whitespace-nowrap">创建时间</td>
              <th className="whitespace-nowrap">操作</th>
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
                  暂无用户，尝试调整搜索条件。
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const plans = ((user as any).membershipPlans ??
                  []) as MembershipPlan[];
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
                          title="复制用户ID"
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
                      {user.userInfo?.nickname || "—"}
                    </td>
                    <td className="whitespace-nowrap">{user.name || "—"}</td>
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
                      {user.userInfo?.uid || "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      {user.userInfo?.create_at
                        ? dayjs(user.userInfo.create_at).format(
                            "YYYY/MM/DD HH:mm",
                          )
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
                                详情
                              </Link>
                            </li>
                            <li>
                              <button
                                type="button"
                                className="text-error"
                                onClick={() => openDisableDialog(user)}
                              >
                                <UserMinusIcon className="size-4" />
                                关停
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
                            详情
                            <EyeIcon />
                          </Link>

                          <button
                            type="button"
                            className="btn btn-xs btn-ghost btn-error"
                            onClick={() => openDisableDialog(user)}
                          >
                            关停
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
            <h3 className="font-bold text-lg mb-4">确认关停用户</h3>
            <p>
              关停用户将删除该用户的所有登录会话，使其无法登录。此操作不会删除用户数据。
            </p>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>用户 ID:</strong> {pendingDisable.id}
              </p>
              <p className="text-sm">
                <strong>昵称:</strong>{" "}
                {pendingDisable.userInfo?.nickname || "—"}
              </p>
              <p className="text-sm">
                <strong>邮箱:</strong> {pendingDisable.email || "—"}
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
                取消
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
                {disablePending ? "关停中..." : "确认关停"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
