import {
  AddressBookIcon,
  PencilLineIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Link, useNavigate } from "@tanstack/react-router";
import MDEditor from "@uiw/react-md-editor";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { themeA } from "@/client/components/ThemeSwap";
import { ActiveTags } from "@/client/components/diceshock/ActiveTags";
import ActiveRegistration from "@/client/components/diceshock/ActiveRegistration";
import GameDialog from "@/client/components/diceshock/GameDialog";
import ParticipantsBusinessCardsModal from "@/client/components/diceshock/ParticipantsBusinessCardsModal";
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
  const [showParticipantsCards, setShowParticipantsCards] = useState(false);

  // 编辑约局弹窗相关状态
  const [editGameDialogOpen, setEditGameDialogOpen] = useState(false);
  const [editGameInitialData, setEditGameInitialData] = useState<
    | {
        event_date: string;
        max_participants: string;
        selectedBoardGames: number[];
        selectedTags: string[];
      }
    | undefined
  >(undefined);

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

      // 加载队伍人数上限（约局只有一个队伍）
      const teams = await trpcClientPublic.activeRegistrations.teams.get.query({
        active_id: activeId,
      });
      // 约局默认上限为40人，如果没填则显示默认值
      const maxParticipants =
        teams.length > 0 && teams[0].max_participants
          ? String(teams[0].max_participants)
          : "40";

      setEditGameInitialData({
        event_date: eventDate,
        max_participants: maxParticipants,
        selectedBoardGames: gstoneIds,
        selectedTags: tagIds,
      });
      setEditGameDialogOpen(true);
    } catch (error) {
      console.error("加载约局数据失败", error);
    }
  }, [active, activeId, isCreator]);

  // 打开编辑弹窗
  const handleOpenEdit = useCallback(() => {
    loadGameData();
  }, [loadGameData]);

  // 编辑成功后的回调
  const handleEditGameSuccess = useCallback(() => {
    // 刷新页面数据
    window.location.reload();
  }, []);

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
                  onClick={() => setShowParticipantsCards(true)}
                  className="btn btn-sm btn-outline"
                >
                  <AddressBookIcon className="size-4 mr-1" />
                  查看参与者名片
                </button>
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

          <ActiveTags tags={active?.tags} size="lg" className="mb-4" />

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
            isGame={(active as any)?.is_game ?? false}
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

              const coverUrl =
                gameContent.sch_cover_url || gameContent.eng_cover_url;

              return (
                <div
                  key={game.gstone_id}
                  className="card bg-base-100 shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {coverUrl ? (
                    <figure className="h-48 md:h-60 lg:h-72 overflow-hidden relative bg-base-300">
                      <img
                        src={coverUrl}
                        alt={gameContent.sch_name || gameContent.eng_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // 如果图片加载失败，隐藏图片但保留容器
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {/* 渐变遮罩层 */}
                      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/30 pointer-events-none" />
                      {/* 标题覆盖在图片上 */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                        <h4 className="card-title text-sm md:text-base text-white line-clamp-2 drop-shadow-lg">
                          {gameContent.sch_name || gameContent.eng_name}
                        </h4>
                        {gameContent.gstone_rating && (
                          <div className="text-xs text-white/90 mt-1 drop-shadow">
                            评分: {gameContent.gstone_rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </figure>
                  ) : (
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
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 编辑约局弹窗 */}
      {isCreator && (active as any)?.is_game && (
        <GameDialog
          isOpen={editGameDialogOpen}
          onToggle={(e) => setEditGameDialogOpen(e.open)}
          gameId={activeId}
          initialData={editGameInitialData}
          onSuccess={handleEditGameSuccess}
        />
      )}

      {/* 参与者名片弹窗 */}
      {isCreator && (active as any)?.is_game && (
        <ParticipantsBusinessCardsModal
          isOpen={showParticipantsCards}
          onClose={() => setShowParticipantsCards(false)}
          activeId={activeId}
        />
      )}
    </main>
  );
}
