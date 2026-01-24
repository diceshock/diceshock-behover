import { Link } from "@tanstack/react-router";
import MDEditor from "@uiw/react-md-editor";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { themeA } from "@/client/components/ThemeSwap";
import ActiveRegistration from "@/client/components/diceshock/ActiveRegistration";
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
  const [boardGames, setBoardGames] = useState<
    Array<{ gstone_id: number; content: BoardGame.BoardGameCol | null }>
  >([]);

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
              <button
                className="btn btn-sm btn-primary"
                onClick={onPublish}
              >
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
          <h1 className="text-4xl font-bold mb-4">{active?.name}</h1>

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
                          (e.target as HTMLImageElement).style.display =
                            "none";
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
    </main>
  );
}
