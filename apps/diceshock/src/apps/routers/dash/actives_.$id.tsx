import { PaperPlaneTiltIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import {
  ClientOnly,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import TiptapEditor from "@/client/components/diceshock/TiptapEditor";
import {
  ArticleType,
  useManagedActiveQuery,
  usePublishArticleToWechatMutation,
  useRemoveActiveRegistrationMutation,
  useUpdateActiveMutation,
} from "@/client/graphql/__generated__";

type ActiveDetail = NonNullable<
  ReturnType<typeof useManagedActiveQuery>["data"]
>["managedActive"];
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

  const [submitting, setSubmitting] = useState(false);

  const { loading, refetch } = useManagedActiveQuery({
    variables: { id },
    onCompleted: (res) => {
      const active = res.managedActive;
      setTitle(active.title);
      setDate(active.date);
      setTime(active.time ?? "");
      setMaxPlayers(active.maxPlayers);
      setBoardGameId(active.boardGameId ?? "");
      setContent(active.content ?? "");
      setIsGame(active.isGame ?? true);

      setJoinedUsers(
        active.registrations.filter((r: Registration) => !r.isWatching) as Registration[],
      );
      setWatchingUsers(
        active.registrations.filter((r: Registration) => r.isWatching) as Registration[],
      );
    },
    onError: (err) => {
      msg.error(err.message || "加载活动失败");
    },
  });

  const [updateActiveMutation] = useUpdateActiveMutation({
    refetchQueries: ["ManagedActive"],
  });

  const [removeActiveRegistrationMutation] =
    useRemoveActiveRegistrationMutation({
      refetchQueries: ["ManagedActive"],
    });

  const [publishArticleMutation] = usePublishArticleToWechatMutation();
  const [publishing, setPublishing] = useState(false);
  const publishDialogRef = useRef<HTMLDialogElement>(null);

  const handlePublishToWechat = async (autoPublish: boolean) => {
    setPublishing(true);
    try {
      const { data } = await publishArticleMutation({
        variables: {
          input: { type: ArticleType.Active, id, autoPublish },
        },
      });
      const result = data?.publishArticleToWechat;
      if (result?.success) {
        msg.success(
          autoPublish
            ? "已发布到微信服务号"
            : "草稿已创建，请在微信公众平台确认发布",
        );
      } else {
        msg.error(`发布失败: ${result?.error ?? "未知错误"}`);
      }
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "发布失败");
    } finally {
      setPublishing(false);
      publishDialogRef.current?.close();
    }
  };

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
        await updateActiveMutation({
          variables: {
            input: {
              id,
              title: title.trim(),
              date,
              time: time || null,
              maxPlayers,
              boardGameId: boardGameId.trim() || null,
              content: content || null,
              isGame,
            },
          },
        });
        msg.success("活动已保存");
        navigate({ to: "/dash/actives", search: { q: "" } });
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
      updateActiveMutation,
    ],
  );

  const handleRemoveRegistration = async (reg: Registration) => {
    try {
      await removeActiveRegistrationMutation({
        variables: { registrationId: reg.id },
      });
      msg.success("已移除");
      await refetch();
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
          <DashBackButton to="/dash/actives" />
        </div>

        <div className="mx-auto w-full max-w-2xl px-4 pb-20">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">活动详情</h1>
            <button
              type="button"
              className={clsx("btn btn-sm btn-primary gap-1", publishing && "loading")}
              onClick={() => publishDialogRef.current?.showModal()}
              disabled={publishing}
            >
              <PaperPlaneTiltIcon className="size-4" weight="fill" />
              发布到微信
            </button>
          </div>

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
                  placeholder="活动标题"
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
                  placeholder="活动详情..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    navigate({ to: "/dash/actives", search: { q: "" } })
                  }
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

      <dialog ref={publishDialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">发布到微信服务号</h3>
          <p className="text-sm text-base-content/70 mb-2">
            将此活动渲染为图片文章并同步到微信服务号。
          </p>
          <p className="text-sm text-base-content/70">
            「创建草稿」仅创建草稿，需要在微信公众平台手动发布；「立即发布」将直接发布到服务号。
          </p>
          <div className="modal-action mt-6">
            <button
              type="button"
              className="btn"
              onClick={() => publishDialogRef.current?.close()}
              disabled={publishing}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void handlePublishToWechat(false)}
              disabled={publishing}
            >
              {publishing ? "处理中..." : "创建草稿"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handlePublishToWechat(true)}
              disabled={publishing}
            >
              {publishing ? "发布中..." : "立即发布"}
            </button>
          </div>
        </div>
      </dialog>
    </ClientOnly>
  );
}
