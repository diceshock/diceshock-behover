import { TrashIcon } from "@phosphor-icons/react/dist/ssr";
import {
  ClientOnly,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import TiptapEditor from "@/client/components/diceshock/TiptapEditor";
import { trpcClientDash } from "@/shared/utils/trpc";

type ActiveDetail = Awaited<
  ReturnType<typeof trpcClientDash.activesManagement.getById.query>
>;
type Registration = ActiveDetail["registrations"][number];

type Tab = "info" | "members";

export const Route = createFileRoute("/dash/actives_/$id")({
  component: ActiveEditorPage,
});

function ActiveEditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const msg = useMsg();

  const [tab, setTab] = useState<Tab>("info");

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(1);
  const [boardGameId, setBoardGameId] = useState("");
  const [content, setContent] = useState("");
  const [isGame, setIsGame] = useState(true);

  const [joinedUsers, setJoinedUsers] = useState<Registration[]>([]);
  const [watchingUsers, setWatchingUsers] = useState<Registration[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    try {
      const active = await trpcClientDash.activesManagement.getById.query({
        id,
      });
      setTitle(active.title);
      setDate(active.date);
      setTime(active.time ?? "");
      setMaxPlayers(active.max_players);
      setBoardGameId(active.board_game_id ?? "");
      setContent(active.content ?? "");
      setIsGame(active.is_game ?? true);

      setJoinedUsers(active.registrations.filter((r) => !r.is_watching));
      setWatchingUsers(active.registrations.filter((r) => r.is_watching));
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载约局失败");
    } finally {
      setLoading(false);
    }
  }, [id, msg]);

  useEffect(() => {
    void fetchActive();
  }, [fetchActive]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        msg.error("请输入标题");
        return;
      }
      if (!date) {
        msg.error("请选择日期");
        return;
      }

      setSubmitting(true);
      try {
        await trpcClientDash.activesManagement.update.mutate({
          id,
          title: title.trim(),
          date,
          time: time || null,
          max_players: maxPlayers,
          board_game_id: boardGameId.trim() || null,
          content: content || null,
          is_game: isGame,
        });
        msg.success("约局已保存");
        navigate({ to: "/dash/actives" });
      } catch (err) {
        msg.error(err instanceof Error ? err.message : "保存失败");
      } finally {
        setSubmitting(false);
      }
    },
    [
      id,
      title,
      date,
      time,
      maxPlayers,
      boardGameId,
      content,
      isGame,
      msg,
      navigate,
    ],
  );

  const handleRemoveRegistration = async (reg: Registration) => {
    try {
      await trpcClientDash.activesManagement.removeRegistration.mutate({
        registrationId: reg.id,
      });
      msg.success("已移除");
      await fetchActive();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "移除失败");
    }
  };

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  return (
    <ClientOnly>
      <main className="size-full overflow-y-auto">
        <div className="px-4 pt-4">
          <DashBackButton to="/dash/actives" label="返回约局列表" />
        </div>

        <div className="mx-auto w-full max-w-2xl px-4 pb-20">
          <h1 className="text-2xl font-bold mb-6">约局详情</h1>

          <div role="tablist" className="tabs tabs-bordered mb-8">
            <button
              type="button"
              role="tab"
              className={clsx("tab", tab === "info" && "tab-active")}
              onClick={() => setTab("info")}
            >
              信息编辑
            </button>
            <button
              type="button"
              role="tab"
              className={clsx("tab", tab === "members" && "tab-active")}
              onClick={() => setTab("members")}
            >
              报名管理 ({joinedUsers.length + watchingUsers.length})
            </button>
          </div>

          {tab === "info" && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">标题</span>
                <input
                  type="text"
                  placeholder="约局标题"
                  className="input input-bordered w-full"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="label text-sm font-semibold">日期</span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="label text-sm font-semibold">
                    时间（可选）
                  </span>
                  <input
                    type="time"
                    className="input input-bordered w-full"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">最大人数</span>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  min={1}
                  max={100}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">
                  桌游ID（可选）
                </span>
                <input
                  type="text"
                  placeholder="桌游ID"
                  className="input input-bordered w-full"
                  value={boardGameId}
                  onChange={(e) => setBoardGameId(e.target.value)}
                />
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={isGame}
                  onChange={(e) => setIsGame(e.target.checked)}
                />
                <span className="text-sm font-semibold">是否桌游</span>
              </label>

              <div className="flex flex-col gap-2">
                <span className="label text-sm font-semibold">
                  内容（可选）
                </span>
                <TiptapEditor
                  content={content}
                  onChange={setContent}
                  placeholder="约局详情..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => navigate({ to: "/dash/actives" })}
                  disabled={submitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={clsx("btn btn-primary", submitting && "loading")}
                  disabled={submitting}
                >
                  {submitting ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          )}

          {tab === "members" && (
            <div className="flex flex-col gap-8">
              <section>
                <h2 className="text-xl font-bold mb-4">
                  已报名 ({joinedUsers.length})
                </h2>
                {joinedUsers.length === 0 ? (
                  <p className="text-base-content/60 text-sm">暂无报名用户。</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {joinedUsers.map((reg) => (
                      <div
                        key={reg.id}
                        className="flex items-center justify-between bg-base-200 rounded-lg px-4 py-2"
                      >
                        <div>
                          <span className="font-medium">{reg.nickname}</span>
                          {reg.uid && (
                            <span className="text-xs text-base-content/60 ml-2">
                              UID: {reg.uid}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost btn-error"
                          onClick={() => void handleRemoveRegistration(reg)}
                        >
                          <TrashIcon className="size-3.5" />
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-xl font-bold mb-4">
                  观望中 ({watchingUsers.length})
                </h2>
                {watchingUsers.length === 0 ? (
                  <p className="text-base-content/60 text-sm">暂无观望用户。</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {watchingUsers.map((reg) => (
                      <div
                        key={reg.id}
                        className="flex items-center justify-between bg-base-200 rounded-lg px-4 py-2"
                      >
                        <div>
                          <span className="font-medium">{reg.nickname}</span>
                          {reg.uid && (
                            <span className="text-xs text-base-content/60 ml-2">
                              UID: {reg.uid}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost btn-error"
                          onClick={() => void handleRemoveRegistration(reg)}
                        >
                          <TrashIcon className="size-3.5" />
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </ClientOnly>
  );
}
