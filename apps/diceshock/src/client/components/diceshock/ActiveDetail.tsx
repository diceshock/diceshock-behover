import { PencilLineIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { Link, useNavigate } from "@tanstack/react-router";
import MDEditor from "@uiw/react-md-editor";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { themeA } from "@/client/components/ThemeSwap";
import ActiveRegistration from "@/client/components/diceshock/ActiveRegistration";
import useAuth from "@/client/hooks/useAuth";
import { useMessages } from "@/client/hooks/useMessages";
import type { ApiRouterPublic, ApiRouterDash } from "@/shared/types";
import type { createTRPCClient } from "@trpc/client";
import { formatEventDate } from "@/shared/utils/formatEventDate";
import trpcClientPublic from "@/shared/utils/trpc";
import type { BoardGame } from "@lib/utils";

type TrpcClientPublic = ReturnType<typeof createTRPCClient<ApiRouterPublic>>;
type TrpcClientDash = ReturnType<typeof createTRPCClient<ApiRouterDash>>;

type Active =
  | Awaited<ReturnType<TrpcClientPublic["active"]["getById"]["query"]>>
  | Awaited<ReturnType<TrpcClientDash["active"]["getById"]["query"]>>;

type ActiveDetailProps = {
  active: NonNullable<Active>;
  activeId: string;
  isPreview?: boolean;
  onPublish?: () => void;
  onEdit?: () => void;
};

export default function ActiveDetail({
  active,
  activeId,
  isPreview = false,
  onPublish,
  onEdit,
}: ActiveDetailProps) {
  const theme = useAtomValue(themeA);
  const { session } = useAuth();
  const messages = useMessages();
  const navigate = useNavigate();
  const [boardGames, setBoardGames] = useState<
    Array<{ gstone_id: number; content: BoardGame.BoardGameCol | null }>
  >([]);
  const [deleting, setDeleting] = useState(false);

  // 编辑约局弹窗相关状态
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const [editForm, setEditForm] = useState({
    event_date: "",
    max_participants: "", // 队伍人数上限
    selectedBoardGames: [] as number[],
    selectedTags: [] as string[],
  });
  const [editGameTags, setEditGameTags] = useState<
    Array<{
      id: string;
      title: { emoji: string; tx: string } | null;
      keywords: string | null;
      is_pinned: boolean | null;
    }>
  >([]);
  const [editGameTagSearchQuery, setEditGameTagSearchQuery] = useState("");
  const [editBoardGames, setEditBoardGames] = useState<
    Array<{
      id: string;
      gstone_id: number | null;
      content: BoardGame.BoardGameCol | null;
    }>
  >([]);
  const [editSearchQuery, setEditSearchQuery] = useState("");
  const [editSearchResults, setEditSearchResults] = useState<
    Array<{
      id: string;
      gstone_id: number | null;
      content: BoardGame.BoardGameCol | null;
    }>
  >([]);
  const [updatingGame, setUpdatingGame] = useState(false);

  // 检查是否是约局发起者
  const isCreator =
    (active as any)?.is_game &&
    (active as any)?.creator_id &&
    session?.user?.id === (active as any).creator_id;

  // 获取活动的桌游列表（展示页面，不包含失效的桌游）
  const fetchBoardGames = useCallback(async () => {
    try {
      const games = await trpcClientPublic.active.boardGames.get.query({
        active_id: activeId,
        includeRemoved: false, // 展示页面不显示失效的桌游
      });
      setBoardGames(games);
    } catch (error) {
      console.error("获取桌游列表失败", error);
    }
  }, [activeId]);

  useEffect(() => {
    fetchBoardGames();
  }, [fetchBoardGames]);

  // 获取约局标签
  const fetchEditGameTags = useCallback(async () => {
    try {
      // 如果没有搜索查询，默认只显示置顶标签；有搜索查询时显示所有匹配的标签
      const allTags = await trpcClientPublic.activeTags.getGameTags.query({
        search: editGameTagSearchQuery || undefined,
        onlyPinned: !editGameTagSearchQuery, // 没有搜索时只显示置顶标签
      });
      setEditGameTags(allTags);
    } catch (error) {
      console.error("获取约局标签失败", error);
    }
  }, [editGameTagSearchQuery]);

  useEffect(() => {
    if (isCreator) {
      fetchEditGameTags();
    }
  }, [isCreator, fetchEditGameTags]);

  // 加载现有约局数据到编辑表单
  const loadGameData = useCallback(async () => {
    if (!isCreator || !(active as any)?.is_game) return;

    try {
      // 加载时间
      const eventDate = (active as any)?.event_date
        ? new Date((active as any).event_date).toISOString().slice(0, 16)
        : "";

      // 加载标签
      const tagIds = active?.tags?.map((tagMapping) => tagMapping.tag.id) || [];

      // 加载桌游
      const games = await trpcClientPublic.active.boardGames.get.query({
        active_id: activeId,
        includeRemoved: true, // 编辑时包含失效的桌游
      });
      const gstoneIds = games.map((g) => g.gstone_id);
      setEditBoardGames(
        games.map((g) => ({
          id: g.gstone_id.toString(),
          gstone_id: g.gstone_id,
          content: g.content,
        })),
      );

      // 加载队伍人数上限（约局只有一个队伍）
      const teams = await trpcClientPublic.activeRegistrations.teams.get.query({
        active_id: activeId,
      });
      const maxParticipants =
        teams.length > 0 && teams[0].max_participants
          ? String(teams[0].max_participants)
          : "";

      setEditForm({
        event_date: eventDate,
        max_participants: maxParticipants,
        selectedBoardGames: gstoneIds,
        selectedTags: tagIds,
      });
    } catch (error) {
      console.error("加载约局数据失败", error);
    }
  }, [active, activeId, isCreator]);

  // 打开编辑弹窗
  const handleOpenEdit = useCallback(() => {
    loadGameData();
    editDialogRef.current?.showModal();
  }, [loadGameData]);

  // 搜索桌游（用于编辑约局）
  const searchEditBoardGames = useCallback(async (query: string) => {
    if (!query.trim()) {
      setEditSearchResults([]);
      return;
    }

    try {
      const results = await trpcClientPublic.owned.get.query({
        page: 1,
        pageSize: 20,
        params: {
          searchWords: query,
          tags: [],
          numOfPlayers: undefined,
          isBestNumOfPlayers: false,
        },
      });
      setEditSearchResults(
        results.map((game) => ({
          id: game.id,
          gstone_id: game.gstone_id,
          content: game.content,
        })),
      );
    } catch (error) {
      console.error("搜索桌游失败", error);
    }
  }, []);

  // 保存编辑
  const handleUpdateGame = useCallback(async () => {
    try {
      setUpdatingGame(true);
      await trpcClientPublic.active.updateGame.mutate({
        id: activeId,
        event_date: editForm.event_date || undefined,
        max_participants: editForm.max_participants
          ? parseInt(editForm.max_participants, 10)
          : null,
        board_game_ids:
          editForm.selectedBoardGames.length > 0
            ? editForm.selectedBoardGames
            : undefined,
        tag_ids:
          editForm.selectedTags.length > 0 ? editForm.selectedTags : undefined,
      });
      messages.success("约局更新成功");
      editDialogRef.current?.close();
      // 刷新页面数据
      window.location.reload();
    } catch (error) {
      console.error("更新约局失败", error);
      messages.error(error instanceof Error ? error.message : "更新约局失败");
    } finally {
      setUpdatingGame(false);
    }
  }, [editForm, activeId, messages]);

  const handleDelete = useCallback(async () => {
    // 检查是否有参与者
    let hasParticipants = false;
    try {
      const registrations =
        await trpcClientPublic.activeRegistrations.registrations.get.query({
          active_id: activeId,
        });
      hasParticipants = registrations.length > 0;
    } catch (error) {
      console.error("获取报名信息失败", error);
    }

    const confirmMessage = hasParticipants
      ? "确定要删除这个约局吗？\n\n已有参与者报名，请确保已与所有参与者沟通好后再删除。\n\n删除后无法恢复，所有报名信息将被清除。"
      : "确定要删除这个约局吗？\n\n删除后无法恢复。";

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeleting(true);
      await trpcClientPublic.active.delete.mutate({ id: activeId });
      messages.success("约局删除成功");
      navigate({ to: "/actives" });
    } catch (error) {
      console.error("删除约局失败", error);
      messages.error(error instanceof Error ? error.message : "删除约局失败");
    } finally {
      setDeleting(false);
    }
  }, [activeId, messages, navigate]);

  return (
    <main className="w-full min-h-[calc(100vh-20rem)] p-4 max-w-4xl mx-auto">
      {/* 预览模式下的未发布提示 */}
      {isPreview && (!active?.is_published || active?.is_deleted) && (
        <div className="alert alert-warning mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="font-bold">活动未发布</h3>
            <div className="text-xs">
              {active?.is_deleted
                ? "该活动已被删除"
                : "该活动尚未发布，用户无法访问"}
            </div>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Link
                to="/dash/active/$id"
                params={{ id: activeId }}
                className="btn btn-sm btn-ghost"
              >
                编辑
              </Link>
            )}
            {onPublish && !active?.is_deleted && (
              <button className="btn btn-sm btn-primary" onClick={onPublish}>
                发布
              </button>
            )}
          </div>
        </div>
      )}

      {active?.cover_image?.trim() && (
        <div className="mb-8 -mx-4 sm:mx-0">
          <img
            src={active.cover_image}
            alt={active.name || "头图"}
            className="w-full h-auto max-h-96 object-cover rounded-lg shadow-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      <article className="prose prose-lg max-w-none">
        <header className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-4xl font-bold">{active?.name}</h1>
            {/* 发起者操作按钮 */}
            {isCreator && (
              <div className="flex gap-2 ml-4">
                <button
                  onClick={handleOpenEdit}
                  className="btn btn-sm btn-outline"
                >
                  <PencilLineIcon className="size-4 mr-1" />
                  编辑
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn btn-sm btn-error"
                >
                  {deleting ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <TrashIcon className="size-4 mr-1" />
                  )}
                  移除
                </button>
              </div>
            )}
          </div>

          {active?.description && (
            <p className="text-xl text-base-content/70 mb-4">
              {active.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {active?.tags?.map((tagMapping) => (
              <span
                key={tagMapping.tag.id}
                className="badge badge-primary badge-lg"
              >
                {tagMapping.tag.title?.emoji && (
                  <span className="mr-1">{tagMapping.tag.title.emoji}</span>
                )}
                {tagMapping.tag.title?.tx || "未命名"}
              </span>
            ))}
          </div>

          {active?.event_date && (
            <div className="text-lg font-semibold text-primary mb-2">
              {formatEventDate(active.event_date)}
            </div>
          )}
        </header>

        {/* 报名组件 - 仅在开启报名时显示 */}
        {active?.enable_registration && (
          <ActiveRegistration
            activeId={activeId}
            allowWatching={active.allow_watching ?? false}
          />
        )}

        <div data-color-mode={theme ?? "light"} className="mt-8">
          <MDEditor.Markdown
            source={active?.content ?? ""}
            className="bg-transparent!"
          />
        </div>
      </article>

      {/* 已添加的桌游卡片 - 显示在文章底部 */}
      {boardGames.length > 0 && (
        <div className="mt-12 not-prose">
          <h2 className="text-2xl font-bold mb-4">活动桌游</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boardGames.map((game) => {
              const gameContent = game.content;
              if (!gameContent) return null;

              return (
                <div
                  key={game.gstone_id}
                  className="card bg-base-100 shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {gameContent.sch_cover_url && (
                    <figure className="h-32 overflow-hidden">
                      <img
                        src={gameContent.sch_cover_url}
                        alt={gameContent.sch_name || gameContent.eng_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </figure>
                  )}
                  <div className="card-body p-3">
                    <h4 className="card-title text-sm line-clamp-2">
                      {gameContent.sch_name || gameContent.eng_name}
                    </h4>
                    {gameContent.gstone_rating && (
                      <div className="text-xs text-base-content/50">
                        评分: {gameContent.gstone_rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 编辑约局弹窗 */}
      {isCreator && (
        <dialog ref={editDialogRef} className="modal">
          <div className="modal-box max-w-2xl max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-lg mb-4 shrink-0">编辑约局</h3>

            <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
              {/* 时间选择 */}
              <div>
                <label className="label">
                  <span className="label-text">约局时间 *</span>
                </label>
                <input
                  type="datetime-local"
                  className="input input-bordered w-full"
                  value={editForm.event_date}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      event_date: e.target.value,
                    }))
                  }
                />
              </div>

              {/* 人数上限 */}
              <div>
                <label className="label">
                  <span className="label-text">人数上限（留空表示无上限）</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="input input-bordered w-full"
                  placeholder="例如：4"
                  value={editForm.max_participants}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      max_participants: e.target.value,
                    }))
                  }
                />
              </div>

              {/* 约局标签选择 */}
              <div>
                <label className="label">
                  <span className="label-text">选择约局标签（可选）</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full mb-2"
                  placeholder="搜索标签（留空则只显示置顶标签）..."
                  value={editGameTagSearchQuery}
                  onChange={(e) => {
                    setEditGameTagSearchQuery(e.target.value);
                  }}
                />
                {editGameTags.length === 0 ? (
                  <div className="alert alert-warning">
                    <span>
                      {editGameTagSearchQuery
                        ? "未找到匹配的标签"
                        : "暂无置顶标签，请先在后台管理页面添加并置顶标签，或使用搜索查找所有标签"}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {editGameTags.map((tag) => {
                      const isSelected = editForm.selectedTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            setEditForm((prev) => ({
                              ...prev,
                              selectedTags: isSelected
                                ? prev.selectedTags.filter(
                                    (id) => id !== tag.id,
                                  )
                                : [...prev.selectedTags, tag.id],
                            }));
                          }}
                          className={`badge badge-lg gap-2 ${
                            isSelected ? "badge-primary" : "badge-outline"
                          }`}
                        >
                          <span>{tag.title?.emoji || "🎲"}</span>
                          {tag.title?.tx || "约局"}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 桌游搜索和选择 */}
              <div>
                <label className="label">
                  <span className="label-text">添加桌游（可选）</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full mb-2"
                  placeholder="搜索桌游..."
                  value={editSearchQuery}
                  onChange={(e) => {
                    setEditSearchQuery(e.target.value);
                    searchEditBoardGames(e.target.value);
                  }}
                />

                {/* 搜索结果 */}
                {editSearchQuery && editSearchResults.length > 0 && (
                  <div className="mb-4 overflow-x-auto">
                    <div
                      className="flex gap-2 px-1"
                      style={{ width: "max-content" }}
                    >
                      {editSearchResults.map((game) => {
                        const gameContent = game.content;
                        if (!gameContent || !game.gstone_id) return null;

                        const isSelected = editForm.selectedBoardGames.includes(
                          game.gstone_id,
                        );

                        return (
                          <div
                            key={game.id}
                            className={`card bg-base-200 shadow-sm overflow-hidden cursor-pointer w-32 shrink-0 ${
                              isSelected ? "ring-2 ring-primary" : ""
                            }`}
                            onClick={() => {
                              const gstoneId = game.gstone_id!;
                              setEditForm((prev) => ({
                                ...prev,
                                selectedBoardGames: isSelected
                                  ? prev.selectedBoardGames.filter(
                                      (id) => id !== gstoneId,
                                    )
                                  : [...prev.selectedBoardGames, gstoneId],
                              }));
                              // 添加到已选择列表以便显示
                              if (!isSelected) {
                                setEditBoardGames((prev) => {
                                  if (
                                    prev.some((g) => g.gstone_id === gstoneId)
                                  ) {
                                    return prev;
                                  }
                                  return [...prev, game];
                                });
                              } else {
                                setEditBoardGames((prev) =>
                                  prev.filter((g) => g.gstone_id !== gstoneId),
                                );
                              }
                            }}
                          >
                            {gameContent.sch_cover_url && (
                              <figure className="h-20 overflow-hidden">
                                <img
                                  src={gameContent.sch_cover_url}
                                  alt={
                                    gameContent.sch_name || gameContent.eng_name
                                  }
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              </figure>
                            )}
                            <div className="card-body p-2">
                              <h4 className="card-title text-xs line-clamp-2">
                                {gameContent.sch_name || gameContent.eng_name}
                              </h4>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 已选择的桌游 */}
                {editForm.selectedBoardGames.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2">
                      已选择的桌游
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editBoardGames
                        .filter(
                          (game) =>
                            game.gstone_id &&
                            editForm.selectedBoardGames.includes(
                              game.gstone_id,
                            ),
                        )
                        .map((game) => {
                          const gameContent = game.content;
                          if (!gameContent || !game.gstone_id) return null;
                          return (
                            <div
                              key={game.gstone_id}
                              className="badge badge-primary gap-2"
                            >
                              {gameContent.sch_name || gameContent.eng_name}
                              <button
                                onClick={() => {
                                  setEditForm((prev) => ({
                                    ...prev,
                                    selectedBoardGames:
                                      prev.selectedBoardGames.filter(
                                        (id) => id !== game.gstone_id,
                                      ),
                                  }));
                                  setEditBoardGames((prev) =>
                                    prev.filter(
                                      (g) => g.gstone_id !== game.gstone_id,
                                    ),
                                  );
                                }}
                                className="btn btn-xs btn-circle btn-ghost"
                              >
                                {"×"}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-action shrink-0">
              <form method="dialog">
                <button className="btn btn-ghost">取消</button>
              </form>
              <button
                onClick={handleUpdateGame}
                disabled={updatingGame}
                className="btn btn-primary"
              >
                {updatingGame && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                保存
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>关闭</button>
          </form>
        </dialog>
      )}
    </main>
  );
}
