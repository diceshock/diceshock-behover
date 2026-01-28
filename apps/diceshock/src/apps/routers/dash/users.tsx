import {
  PencilLineIcon,
  UserMinusIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import dayjs from "@/shared/utils/dayjs-config";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMsg } from "@/client/components/diceshock/Msg";
import { trpcClientDash } from "@/shared/utils/trpc";

type UserList = Awaited<ReturnType<typeof trpcClientDash.users.get.query>>;
type UserItem = UserList[number];

const PAGE_SIZE = 30;

export const Route = createFileRoute("/dash/users")({
  component: RouteComponent,
});

function RouteComponent() {
  const msg = useMsg();
  const [searchWords, setSearchWords] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const editDialogRef = useRef<HTMLDialogElement>(null);
  const disableDialogRef = useRef<HTMLDialogElement>(null);

  const searchWordsRef = useRef(searchWords);

  useEffect(() => {
    searchWordsRef.current = searchWords;
  }, [searchWords]);

  const [editForm, setEditForm] = useState<{
    id: string;
    name: string;
    nickname: string;
    phone: string;
  } | null>(null);
  const [editPending, setEditPending] = useState(false);

  const [pendingDisable, setPendingDisable] = useState<UserItem | null>(null);
  const [disablePending, setDisablePending] = useState(false);

  const refreshUsers = useCallback(async () => {
    setLoading(true);
    try {
      const currentSearchWords = searchWordsRef.current;

      const params: {
        searchWords?: string;
      } = {};

      if (currentSearchWords.trim()) {
        params.searchWords = currentSearchWords.trim();
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
  }, [page, msg]);

  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

  const openEditDialog = (user: UserItem) => {
    setEditForm({
      id: user.id,
      name: user.name ?? "",
      nickname: user.userInfo?.nickname ?? "",
      phone: user.phone ?? "",
    });
    editDialogRef.current?.showModal();
  };

  const handleEditSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!editForm) return;
    setEditPending(true);
    try {
      await trpcClientDash.users.mutation.mutate({
        id: editForm.id,
        name: editForm.name.trim() || undefined,
        nickname: editForm.nickname.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
      });
      msg.success("用户信息已更新");
      editDialogRef.current?.close();
      setEditForm(null);
      await refreshUsers();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setEditPending(false);
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
    <main className="size-full">
      <div className="px-4 pt-4">
        <DashBackButton />
      </div>
      <form className="w-full flex flex-col items-center gap-6 px-4 pt-4 bg-base-100 z-10">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <input
            type="text"
            value={searchWords}
            onChange={(evt) => {
              setSearchWords(evt.target.value);
              setPage(1);
            }}
            placeholder="搜索用户 ID、手机号、UID、邮箱、昵称..."
            className="input input-lg w-full"
          />
        </div>
      </form>

      <div className="w-full h-[calc(100vh-8rem)] overflow-y-auto overflow-x-auto pb-40">
        <table className="table table-pin-rows table-pin-cols">
          <thead>
            <tr className="z-20">
              <th></th>
              <td>ID</td>
              <td>昵称</td>
              <td>姓名</td>
              <td>邮箱</td>
              <td>手机号</td>
              <td>UID</td>
              <td>创建时间</td>
              <td>操作</td>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center">
                  <span className="loading loading-dots loading-md"></span>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-12 text-center text-base-content/60"
                >
                  暂无用户，尝试调整搜索条件。
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <th className="z-10"></th>
                  <td className="font-mono text-xs">{user.id}</td>
                  <td>{user.userInfo?.nickname || "—"}</td>
                  <td>{user.name || "—"}</td>
                  <td>{user.email || "—"}</td>
                  <td>{user.phone || "—"}</td>
                  <td className="font-mono text-xs">
                    {user.userInfo?.uid || "—"}
                  </td>
                  <td>
                    {user.userInfo?.create_at
                      ? dayjs(user.userInfo.create_at).format(
                          "YYYY/MM/DD HH:mm",
                        )
                      : "—"}
                  </td>
                  <td>
                    <div className="flex items-center gap-4 py-2 h-full">
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost btn-primary"
                        onClick={() => openEditDialog(user)}
                      >
                        编辑
                        <PencilLineIcon />
                      </button>

                      <button
                        type="button"
                        className="btn btn-xs btn-ghost btn-error"
                        onClick={() => openDisableDialog(user)}
                      >
                        关停
                        <UserMinusIcon />
                      </button>
                    </div>
                  </td>
                  <th></th>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <dialog ref={editDialogRef} className="modal">
        <form method="dialog" className="modal-box" onSubmit={handleEditSubmit}>
          <div className="modal-action flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">编辑用户</h3>
            <button
              type="button"
              className="btn btn-ghost btn-square"
              onClick={() => editDialogRef.current?.close()}
            >
              <XIcon />
            </button>
          </div>

          {editForm && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="label">
                  <span className="label-text">用户 ID</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={editForm.id}
                  disabled
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">姓名</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={editForm.name}
                  onChange={(evt) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, name: evt.target.value } : prev,
                    )
                  }
                  placeholder="用户姓名"
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">昵称</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={editForm.nickname}
                  onChange={(evt) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, nickname: evt.target.value } : prev,
                    )
                  }
                  placeholder="用户昵称"
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">手机号</span>
                </label>
                <input
                  type="tel"
                  className="input input-bordered"
                  value={editForm.phone}
                  onChange={(evt) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, phone: evt.target.value } : prev,
                    )
                  }
                  placeholder="手机号"
                />
              </div>
            </div>
          )}

          <div className="modal-action mt-6">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={editPending}
            >
              {editPending ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </dialog>

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
