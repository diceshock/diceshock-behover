import {
  ArrowBendUpRightIcon,
  ArrowLeftIcon,
  PencilLineIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import MDEditor from "@uiw/react-md-editor";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import "@uiw/react-md-editor/markdown-editor.css";
import type { BoardGame } from "@lib/utils";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import { useOnMount } from "@/client/hooks/useOnMount";
import trpcClientPublic, { trpcClientDash } from "@/shared/utils/trpc";

type TagList = Awaited<ReturnType<typeof trpcClientDash.activeTags.get.query>>;
type TagItem = TagList[number];

const tagTitle = (tag?: TagItem["title"] | null) => ({
  emoji: tag?.emoji ?? "🏷️",
  tx: tag?.tx ?? "未命名",
});

export const Route = createFileRoute("/dash/active/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const msg = useMsg();
  const [content, setContent] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // 存储已选择标签的完整数据，用于渲染
  const [selectedTagsData, setSelectedTagsData] = useState<
    Array<{
      id: string;
      title: { emoji: string; tx: string } | null;
      keywords: string | null;
      is_pinned: boolean | null;
      is_game_enabled: boolean | null;
    }>
  >([]);
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [isDeleted, setIsDeleted] = useState<boolean>(false);
  const [enableRegistration, setEnableRegistration] = useState<boolean>(false);
  const [allowWatching, setAllowWatching] = useState<boolean>(false);
  const [eventDate, setEventDate] = useState<string>("");
  const [active, setActive] = useState<Awaited<
    ReturnType<typeof trpcClientDash.active.getById.query>
  > | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [allTags, setAllTags] = useState<
    Array<{
      id: string;
      title: { emoji: string; tx: string } | null;
      keywords: string | null;
      is_pinned: boolean | null;
      is_game_enabled: boolean | null;
    }>
  >([]);
  // 存储所有标签的完整列表（不依赖搜索），用于获取已选择标签的详细信息
  const [allTagsComplete, setAllTagsComplete] = useState<
    Array<{
      id: string;
      title: { emoji: string; tx: string } | null;
      keywords: string | null;
      is_pinned: boolean | null;
      is_game_enabled: boolean | null;
    }>
  >([]);
  const [gameTags, setGameTags] = useState<
    Array<{
      id: string;
      title: { emoji: string; tx: string } | null;
      keywords: string | null;
      is_pinned: boolean | null;
      is_game_enabled: boolean | null;
    }>
  >([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "edit" | "registrations" | "games"
  >("edit");

  // 桌游相关状态
  const [boardGames, setBoardGames] = useState<
    Array<{
      gstone_id: number;
      content: BoardGame.BoardGameCol | null;
      isRemoved: boolean;
    }>
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string;
      gstone_id: number | null;
      content: BoardGame.BoardGameCol | null;
    }>
  >([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // 报名管理相关状态
  const [teams, setTeams] = useState<
    Awaited<
      ReturnType<typeof trpcClientDash.activeRegistrations.teams.get.query>
    >
  >([]);
  const [registrations, setRegistrations] = useState<
    Awaited<
      ReturnType<
        typeof trpcClientDash.activeRegistrations.registrations.get.query
      >
    >
  >([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      // 获取已发布活动使用的标签（用于显示）
      const data = await trpcClientDash.activeTags.get.query();
      setTags(data);
    } catch (error) {
      console.error("获取标签失败", error);
    }
  }, []);

  const fetchAllTags = useCallback(async (searchQuery?: string) => {
    try {
      // 如果没有搜索查询，只获取置顶标签
      // 如果有搜索查询，获取所有匹配的标签
      const data = await trpcClientDash.activeTags.getGameTags.query({
        search: searchQuery || undefined,
        onlyPinned: !searchQuery, // 没有搜索时只显示置顶标签
      });
      setAllTags(data);

      // 如果没有搜索查询，同时更新完整标签列表
      if (!searchQuery) {
        setAllTagsComplete(data);
      }
    } catch (error) {
      console.error("获取所有标签失败", error);
    }
  }, []);

  const fetchGameTags = useCallback(async () => {
    try {
      // 约局标签：排除置顶标签，只显示启用约局的标签
      const allTags = await trpcClientDash.activeTags.getGameTags.query({
        excludePinned: true, // 约局不显示置顶标签
        onlyGameEnabled: true, // 只显示启用约局的标签
      });
      setGameTags(allTags);
    } catch (error) {
      console.error("获取约局标签失败", error);
    }
  }, []);

  useEffect(() => {
    fetchGameTags();
  }, [fetchGameTags]);

  const fetchActive = useCallback(
    async (allTagsCompleteData?: typeof allTagsComplete) => {
      if (!id) {
        msg.error("活动 ID 不存在");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await trpcClientDash.active.getById.query({ id });
        if (!data) {
          msg.error("活动不存在");
          setActive(null);
          setLoading(false);
          return;
        }
        setActive(data);
        setContent(data.content || "");
        setName(data.name || "");
        setDescription(data.description || "");
        setCoverImage(data.cover_image || "");
        const tagIds = data.tags?.map((t) => t.tag_id) || [];
        console.log("加载活动，标签ID:", tagIds);
        console.log("标签数据:", data.tags);
        setSelectedTags(tagIds);

        // 获取已选择标签的完整数据
        if (tagIds.length > 0) {
          // 使用传入的完整标签列表，如果没有则获取所有标签
          let tagsToSearch = allTagsCompleteData || [];
          if (tagsToSearch.length === 0) {
            tagsToSearch = await trpcClientDash.activeTags.getGameTags.query(
              {},
            );
            setAllTagsComplete(tagsToSearch);
          }
          const selectedTagsFullData = tagIds
            .map((tagId) => {
              // 从完整标签列表中查找
              const found = tagsToSearch.find((t) => t.id === tagId);
              return found || null;
            })
            .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));

          setSelectedTagsData(selectedTagsFullData);
        } else {
          setSelectedTagsData([]);
        }
        setIsPublished(Boolean(data.is_published));
        setIsDeleted(Boolean(data.is_deleted));
        setEnableRegistration(Boolean(data.enable_registration));
        setAllowWatching(Boolean(data.allow_watching));
        // 将 event_date 转换为 datetime-local 格式 (YYYY-MM-DDTHH:mm)
        if (data.event_date) {
          const date = new Date(data.event_date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          setEventDate(`${year}-${month}-${day}T${hours}:${minutes}`);
        } else {
          setEventDate("");
        }
      } catch (error) {
        console.error("获取活动失败", error);
        msg.error(
          error instanceof Error ? error.message : "获取活动失败，请稍后重试",
        );
        setActive(null);
      } finally {
        setLoading(false);
      }
    },
    [id, msg],
  );

  const fetchTeams = useCallback(async () => {
    if (!id) return;
    try {
      const data = await trpcClientDash.activeRegistrations.teams.get.query({
        active_id: id,
      });
      setTeams(data);
    } catch (error) {
      console.error("获取队伍失败", error);
    }
  }, [id]);

  const fetchRegistrations = useCallback(async () => {
    if (!id) return;
    try {
      const data =
        await trpcClientDash.activeRegistrations.registrations.get.query({
          active_id: id,
        });
      setRegistrations(data);
    } catch (error) {
      console.error("获取报名失败", error);
    }
  }, [id]);

  // 初始化时获取数据，只执行一次
  useOnMount(async () => {
    // 先获取完整标签列表
    const completeTags = await trpcClientDash.activeTags.getGameTags.query({});
    setAllTagsComplete(completeTags);

    // 然后获取活动数据，传入完整标签列表
    await fetchActive(completeTags);

    // 最后获取其他数据
    await fetchTags();
    await fetchAllTags(); // 初始加载，不传搜索查询（只获取置顶标签）
  });

  // 单独监听搜索查询的变化，使用防抖避免频繁请求
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAllTags(tagSearchQuery);
    }, 300); // 300ms 防抖延迟

    return () => {
      clearTimeout(timer);
    };
  }, [tagSearchQuery, fetchAllTags]);

  useEffect(() => {
    fetchGameTags();
  }, [fetchGameTags]);

  useEffect(() => {
    if (activeTab === "registrations" && id && enableRegistration) {
      fetchTeams();
      fetchRegistrations();
    }
  }, [activeTab, id, enableRegistration, fetchTeams, fetchRegistrations]);

  // 如果关闭报名功能，自动切换回编辑 Tab
  useEffect(() => {
    if (!enableRegistration && activeTab === "registrations") {
      setActiveTab("edit");
    }
  }, [enableRegistration, activeTab]);

  // 获取活动的桌游列表（编辑页面，包含失效的桌游）
  const fetchBoardGames = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingGames(true);
      const games = await trpcClientDash.active.boardGames.get.query({
        active_id: id,
        includeRemoved: true, // 编辑页面显示所有桌游（包括失效的）
      });
      setBoardGames(games);
    } catch (error) {
      console.error("获取桌游列表失败", error);
    } finally {
      setLoadingGames(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === "games" && id) {
      fetchBoardGames();
    }
  }, [activeTab, id, fetchBoardGames]);

  // 搜索桌游
  const searchBoardGames = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setLoadingSearch(true);
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
        setSearchResults(
          results.map((game) => ({
            id: game.id,
            gstone_id: game.gstone_id,
            content: game.content,
          })),
        );
      } catch (error) {
        console.error("搜索桌游失败", error);
        msg.error("搜索桌游失败");
      } finally {
        setLoadingSearch(false);
      }
    },
    [msg],
  );

  // 添加桌游
  const handleAddBoardGame = useCallback(
    async (gstoneId: number) => {
      if (!id) return;
      try {
        await trpcClientDash.active.boardGames.add.mutate({
          active_id: id,
          board_game_id: gstoneId,
        });
        msg.success("桌游添加成功");
        await fetchBoardGames();
      } catch (error) {
        console.error("添加桌游失败", error);
        msg.error("添加桌游失败");
      }
    },
    [id, fetchBoardGames, msg],
  );

  // 移除桌游
  const handleRemoveBoardGame = useCallback(
    async (gstoneId: number) => {
      if (!id) return;
      try {
        await trpcClientDash.active.boardGames.remove.mutate({
          active_id: id,
          board_game_id: gstoneId,
        });
        msg.success("桌游移除成功");
        await fetchBoardGames();
      } catch (error) {
        console.error("移除桌游失败", error);
        msg.error("移除桌游失败");
      }
    },
    [id, fetchBoardGames, msg],
  );

  // 立即保存状态字段（发布状态、垃圾桶、开启报名、允许观望）
  const handleSaveStatus = useCallback(
    async (updates: {
      is_published?: boolean;
      is_deleted?: boolean;
      enable_registration?: boolean;
      allow_watching?: boolean;
    }) => {
      if (!active) return;

      try {
        await trpcClientDash.active.mutation.mutate({
          id: active.id,
          ...updates,
        });
        await fetchActive();
      } catch (error) {
        msg.error(error instanceof Error ? error.message : "保存失败");
        console.error(error);
        // 恢复状态
        await fetchActive();
      }
    },
    [active, fetchActive, msg],
  );

  const handleSave = async () => {
    if (!active) return;

    // 如果是约局，验证标签数量
    if ((active as any)?.is_game && selectedTags.length > 15) {
      msg.warning("约局最多只能选择15个标签");
      return;
    }

    try {
      setSaving(true);
      // 确保传递 tags 参数，即使是空数组也要传递
      const saveData = {
        id: active.id,
        name,
        description,
        content,
        cover_image: coverImage.trim() ? coverImage.trim() : null,
        tags: selectedTags, // 明确传递标签数组
        is_published: isPublished,
        is_deleted: isDeleted,
        enable_registration: enableRegistration,
        allow_watching: allowWatching,
        event_date: eventDate || undefined,
      };

      console.log("保存数据:", JSON.stringify(saveData, null, 2));
      console.log("selectedTags:", selectedTags);

      await trpcClientDash.active.mutation.mutate(saveData);
      msg.success("保存成功");
      // 保存后重新获取活动数据，传入完整标签列表以确保已选择标签的数据正确更新
      const completeTags =
        allTagsComplete.length > 0
          ? allTagsComplete
          : await trpcClientDash.activeTags.getGameTags.query({});
      if (completeTags.length > 0 && allTagsComplete.length === 0) {
        setAllTagsComplete(completeTags);
      }
      await fetchActive(completeTags);
    } catch (error) {
      msg.error("保存失败");
      console.error("保存错误:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="size-full p-4 flex items-center justify-center">
        <span className="loading loading-dots loading-md"></span>
      </main>
    );
  }

  if (!active) {
    return (
      <main className="size-full p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">活动不存在或加载失败</h2>
          <div className="flex gap-2 justify-center">
            <Link to="/dash/acitve" className="btn btn-primary">
              返回列表
            </Link>
            <button onClick={() => fetchActive()} className="btn btn-secondary">
              重试
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="size-full flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-base-100/95 backdrop-blur-sm border-b border-base-300 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* 第一行：返回按钮和操作按钮 */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              <div className="flex gap-2">
                <DashBackButton />
                <Link to="/dash/acitve" className="btn btn-ghost btn-sm">
                  <ArrowLeftIcon className="size-4" />
                  <span className="hidden sm:inline">返回列表</span>
                </Link>
              </div>
              <div className="flex items-center gap-2 sm:hidden">
                {active && (
                  <button
                    type="button"
                    onClick={() => {
                      window.open(
                        new URL(
                          `/dash/active/preview/${active.id}`,
                          window.location.origin,
                        ).href,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                    className="btn btn-ghost btn-sm btn-square"
                  >
                    <ArrowBendUpRightIcon className="size-4" />
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn-primary btn-sm"
                >
                  {saving && (
                    <span className="loading loading-spinner loading-sm" />
                  )}
                  <span className="hidden sm:inline">保存</span>
                  <span className="sm:hidden">保存</span>
                </button>
              </div>
            </div>

            {/* 中间：状态控制 */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
              <label
                className={`label gap-2 ${isDeleted ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="label-text text-xs sm:text-sm whitespace-nowrap">
                  发布状态
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={isPublished}
                  disabled={isDeleted}
                  onChange={async (evt) => {
                    const newValue = evt.target.checked;
                    setIsPublished(newValue);
                    await handleSaveStatus({ is_published: newValue });
                  }}
                />
              </label>
              <label className="label cursor-pointer gap-2">
                <span className="label-text text-xs sm:text-sm whitespace-nowrap">
                  垃圾桶
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-sm toggle-error"
                  checked={isDeleted}
                  onChange={async (evt) => {
                    const newValue = evt.target.checked;
                    setIsDeleted(newValue);
                    await handleSaveStatus({ is_deleted: newValue });
                  }}
                />
              </label>
              {/* 约局始终开启报名和观望，不允许关闭 */}
              {(active as any)?.is_game ? (
                <>
                  <label className="label gap-2 opacity-50 cursor-not-allowed">
                    <span className="label-text text-xs sm:text-sm whitespace-nowrap">
                      开启报名
                    </span>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm toggle-primary"
                      checked={true}
                      disabled={true}
                      readOnly
                    />
                  </label>
                  <label className="label gap-2 opacity-50 cursor-not-allowed">
                    <span className="label-text text-xs sm:text-sm whitespace-nowrap">
                      允许观望
                    </span>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm toggle-secondary"
                      checked={true}
                      disabled={true}
                      readOnly
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="label cursor-pointer gap-2">
                    <span className="label-text text-xs sm:text-sm whitespace-nowrap">
                      开启报名
                    </span>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm toggle-primary"
                      checked={enableRegistration}
                      disabled={isDeleted}
                      onChange={async (evt) => {
                        const newValue = evt.target.checked;
                        setEnableRegistration(newValue);
                        // 如果关闭报名，自动关闭观望
                        if (!newValue && allowWatching) {
                          setAllowWatching(false);
                          await handleSaveStatus({
                            enable_registration: newValue,
                            allow_watching: false,
                          });
                        } else {
                          await handleSaveStatus({
                            enable_registration: newValue,
                          });
                        }
                      }}
                    />
                  </label>
                  <label
                    className={`label gap-2 ${!enableRegistration || isDeleted ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className="label-text text-xs sm:text-sm whitespace-nowrap">
                      允许观望
                    </span>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm toggle-secondary"
                      checked={allowWatching}
                      disabled={!enableRegistration || isDeleted}
                      onChange={async (evt) => {
                        const newValue = evt.target.checked;
                        setAllowWatching(newValue);
                        await handleSaveStatus({
                          allow_watching: newValue,
                        });
                      }}
                    />
                  </label>
                </>
              )}
            </div>

            {/* 右侧：预览和保存按钮（桌面端） */}
            <div className="hidden sm:flex items-center gap-2">
              {active && (
                <Link
                  to="/dash/active/preview/$id"
                  params={{ id: active.id }}
                  className="btn btn-ghost btn-sm"
                >
                  预览
                  <ArrowBendUpRightIcon className="size-4" />
                </Link>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary btn-sm"
              >
                {saving && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                保存
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Tab 导航 */}
          <div role="tablist" className="tabs tabs-border">
            <button
              role="tab"
              className={clsx("tab", activeTab === "edit" && "tab-active")}
              onClick={() => setActiveTab("edit")}
            >
              <PencilLineIcon className="size-4 mr-1" />
              编辑活动
            </button>
            <button
              role="tab"
              className={clsx(
                "tab",
                activeTab === "registrations" && "tab-active",
                !enableRegistration && "opacity-50 cursor-not-allowed",
              )}
              onClick={() => {
                if (enableRegistration) {
                  setActiveTab("registrations");
                } else {
                  msg.warning("请先开启报名功能");
                }
              }}
              disabled={!enableRegistration}
            >
              <UsersIcon className="size-4 mr-1" />
              报名管理
            </button>
            <button
              role="tab"
              className={clsx("tab", activeTab === "games" && "tab-active")}
              onClick={() => setActiveTab("games")}
            >
              🎲 桌游
            </button>
          </div>

          {/* 编辑 Tab */}
          {activeTab === "edit" && (
            <>
              {/* 基本信息 */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title">基本信息</h2>
                  <div className="flex flex-col gap-4">
                    <input
                      type="text"
                      className="input input-bordered"
                      placeholder="活动名称"
                      value={name}
                      onChange={(evt) => setName(evt.target.value)}
                    />
                    <textarea
                      className="textarea textarea-bordered h-24"
                      placeholder="活动简介"
                      value={description}
                      onChange={(evt) => setDescription(evt.target.value)}
                    />
                    <div className="flex flex-col gap-2">
                      <label className="label">
                        <span className="label-text">活动日期</span>
                      </label>
                      <input
                        type="datetime-local"
                        className="input input-bordered"
                        value={eventDate}
                        onChange={(evt) => setEventDate(evt.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="label">
                        <span className="label-text">头图 URL</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered"
                        placeholder="输入头图 URL"
                        value={coverImage}
                        onChange={(evt) => setCoverImage(evt.target.value)}
                      />
                      {coverImage && (
                        <div className="mt-2">
                          <img
                            src={coverImage}
                            alt="头图预览"
                            className="w-full max-h-64 object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 标签 */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title">标签</h2>
                  <div className="flex flex-col gap-4">
                    {/* 如果是约局，只显示约局标签，不能创建新标签 */}
                    {(active as any)?.is_game ? (
                      <>
                        <div className="alert alert-info">
                          <span>
                            约局只能使用后台管理的约局标签（最多15个）
                            {selectedTags.length > 0 && (
                              <span className="ml-2">
                                ({selectedTags.length}/15)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {gameTags.map((tag) => {
                            const title = tagTitle(tag.title);
                            const checked = selectedTags.includes(tag.id);
                            const isDisabled =
                              !checked && selectedTags.length >= 15;
                            return (
                              <label
                                key={tag.id}
                                className={`badge badge-lg gap-2 ${
                                  isDisabled
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="checkbox checkbox-sm"
                                  checked={checked}
                                  disabled={isDisabled}
                                  onChange={() => {
                                    if (checked) {
                                      setSelectedTags((prev) =>
                                        prev.filter((id) => id !== tag.id),
                                      );
                                    } else {
                                      if (selectedTags.length >= 15) {
                                        msg.warning("最多只能选择15个标签");
                                        return;
                                      }
                                      setSelectedTags((prev) => [
                                        ...prev,
                                        tag.id,
                                      ]);
                                    }
                                  }}
                                />
                                <span>{title.emoji}</span>
                                {title.tx}
                              </label>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="alert alert-info">
                          <span>
                            活动可以使用所有标签（包括置顶标签和非约局标签）
                            {selectedTags.length > 0 && (
                              <span className="ml-2">
                                ({selectedTags.length} 个已选择)
                              </span>
                            )}
                          </span>
                        </div>
                        <input
                          type="text"
                          className="input input-bordered w-full mb-2"
                          placeholder="搜索标签（留空则只显示置顶标签）..."
                          value={tagSearchQuery}
                          onChange={(e) => {
                            setTagSearchQuery(e.target.value);
                          }}
                        />
                        {(() => {
                          // 合并已选择的标签和未选择的标签，去重（使用 Set 确保不重复）
                          const displayedTagIds = new Set<string>();
                          const allDisplayTags: Array<{
                            id: string;
                            title: { emoji: string; tx: string } | null;
                            keywords: string | null;
                            is_pinned: boolean | null;
                            is_game_enabled: boolean | null;
                          }> = [];

                          // 先添加已选择的标签（使用存储的完整数据，确保它们始终显示）
                          selectedTagsData.forEach((tag) => {
                            if (!displayedTagIds.has(tag.id)) {
                              allDisplayTags.push(tag);
                              displayedTagIds.add(tag.id);
                            }
                          });

                          // 然后添加未选择的标签（搜索结果）
                          allTags.forEach((tag) => {
                            if (!displayedTagIds.has(tag.id)) {
                              allDisplayTags.push(tag);
                              displayedTagIds.add(tag.id);
                            }
                          });

                          if (allDisplayTags.length === 0) {
                            return (
                              <div className="alert alert-warning">
                                <span>
                                  {tagSearchQuery
                                    ? "未找到匹配的标签"
                                    : "暂无置顶标签或所有标签已被选中"}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div className="flex flex-wrap gap-2">
                              {allDisplayTags.map((tag) => {
                                const title = tagTitle(tag.title);
                                const checked = selectedTags.includes(tag.id);
                                return (
                                  <label
                                    key={tag.id}
                                    className={`badge badge-lg gap-2 cursor-pointer ${
                                      checked
                                        ? "badge-primary"
                                        : "badge-outline"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="checkbox checkbox-sm"
                                      checked={checked}
                                      onChange={() => {
                                        if (checked) {
                                          // 取消选择：从ID列表和完整数据中移除
                                          setSelectedTags((prev) =>
                                            prev.filter((id) => id !== tag.id),
                                          );
                                          setSelectedTagsData((prev) =>
                                            prev.filter((t) => t.id !== tag.id),
                                          );
                                        } else {
                                          // 选择：添加到ID列表和完整数据
                                          setSelectedTags((prev) => [
                                            ...prev,
                                            tag.id,
                                          ]);
                                          setSelectedTagsData((prev) => [
                                            ...prev,
                                            tag,
                                          ]);
                                        }
                                      }}
                                    />
                                    <span>{title.emoji}</span>
                                    {title.tx}
                                  </label>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 内容编辑 */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <h2 className="card-title">内容</h2>
                  <div data-color-mode="light">
                    <MDEditor
                      value={content}
                      onChange={(value) => setContent(value || "")}
                      height={600}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 报名管理 Tab - 仅在开启报名时显示 */}
          {activeTab === "registrations" && enableRegistration && (
            <RegistrationsTab
              activeId={id}
              teams={teams}
              registrations={registrations}
              onRefresh={() => {
                fetchTeams();
                fetchRegistrations();
              }}
              onUserClick={setSelectedUserId}
            />
          )}

          {/* 桌游 Tab */}
          {activeTab === "games" && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title">桌游管理</h2>
                {/* 搜索框 */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="搜索桌游..."
                    className="input input-bordered w-full"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchBoardGames(e.target.value);
                    }}
                  />
                </div>

                {/* 搜索结果 */}
                {loadingSearch && (
                  <div className="text-center py-4">
                    <span className="loading loading-spinner loading-md"></span>
                  </div>
                )}

                {searchQuery && searchResults.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">搜索结果</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {searchResults.map((game) => {
                        const gameContent = game.content;
                        if (!gameContent || !game.gstone_id) return null;

                        const isAdded = boardGames.some(
                          (bg) => bg.gstone_id === game.gstone_id,
                        );

                        return (
                          <div
                            key={game.id}
                            className="card bg-base-200 shadow-md overflow-hidden"
                          >
                            {gameContent.sch_cover_url && (
                              <figure className="h-32 overflow-hidden">
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
                            <div className="card-body p-3">
                              <h4 className="card-title text-sm line-clamp-2">
                                {gameContent.sch_name || gameContent.eng_name}
                              </h4>
                              <div className="card-actions justify-end">
                                {isAdded ? (
                                  <button
                                    className="btn btn-sm btn-error"
                                    onClick={() =>
                                      handleRemoveBoardGame(game.gstone_id!)
                                    }
                                  >
                                    已添加
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() =>
                                      handleAddBoardGame(game.gstone_id!)
                                    }
                                  >
                                    添加
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 已添加的桌游列表 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">已添加的桌游</h3>
                  {loadingGames ? (
                    <div className="text-center py-4">
                      <span className="loading loading-spinner loading-md"></span>
                    </div>
                  ) : boardGames.length === 0 ? (
                    <div className="text-center py-8 text-base-content/50">
                      暂无桌游，请搜索并添加
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {boardGames.map((game) => {
                        const gameContent = game.content;
                        if (!gameContent) return null;

                        return (
                          <div
                            key={game.gstone_id}
                            className={`card bg-base-200 shadow-md overflow-hidden ${
                              game.isRemoved ? "opacity-50" : ""
                            }`}
                          >
                            {game.isRemoved && (
                              <div className="badge badge-warning badge-sm absolute top-2 right-2 z-10">
                                已失效
                              </div>
                            )}
                            {gameContent.sch_cover_url && (
                              <figure className="h-32 overflow-hidden">
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
                            <div className="card-body p-3">
                              <h4 className="card-title text-sm line-clamp-2">
                                {gameContent.sch_name || gameContent.eng_name}
                              </h4>
                              {gameContent.gstone_rating && (
                                <div className="text-xs text-base-content/50">
                                  评分: {gameContent.gstone_rating.toFixed(1)}
                                </div>
                              )}
                              <div className="card-actions justify-end">
                                <button
                                  className="btn btn-sm btn-error"
                                  onClick={() =>
                                    handleRemoveBoardGame(game.gstone_id)
                                  }
                                >
                                  移除
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 用户详情弹窗 */}
      {selectedUserId && (
        <UserDetailsModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </main>
  );
}

// 报名管理 Tab 组件
type RegistrationsTabProps = {
  activeId: string;
  teams: Awaited<
    ReturnType<typeof trpcClientDash.activeRegistrations.teams.get.query>
  >;
  registrations: Awaited<
    ReturnType<
      typeof trpcClientDash.activeRegistrations.registrations.get.query
    >
  >;
  onRefresh: () => void;
  onUserClick: (userId: string) => void;
  isGame?: boolean;
};

function RegistrationsTab({
  activeId,
  teams,
  registrations,
  onRefresh,
  onUserClick,
  isGame = false,
}: RegistrationsTabProps) {
  const msg = useMsg();
  const [teamForm, setTeamForm] = useState({
    name: "",
    description: "",
    max_participants: "",
  });
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // 约局的唯一队伍
  const gameTeam = isGame && teams.length > 0 ? teams[0] : null;
  const [gameMaxParticipants, setGameMaxParticipants] = useState<string>(
    gameTeam?.max_participants ? String(gameTeam.max_participants) : "",
  );

  // 当队伍数据更新时，更新人数上限
  useEffect(() => {
    if (isGame && gameTeam) {
      setGameMaxParticipants(
        gameTeam.max_participants ? String(gameTeam.max_participants) : "",
      );
    }
  }, [isGame, gameTeam]);

  const handleCreateTeam = async () => {
    if (!teamForm.name.trim()) {
      msg.warning("请输入队伍名称");
      return;
    }

    try {
      setCreating(true);
      await trpcClientDash.activeRegistrations.teams.create.mutate({
        active_id: activeId,
        name: teamForm.name.trim(),
        description: teamForm.description.trim() || undefined,
        max_participants: teamForm.max_participants
          ? parseInt(teamForm.max_participants, 10)
          : null,
      });
      msg.success("队伍创建成功");
      setTeamForm({ name: "", description: "", max_participants: "" });
      onRefresh();
    } catch (error) {
      msg.error(error instanceof Error ? error.message : "创建队伍失败");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTeam = async (
    teamId: string,
    updates: {
      name?: string;
      description?: string;
      max_participants?: number | null;
    },
  ) => {
    try {
      await trpcClientDash.activeRegistrations.teams.update.mutate({
        id: teamId,
        ...updates,
      });
      msg.success("队伍更新成功");
      setEditingTeam(null);
      onRefresh();
    } catch (error) {
      msg.error(error instanceof Error ? error.message : "更新队伍失败");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    // 按创建时间排序，第一个队伍不能删除
    const sortedTeams = [...teams].sort((a, b) => {
      const aTime = a.create_at ? new Date(a.create_at).getTime() : 0;
      const bTime = b.create_at ? new Date(b.create_at).getTime() : 0;
      return aTime - bTime;
    });

    if (sortedTeams.length > 0 && sortedTeams[0].id === teamId) {
      msg.warning("不能删除第一个队伍");
      return;
    }

    if (teams.length <= 1) {
      msg.warning("至少需要保留一个队伍");
      return;
    }

    if (!confirm("确定要删除此队伍吗？")) return;

    try {
      await trpcClientDash.activeRegistrations.teams.delete.mutate({
        id: teamId,
      });
      msg.success("队伍删除成功");
      onRefresh();
    } catch (error) {
      msg.error(error instanceof Error ? error.message : "删除队伍失败");
    }
  };

  const watchingCount = registrations.filter((r) => r.is_watching).length;
  const participatingCount = registrations.filter((r) => !r.is_watching).length;

  // 更新约局队伍人数上限
  const handleUpdateGameTeamMaxParticipants = async () => {
    if (!isGame || !gameTeam) return;

    const maxParticipants = gameMaxParticipants.trim()
      ? parseInt(gameMaxParticipants, 10)
      : null;

    if (maxParticipants !== null && maxParticipants < 1) {
      msg.warning("人数上限必须大于0");
      return;
    }

    try {
      await trpcClientDash.activeRegistrations.teams.update.mutate({
        id: gameTeam.id,
        max_participants: maxParticipants,
      });
      msg.success("人数上限更新成功");
      onRefresh();
    } catch (error) {
      msg.error(error instanceof Error ? error.message : "更新人数上限失败");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 统计信息 */}
      <div className="stats stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-title">队伍数</div>
          <div className="stat-value">{teams.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">已报名</div>
          <div className="stat-value">{participatingCount}</div>
        </div>
        <div className="stat">
          <div className="stat-title">观望中</div>
          <div className="stat-value">{watchingCount}</div>
        </div>
      </div>

      {/* 约局人数上限设置 */}
      {isGame && gameTeam && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title">人数上限</h2>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="label">
                  <span className="label-text">人数上限（留空表示无上限）</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="input input-bordered w-full"
                  placeholder="例如：4"
                  value={gameMaxParticipants}
                  onChange={(e) => setGameMaxParticipants(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleUpdateGameTeamMaxParticipants}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 队伍管理 - 约局不显示 */}
      {!isGame && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title">队伍管理</h2>
            <div className="flex flex-col gap-4">
              {/* 创建队伍表单 */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    placeholder="队伍名称"
                    value={teamForm.name}
                    onChange={(e) =>
                      setTeamForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                  <input
                    type="number"
                    className="input input-bordered w-32"
                    placeholder="人数上限（留空无上限）"
                    value={teamForm.max_participants}
                    onChange={(e) =>
                      setTeamForm((prev) => ({
                        ...prev,
                        max_participants: e.target.value,
                      }))
                    }
                    min="1"
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateTeam}
                    disabled={creating}
                  >
                    <PlusIcon className="size-4" />
                    创建队伍
                  </button>
                </div>
                <textarea
                  className="textarea textarea-bordered textarea-sm"
                  placeholder="队伍描述（可选）"
                  value={teamForm.description}
                  onChange={(e) =>
                    setTeamForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                />
              </div>

              {/* 队伍列表 */}
              <div className="flex flex-col gap-2">
                {teams.length === 0 ? (
                  <p className="text-base-content/50 text-center py-4">
                    暂无队伍，请先创建至少一个队伍
                  </p>
                ) : (
                  (() => {
                    // 按创建时间排序，第一个队伍不能删除
                    const sortedTeams = [...teams].sort((a, b) => {
                      const aTime = a.create_at
                        ? new Date(a.create_at).getTime()
                        : 0;
                      const bTime = b.create_at
                        ? new Date(b.create_at).getTime()
                        : 0;
                      return aTime - bTime;
                    });
                    const firstTeamId = sortedTeams[0]?.id;

                    return teams.map((team) => {
                      const isFirstTeam = team.id === firstTeamId;
                      return (
                        <div
                          key={team.id}
                          className="flex items-center justify-between p-3 border border-base-300 rounded-lg"
                        >
                          <div className="flex-1">
                            {editingTeam === team.id ? (
                              <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    className="input input-sm input-bordered flex-1"
                                    defaultValue={team.name}
                                    onBlur={(e) => {
                                      if (e.target.value !== team.name) {
                                        handleUpdateTeam(team.id, {
                                          name: e.target.value,
                                        });
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.currentTarget.blur();
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <input
                                    type="number"
                                    className="input input-sm input-bordered w-24"
                                    defaultValue={team.max_participants ?? ""}
                                    placeholder="无上限"
                                    onBlur={(e) => {
                                      const value = e.target.value
                                        ? parseInt(e.target.value, 10)
                                        : null;
                                      if (value !== team.max_participants) {
                                        handleUpdateTeam(team.id, {
                                          max_participants: value,
                                        });
                                      }
                                    }}
                                    min="1"
                                  />
                                </div>
                                <textarea
                                  className="textarea textarea-sm textarea-bordered"
                                  defaultValue={team.description ?? ""}
                                  placeholder="队伍描述（可选）"
                                  onBlur={(e) => {
                                    const newDescription =
                                      e.target.value.trim() || undefined;
                                    if (
                                      newDescription !==
                                      (team.description || undefined)
                                    ) {
                                      handleUpdateTeam(team.id, {
                                        description: newDescription,
                                      });
                                    }
                                  }}
                                  rows={2}
                                />
                              </div>
                            ) : (
                              <div>
                                <div className="font-semibold">{team.name}</div>
                                {team.description && (
                                  <div className="text-sm text-base-content/60 mt-1">
                                    {team.description}
                                  </div>
                                )}
                                <div className="text-sm text-base-content/70 mt-1">
                                  {team.current_count} /{" "}
                                  {team.max_participants ?? "∞"} 人
                                  {team.is_full && (
                                    <span className="text-error ml-2">
                                      （已满）
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {editingTeam !== team.id && (
                              <>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setEditingTeam(team.id)}
                                >
                                  <PencilLineIcon className="size-4" />
                                </button>
                                {!isFirstTeam && (
                                  <button
                                    className="btn btn-ghost btn-sm text-error"
                                    onClick={() => handleDeleteTeam(team.id)}
                                  >
                                    <TrashIcon className="size-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 报名列表 */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">报名列表</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>队伍</th>
                  <th>状态</th>
                  <th>报名时间</th>
                </tr>
              </thead>
              <tbody>
                {registrations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center text-base-content/50"
                    >
                      暂无报名
                    </td>
                  </tr>
                ) : (
                  registrations.map((reg) => (
                    <tr key={reg.id}>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onUserClick(reg.user_id)}
                        >
                          {reg.user?.userInfo?.nickname ??
                            reg.user?.name ??
                            "未知用户"}
                        </button>
                      </td>
                      <td>
                        {reg.team ? (
                          reg.team.name
                        ) : (
                          <span className="text-base-content/50">未分配</span>
                        )}
                      </td>
                      <td>
                        {reg.is_watching ? (
                          <span className="badge badge-warning">观望</span>
                        ) : (
                          <span className="badge badge-success">已报名</span>
                        )}
                      </td>
                      <td>
                        {reg.create_at
                          ? new Date(reg.create_at).toLocaleString("zh-CN")
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// 用户详情弹窗
type UserDetailsModalProps = {
  userId: string;
  onClose: () => void;
};

function UserDetailsModal({ userId, onClose }: UserDetailsModalProps) {
  const [user, setUser] = useState<Awaited<
    ReturnType<typeof trpcClientDash.activeRegistrations.getUserDetails.query>
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data =
          await trpcClientDash.activeRegistrations.getUserDetails.query({
            user_id: userId,
          });
        setUser(data);
      } catch (error) {
        console.error("获取用户详情失败", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">用户详情</h3>
          <button className="btn btn-sm btn-circle" onClick={onClose}>
            <XIcon className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : user ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">
                <span className="label-text">昵称</span>
              </label>
              <div className="text-lg">
                {user.userInfo?.nickname ?? user.name ?? "未知"}
              </div>
            </div>
            <div>
              <label className="label">
                <span className="label-text">UID</span>
              </label>
              <div className="text-sm font-mono">
                {user.userInfo?.uid ?? "—"}
              </div>
            </div>
            <div>
              <label className="label">
                <span className="label-text">手机号</span>
              </label>
              <div>{user.userInfo?.phone ?? "—"}</div>
            </div>
            <div>
              <label className="label">
                <span className="label-text">邮箱</span>
              </label>
              <div>{user.email ?? "—"}</div>
            </div>
            <div>
              <label className="label">
                <span className="label-text">注册时间</span>
              </label>
              <div>
                {user.userInfo?.create_at
                  ? new Date(user.userInfo.create_at).toLocaleString("zh-CN")
                  : "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-base-content/50">
            用户不存在
          </div>
        )}

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
