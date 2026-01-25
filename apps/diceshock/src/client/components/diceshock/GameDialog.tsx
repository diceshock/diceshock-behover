import type { BoardGame } from "@lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import Modal, { type ToggleEvent } from "@/client/components/modal";
import { useMsg } from "@/client/components/diceshock/Msg";
import trpcClientPublic from "@/shared/utils/trpc";

type ToggleEventParam = Parameters<ToggleEvent>[0];

type BoardGameItem = Awaited<
  ReturnType<typeof trpcClientPublic.owned.get.query>
>[number];

type GameTag = {
  id: string;
  title: { emoji: string; tx: string } | null;
  keywords: string | null;
  is_pinned: boolean | null;
  is_game_enabled: boolean | null;
  order?: number | null; // 标签顺序，用于排序
};

type GameForm = {
  event_date: string;
  max_participants: string;
  selectedBoardGames: number[];
  selectedTags: string[];
};

type GameDialogProps = {
  isOpen: boolean;
  onToggle: (event: ToggleEventParam) => void;
  gameId?: string; // 如果提供，则是编辑模式
  initialData?: Partial<GameForm>;
  onSuccess?: () => void;
};

export default function GameDialog({
  isOpen,
  onToggle,
  gameId,
  initialData,
  onSuccess,
}: GameDialogProps) {
  const msg = useMsg();
  const [gameForm, setGameForm] = useState<GameForm>({
    event_date: initialData?.event_date || "",
    max_participants: initialData?.max_participants || "40",
    selectedBoardGames: initialData?.selectedBoardGames || [],
    selectedTags: initialData?.selectedTags || [],
  });

  const [gameTags, setGameTags] = useState<GameTag[]>([]);
  const [allGameTags, setAllGameTags] = useState<GameTag[]>([]); // 所有标签（用于搜索）
  const [gameTagSearchQuery, setGameTagSearchQuery] = useState("");
  const [gameBoardGames, setGameBoardGames] = useState<
    Array<{
      id: string;
      gstone_id: number | null;
      content: BoardGame.BoardGameCol | null;
    }>
  >([]);
  const [gameSearchQuery, setGameSearchQuery] = useState("");
  const [gameSearchResults, setGameSearchResults] = useState<
    Array<{
      id: string;
      gstone_id: number | null;
      content: BoardGame.BoardGameCol | null;
    }>
  >([]);
  const [submitting, setSubmitting] = useState(false);

  // 获取置顶标签和已选标签
  const fetchPinnedTags = useCallback(async () => {
    try {
      const pinnedTags = await trpcClientPublic.activeTags.getGameTags.query({
        onlyPinned: true,
        onlyGameEnabled: true,
      });
      setGameTags(pinnedTags);
    } catch (error) {
      console.error("获取置顶标签失败", error);
    }
  }, []);

  // 获取所有标签（用于搜索）
  const fetchAllTags = useCallback(async () => {
    try {
      const allTags = await trpcClientPublic.activeTags.getGameTags.query({
        search: gameTagSearchQuery || undefined,
        onlyGameEnabled: true,
      });
      setAllGameTags(allTags);
    } catch (error) {
      console.error("获取标签失败", error);
    }
  }, [gameTagSearchQuery]);

  // 计算显示的标签：默认只展示置顶标签和已选标签（已选标签始终展示），搜索时才展示其他标签
  const displayedTags = useMemo(() => {
    const pinnedTags = gameTags;
    const selectedTagIds = new Set(gameForm.selectedTags);
    
    // 排序函数：置顶的在前，然后按 order 排序
    const sortTags = (tags: typeof allGameTags) => {
      return [...tags].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        // 对于相同置顶状态的标签，按 order 排序
        const orderA =
          a.order !== null && a.order !== undefined
            ? a.order
            : Number.MAX_SAFE_INTEGER;
        const orderB =
          b.order !== null && b.order !== undefined
            ? b.order
            : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.id.localeCompare(b.id);
      });
    };
    
    // 如果没有搜索查询，只显示置顶标签和已选标签
    if (!gameTagSearchQuery) {
      const tagMap = new Map<string, GameTag>();
      
      // 先添加置顶标签
      pinnedTags.forEach((tag) => {
        tagMap.set(tag.id, tag);
      });
      
      // 添加已选标签（如果不在置顶中，从 allGameTags 中查找）
      allGameTags.forEach((tag) => {
        if (selectedTagIds.has(tag.id) && !tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag);
        }
      });
      
      return sortTags(Array.from(tagMap.values()));
    }
    
    // 如果有搜索查询，显示所有匹配的标签（包括置顶、已选和其他匹配的）
    const searchMatchedTags = allGameTags.filter((tag) => {
      const title = tag.title?.tx?.toLowerCase() || "";
      const keywords = tag.keywords?.toLowerCase() || "";
      const emoji = tag.title?.emoji || "";
      const query = gameTagSearchQuery.toLowerCase();
      return (
        title.includes(query) ||
        keywords.includes(query) ||
        emoji.includes(query)
      );
    });

    // 合并：置顶标签 + 已选标签（如果不在置顶中）+ 搜索匹配的标签（去重）
    const tagMap = new Map<string, GameTag>();

    // 先添加置顶标签
    pinnedTags.forEach((tag) => {
      tagMap.set(tag.id, tag);
    });

    // 添加已选标签（如果不在置顶中）
    allGameTags.forEach((tag) => {
      if (selectedTagIds.has(tag.id) && !tagMap.has(tag.id)) {
        tagMap.set(tag.id, tag);
      }
    });

    // 添加搜索匹配的标签（如果不在已添加的标签中）
    searchMatchedTags.forEach((tag) => {
      if (!tagMap.has(tag.id)) {
        tagMap.set(tag.id, tag);
      }
    });

    return sortTags(Array.from(tagMap.values()));
  }, [gameTags, allGameTags, gameForm.selectedTags, gameTagSearchQuery]);

  useEffect(() => {
    if (isOpen) {
      fetchPinnedTags();
      fetchAllTags();
      // 如果有初始数据，设置表单
      if (initialData) {
        setGameForm({
          event_date: initialData.event_date || "",
          max_participants: initialData.max_participants || "40",
          selectedBoardGames: initialData.selectedBoardGames || [],
          selectedTags: initialData.selectedTags || [],
        });
      }
    } else {
      // 关闭时重置
      setGameForm({
        event_date: "",
        max_participants: "40",
        selectedBoardGames: [],
        selectedTags: [],
      });
      setGameTagSearchQuery("");
      setGameSearchQuery("");
      setGameSearchResults([]);
      setGameBoardGames([]);
    }
  }, [isOpen, initialData, fetchPinnedTags, fetchAllTags]);

  // 当搜索查询变化时，重新获取所有标签
  useEffect(() => {
    if (isOpen) {
      fetchAllTags();
    }
  }, [isOpen, fetchAllTags]);

  // 搜索桌游
  const searchGameBoardGames = useCallback(async (query: string) => {
    if (!query.trim()) {
      setGameSearchResults([]);
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
      setGameSearchResults(
        results.map((game: BoardGameItem) => ({
          id: game.id,
          gstone_id: game.gstone_id,
          content: game.content,
        })),
      );
    } catch (error) {
      console.error("搜索桌游失败", error);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!gameForm.event_date.trim()) {
      msg.warning("请选择约局时间");
      return;
    }

    if (gameForm.selectedTags.length > 15) {
      msg.warning("最多只能选择15个标签");
      return;
    }

    try {
      setSubmitting(true);
      if (gameId) {
        // 编辑模式
        await trpcClientPublic.active.updateGame.mutate({
          id: gameId,
          event_date: gameForm.event_date,
          max_participants: gameForm.max_participants
            ? parseInt(gameForm.max_participants, 10)
            : 40,
          board_game_ids:
            gameForm.selectedBoardGames.length > 0
              ? gameForm.selectedBoardGames
              : undefined,
          tag_ids:
            gameForm.selectedTags.length > 0
              ? gameForm.selectedTags
              : undefined,
        });
        msg.success("约局更新成功");
      } else {
        // 创建模式
        await trpcClientPublic.active.createGame.mutate({
          event_date: gameForm.event_date,
          max_participants: gameForm.max_participants
            ? parseInt(gameForm.max_participants, 10)
            : 40,
          board_game_ids:
            gameForm.selectedBoardGames.length > 0
              ? gameForm.selectedBoardGames
              : undefined,
          tag_ids:
            gameForm.selectedTags.length > 0
              ? gameForm.selectedTags
              : undefined,
        });
        msg.success("约局创建成功");
      }
      onToggle({ open: false, target: undefined });
      onSuccess?.();
    } catch (error) {
      console.error(gameId ? "更新约局失败" : "创建约局失败", error);
      msg.error(
        error instanceof Error
          ? error.message
          : gameId
            ? "更新约局失败"
            : "创建约局失败",
      );
    } finally {
      setSubmitting(false);
    }
  }, [gameForm, gameId, msg, onToggle, onSuccess]);

  return (
    <Modal isOpen={isOpen} onToggle={onToggle} isCloseOnClick>
      <div className="modal-box max-w-2xl max-h-[90vh] flex flex-col">
        <h3 className="font-bold text-lg mb-4 shrink-0">
          {gameId ? "编辑约局" : "创建约局"}
        </h3>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
          {/* 时间选择 */}
          <div>
            <label className="label">
              <span className="label-text">约局时间 *</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={gameForm.event_date}
              onChange={(e) =>
                setGameForm((prev) => ({
                  ...prev,
                  event_date: e.target.value,
                }))
              }
            />
          </div>

          {/* 人数上限 */}
          <div>
            <label className="label">
              <span className="label-text">人数上限（默认40人）</span>
            </label>
            <input
              type="number"
              min="1"
              className="input input-bordered w-full"
              placeholder="例如：40（默认40人）"
              value={gameForm.max_participants}
              onChange={(e) =>
                setGameForm((prev) => ({
                  ...prev,
                  max_participants: e.target.value,
                }))
              }
            />
          </div>

          {/* 约局标签选择 */}
          <div>
            <label className="label">
              <span className="label-text">
                选择约局标签（可选，最多15个）
                {gameForm.selectedTags.length > 0 && (
                  <span className="text-sm text-base-content/60 ml-2">
                    ({gameForm.selectedTags.length}/15)
                  </span>
                )}
              </span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full mb-2"
              placeholder="搜索标签（留空则只显示置顶标签和已选标签）..."
              value={gameTagSearchQuery}
              onChange={(e) => {
                setGameTagSearchQuery(e.target.value);
              }}
            />
            {displayedTags.length === 0 ? (
              <div className="alert alert-warning">
                <span>
                  {gameTagSearchQuery
                    ? "未找到匹配的标签"
                    : "暂无置顶标签，请先在后台管理页面添加并置顶标签，或使用搜索查找所有标签"}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {displayedTags.map((tag) => {
                  const isSelected = gameForm.selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setGameForm((prev) => {
                          if (isSelected) {
                            // 取消选择
                            return {
                              ...prev,
                              selectedTags: prev.selectedTags.filter(
                                (id) => id !== tag.id,
                              ),
                            };
                          } else {
                            // 选择：检查是否超过15个
                            if (prev.selectedTags.length >= 15) {
                              msg.warning("最多只能选择15个标签");
                              return prev;
                            }
                            return {
                              ...prev,
                              selectedTags: [...prev.selectedTags, tag.id],
                            };
                          }
                        });
                      }}
                      disabled={
                        !isSelected && gameForm.selectedTags.length >= 15
                      }
                      className={`badge badge-lg gap-2 ${
                        isSelected ? "badge-primary" : "badge-outline"
                      } ${
                        !isSelected && gameForm.selectedTags.length >= 15
                          ? "opacity-50 cursor-not-allowed"
                          : ""
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
              value={gameSearchQuery}
              onChange={(e) => {
                setGameSearchQuery(e.target.value);
                searchGameBoardGames(e.target.value);
              }}
            />

            {/* 搜索结果 */}
            {gameSearchQuery && gameSearchResults.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <div
                  className="flex gap-2 px-1"
                  style={{ width: "max-content" }}
                >
                  {gameSearchResults.map((game) => {
                    const gameContent = game.content;
                    if (!gameContent || !game.gstone_id) return null;

                    const isSelected = gameForm.selectedBoardGames.includes(
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
                          setGameForm((prev) => ({
                            ...prev,
                            selectedBoardGames: isSelected
                              ? prev.selectedBoardGames.filter(
                                  (id) => id !== gstoneId,
                                )
                              : [...prev.selectedBoardGames, gstoneId],
                          }));
                          // 添加到已选择列表以便显示
                          if (!isSelected) {
                            setGameBoardGames((prev) => {
                              if (
                                prev.some((g) => g.gstone_id === gstoneId)
                              ) {
                                return prev;
                              }
                              return [...prev, game];
                            });
                          } else {
                            setGameBoardGames((prev) =>
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
                                (e.target as HTMLImageElement).style.display =
                                  "none";
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
            {gameForm.selectedBoardGames.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-2">已选择的桌游</div>
                <div className="flex flex-wrap gap-2">
                  {gameBoardGames
                    .filter(
                      (game) =>
                        game.gstone_id &&
                        gameForm.selectedBoardGames.includes(game.gstone_id),
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
                              setGameForm((prev) => ({
                                ...prev,
                                selectedBoardGames:
                                  prev.selectedBoardGames.filter(
                                    (id) => id !== game.gstone_id,
                                  ),
                              }));
                              setGameBoardGames((prev) =>
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
          <button
            onClick={() => onToggle({ open: false })}
            className="btn btn-ghost"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting && (
              <span className="loading loading-spinner loading-sm" />
            )}
            {gameId ? "保存" : "创建约局"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
