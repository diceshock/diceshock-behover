import type { BoardGame } from "@lib/utils";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMsg } from "@/client/components/diceshock/Msg";
import useAuth from "@/client/hooks/useAuth";
import trpcClientPublic from "@/shared/utils/trpc";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

type ActiveList = Awaited<ReturnType<typeof trpcClientPublic.active.get.query>>;
type ActiveItem = ActiveList[number];

type TagList = Awaited<
  ReturnType<typeof trpcClientPublic.activeTags.get.query>
>;
type TagItem = TagList[number];

const tagTitle = (tag?: TagItem["title"] | null) => ({
  emoji: tag?.emoji ?? "🏷️",
  tx: tag?.tx ?? "未命名",
});

export const Route = createFileRoute("/_with-home-lo/actives")({
  component: RouteComponent,
});

type TimeFilter = "本周" | "下周" | "本月" | "本季度" | "年内" | "更远" | null;

function RouteComponent() {
  const { session } = useAuth();
  const msg = useMsg();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showExpired, setShowExpired] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(null);
  const [actives, setActives] = useState<ActiveItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  // 存储每个活动的报名统计信息
  const [registrationStats, setRegistrationStats] = useState<
    Map<string, { total: number; current: number; watching: number }>
  >(new Map());

  // 约局相关状态
  const gameDialogRef = useRef<HTMLDialogElement>(null);
  const [gameForm, setGameForm] = useState({
    event_date: "",
    max_participants: "",
    selectedBoardGames: [] as number[], // gstone_id 列表
  });
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
  const [creatingGame, setCreatingGame] = useState(false);

  const fetchActives = useCallback(async () => {
    try {
      setLoading(true);
      const allActives: ActiveItem[] = [];
      let page = 1;
      const pageSize = 100; // API 限制的最大值

      // 分页获取所有活动
      while (true) {
        const data = await trpcClientPublic.active.get.query({
          page,
          pageSize,
          params: {
            isDeleted: false,
            isPublished: true,
          },
        });

        allActives.push(...data);

        // 如果返回的数据少于 pageSize，说明已经获取完所有数据
        if (data.length < pageSize) {
          break;
        }

        page++;
      }

      setActives(allActives);
    } catch (error) {
      console.error("获取活动失败", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const data = await trpcClientPublic.activeTags.get.query();
      setTags(data);
    } catch (error) {
      console.error("获取标签失败", error);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    fetchActives();
  }, [fetchActives]);

  // 存储约局的报名者信息（用于显示发起者和所有报名者）
  const [gameParticipants, setGameParticipants] = useState<
    Map<string, { creator_id: string | null; participant_ids: string[] }>
  >(new Map());
  // 存储发起者信息（用于显示发起者昵称）
  const [creatorInfo, setCreatorInfo] = useState<
    Map<string, { nickname: string; uid: string } | null>
  >(new Map());

  // 获取所有开启报名的活动的报名统计
  useEffect(() => {
    const fetchRegistrationStats = async () => {
      const statsMap = new Map<
        string,
        { total: number; current: number; watching: number }
      >();
      const gameParticipantsMap = new Map<
        string,
        { creator_id: string | null; participant_ids: string[] }
      >();

      // 只获取开启报名的活动
      const activesWithRegistration = actives.filter(
        (active) => active.enable_registration,
      );

      // 批量获取报名数据
      const promises = activesWithRegistration.map(async (active) => {
        try {
          const [teams, registrations] = await Promise.all([
            trpcClientPublic.activeRegistrations.teams.get.query({
              active_id: active.id,
            }),
            trpcClientPublic.activeRegistrations.registrations.get.query({
              active_id: active.id,
            }),
          ]);

          // 计算总容量（所有队伍的最大人数之和，null 表示无上限）
          let totalCapacity = 0;
          let hasUnlimited = false;
          teams.forEach((team) => {
            if (team.max_participants === null) {
              hasUnlimited = true;
            } else {
              totalCapacity += team.max_participants;
            }
          });

          // 计算当前报名人数（不包括观望）
          const currentCount = registrations.filter(
            (reg) => !reg.is_watching,
          ).length;

          // 计算观望人数
          const watchingCount = registrations.filter(
            (reg) => reg.is_watching,
          ).length;

          statsMap.set(active.id, {
            total: hasUnlimited ? -1 : totalCapacity, // -1 表示无上限
            current: currentCount,
            watching: watchingCount,
          });

          // 如果是约局，存储发起者和报名者信息
          if ((active as any).is_game) {
            const participantIds = registrations.map((reg) => reg.user_id);
            gameParticipantsMap.set(active.id, {
              creator_id: (active as any).creator_id || null,
              participant_ids: participantIds,
            });
          }
        } catch (error) {
          console.error(`获取活动 ${active.id} 的报名统计失败:`, error);
        }
      });

      await Promise.all(promises);
      setRegistrationStats(statsMap);
      setGameParticipants(gameParticipantsMap);
    };

    if (actives.length > 0) {
      fetchRegistrationStats();
    }
  }, [actives]);

  // 获取发起者信息的 useEffect
  useEffect(() => {
    const fetchCreatorInfo = async () => {
      const creatorInfoMap = new Map<
        string,
        { nickname: string; uid: string } | null
      >();

      const gameActives = actives.filter((active) => (active as any).is_game);
      const promises = gameActives.map(async (active) => {
        const creatorId = (active as any).creator_id;
        if (!creatorId) return;

        try {
          const creator =
            await trpcClientPublic.activeRegistrations.getUserDetails.query({
              user_id: creatorId,
            });
          if (creator?.userInfo) {
            creatorInfoMap.set(active.id, {
              nickname: creator.userInfo.nickname,
              uid: creator.userInfo.uid,
            });
          }
        } catch (error) {
          console.error(`获取发起者信息失败:`, error);
        }
      });

      await Promise.all(promises);
      setCreatorInfo(creatorInfoMap);
    };

    if (actives.length > 0) {
      fetchCreatorInfo();
    }
  }, [actives]);

  // 处理 hover 高亮同一天的活动线条
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
  // 处理 hover 高亮当前悬浮的卡片
  const [hoveredActiveId, setHoveredActiveId] = useState<string | null>(null);

  const handleMouseEnter = useCallback((dateKey: string, activeId: string) => {
    setHighlightedDate(dateKey);
    setHoveredActiveId(activeId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHighlightedDate(null);
    setHoveredActiveId(null);
  }, []);

  // 筛选活动：根据选中的标签和时间筛选，默认过滤过期活动
  const filteredActives = useMemo(() => {
    let result = actives;

    // 过期活动筛选：如果开启，只显示过期活动；如果关闭，只显示未过期活动
    if (showExpired) {
      result = result.filter((active) => active.isExpired);
    } else {
      result = result.filter((active) => !active.isExpired);
    }

    // 根据选中的标签筛选
    if (selectedTags.length > 0) {
      result = result.filter((active) =>
        active.tags?.some((t) => selectedTags.includes(t.tag_id)),
      );
    }

    // 根据时间筛选（只对未过期活动生效）
    if (timeFilter && timeFilter !== null && !showExpired) {
      const now = dayjs();
      result = result.filter((active) => {
        if (!active.event_date) return false;
        const eventDate = dayjs(active.event_date);

        switch (timeFilter) {
          case "本周":
            return eventDate.isSame(now, "week");
          case "下周":
            return eventDate.isSame(now.add(1, "week"), "week");
          case "本月":
            return eventDate.isSame(now, "month");
          case "本季度": {
            const currentQuarter = Math.floor(now.month() / 3);
            const eventQuarter = Math.floor(eventDate.month() / 3);
            return (
              eventDate.isSame(now, "year") && currentQuarter === eventQuarter
            );
          }
          case "年内":
            return eventDate.isSame(now, "year");
          case "更远":
            return eventDate.isAfter(now, "year");
          default:
            return true;
        }
      });
    }

    return result;
  }, [actives, selectedTags, showExpired, timeFilter]);

  // 将所有活动展平，添加日期信息用于分组和标识
  const flattenedActives = useMemo(() => {
    return filteredActives
      .filter((active) => active.event_date)
      .map((active) => {
        const eventDate = dayjs(active.event_date!);
        return {
          ...active,
          eventDate,
          dateKey: eventDate.format("YYYY-MM-DD"),
          weekKey: `${eventDate.isoWeekYear()}-W${String(eventDate.isoWeek()).padStart(2, "0")}`,
        };
      })
      .sort((a, b) => a.eventDate.valueOf() - b.eventDate.valueOf());
  }, [filteredActives]);

  // 按周分组，并进一步按日期分组，用于显示周标题和连接线条
  // 过期活动单独分组为"过期活动"
  const weekGroups = useMemo(() => {
    // 分离过期和未过期活动
    const expiredActives = flattenedActives.filter(
      (active) => active.isExpired,
    );
    const nonExpiredActives = flattenedActives.filter(
      (active) => !active.isExpired,
    );

    const groups = new Map<string, Map<string, typeof flattenedActives>>();

    // 处理未过期活动，按周分组
    nonExpiredActives.forEach((active) => {
      if (!groups.has(active.weekKey)) {
        groups.set(active.weekKey, new Map());
      }
      const weekGroup = groups.get(active.weekKey)!;
      if (!weekGroup.has(active.dateKey)) {
        weekGroup.set(active.dateKey, []);
      }
      weekGroup.get(active.dateKey)!.push(active);
    });

    // 处理过期活动，单独分组
    if (expiredActives.length > 0) {
      const expiredGroup = new Map<string, typeof flattenedActives>();
      expiredActives.forEach((active) => {
        if (!expiredGroup.has(active.dateKey)) {
          expiredGroup.set(active.dateKey, []);
        }
        expiredGroup.get(active.dateKey)!.push(active);
      });
      groups.set("expired", expiredGroup);
    }

    return Array.from(groups.entries())
      .map(([weekKey, dateMap]) => {
        // 过期活动特殊处理
        if (weekKey === "expired") {
          const dates = Array.from(dateMap.entries())
            .map(([dateKey, actives]) => ({
              dateKey,
              date: actives[0]?.eventDate || dayjs(),
              actives,
            }))
            .sort((a, b) => b.date.valueOf() - a.date.valueOf()); // 过期活动按时间倒序
          return {
            weekKey: "expired",
            weekStart: dayjs(0), // 用于排序，过期活动排在最后
            dates,
            isExpired: true,
          };
        }

        // 未过期活动按周分组
        const weekStart =
          Array.from(dateMap.values())[0]?.[0]?.eventDate.startOf("isoWeek") ||
          dayjs();
        const dates = Array.from(dateMap.entries())
          .map(([dateKey, actives]) => ({
            dateKey,
            date: actives[0]?.eventDate || dayjs(),
            actives,
          }))
          .sort((a, b) => a.date.valueOf() - b.date.valueOf());
        return {
          weekKey,
          weekStart,
          dates,
          isExpired: false,
        };
      })
      .sort((a, b) => {
        // 过期活动排在最后
        if (a.isExpired && !b.isExpired) return 1;
        if (!a.isExpired && b.isExpired) return -1;
        return a.weekStart.valueOf() - b.weekStart.valueOf();
      });
  }, [flattenedActives]);

  // 获取周标题
  const getWeekTitle = (weekStart: dayjs.Dayjs, isExpired?: boolean) => {
    // 过期活动显示"过期活动"
    if (isExpired) {
      return { main: "过期活动", sub: null };
    }

    const now = dayjs();
    const weekEnd = weekStart.add(6, "day");
    const weekNumber = weekStart.isoWeek();

    if (weekStart.isSame(now, "week")) {
      return { main: "本周", sub: null };
    }
    if (weekStart.isSame(now.add(1, "week"), "week")) {
      return { main: "下周", sub: null };
    }
    // 更远的日期：显示第几周，小字显示日期范围
    return {
      main: `第 ${weekNumber} 周`,
      sub: `${weekStart.format("MM月DD日")} - ${weekEnd.format("MM月DD日")}`,
    };
  };

  // 获取日期标题
  const getDateTitle = (date: dayjs.Dayjs) => {
    const now = dayjs();
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

    // 判断是否是今天：比较年月日
    const isToday = date.isSame(now, "day");
    // 判断是否是明天：日期差为1天
    const isTomorrow = date.diff(now, "day") === 1;

    if (isToday) {
      return { main: `今天 (${date.format("MM月DD日")})`, sub: null };
    }
    if (isTomorrow) {
      return { main: `明天 (${date.format("MM月DD日")})`, sub: null };
    }
    if (date.isSame(now, "week")) {
      return {
        main: `${weekdays[date.day()]} (${date.format("MM月DD日")})`,
        sub: null,
      };
    }
    // 更远的日期：显示第几周，小字显示日期范围
    const weekStart = date.startOf("isoWeek");
    const weekEnd = date.endOf("isoWeek");
    const weekNumber = date.isoWeek();
    return {
      main: `第 ${weekNumber} 周`,
      sub: `${weekStart.format("MM月DD日")} - ${weekEnd.format("MM月DD日")}`,
    };
  };

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  }, []);

  // 搜索桌游（用于约局）
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

  // 创建约局
  const handleCreateGame = useCallback(async () => {
    if (!gameForm.event_date.trim()) {
      msg.warning("请选择约局时间");
      return;
    }

    try {
      setCreatingGame(true);
      await trpcClientPublic.active.createGame.mutate({
        event_date: gameForm.event_date,
        max_participants: gameForm.max_participants
          ? parseInt(gameForm.max_participants, 10)
          : null,
        board_game_ids:
          gameForm.selectedBoardGames.length > 0
            ? gameForm.selectedBoardGames
            : undefined,
      });
      msg.success("约局创建成功");
      gameDialogRef.current?.close();
      setGameForm({
        event_date: "",
        max_participants: "",
        selectedBoardGames: [],
      });
      setGameBoardGames([]);
      setGameSearchQuery("");
      setGameSearchResults([]);
      await fetchActives();
    } catch (error) {
      console.error("创建约局失败", error);
      msg.error(error instanceof Error ? error.message : "创建约局失败");
    } finally {
      setCreatingGame(false);
    }
  }, [gameForm, msg, fetchActives]);

  if (loading) {
    return (
      <main className="w-full min-h-screen p-4 flex items-center justify-center">
        <span className="loading loading-dots loading-md"></span>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen p-4 pb-20 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold">活动&约局</h1>
          {session && (
            <button
              onClick={() => gameDialogRef.current?.showModal()}
              className="btn btn-primary gap-2"
            >
              <PlusIcon className="size-5" />
              约局
            </button>
          )}
        </div>

        {/* 标签筛选 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* 过期活动标签 */}
          <button
            onClick={() => setShowExpired(!showExpired)}
            className={`badge badge-lg gap-2 cursor-pointer transition-all ${
              showExpired
                ? "badge-secondary"
                : "badge-outline hover:badge-secondary"
            }`}
          >
            <span>⏰</span>
            过期活动
          </button>

          {/* 普通标签 */}
          {tags.map((tag) => {
            const title = tagTitle(tag.title);
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`badge badge-lg gap-2 cursor-pointer transition-all ${
                  isSelected
                    ? "badge-primary"
                    : "badge-outline hover:badge-primary"
                }`}
              >
                <span>{title.emoji}</span>
                {title.tx}
              </button>
            );
          })}
        </div>

        {/* 时间筛选 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(["本周", "下周", "本月", "本季度", "年内", "更远"] as const).map(
            (filter) => (
              <button
                key={filter}
                onClick={() =>
                  setTimeFilter(timeFilter === filter ? null : filter)
                }
                className={`badge badge-lg gap-2 cursor-pointer transition-all ${
                  timeFilter === filter
                    ? "badge-accent"
                    : "badge-outline hover:badge-accent"
                }`}
              >
                {filter}
              </button>
            ),
          )}
        </div>

        {/* 清除筛选 */}
        {(selectedTags.length > 0 || showExpired || timeFilter) && (
          <button
            onClick={() => {
              setSelectedTags([]);
              setShowExpired(false);
              setTimeFilter(null);
            }}
            className="btn btn-sm btn-ghost mb-4"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* 活动列表 - 使用网格布局，允许跨天显示 */}
      {weekGroups.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-base-content/60">暂无活动</p>
        </div>
      ) : (
        <div className="space-y-8">
          {weekGroups.map((weekGroup) => (
            <div key={weekGroup.weekKey} className="space-y-4">
              {/* 周标题 */}
              <div className="divider mt-12 mb-24 relative">
                {/* 年份标签 - 在分割线最左边 */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-base-content/40 whitespace-nowrap">
                  {weekGroup.isExpired
                    ? weekGroup.dates[0]?.date.format("YYYY年")
                    : weekGroup.weekStart.format("YYYY年")}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <h2 className="text-2xl font-bold text-base-content">
                    {
                      getWeekTitle(weekGroup.weekStart, weekGroup.isExpired)
                        .main
                    }
                  </h2>
                  {getWeekTitle(weekGroup.weekStart, weekGroup.isExpired)
                    .sub && (
                    <div className="text-sm text-base-content/50">
                      {
                        getWeekTitle(weekGroup.weekStart, weekGroup.isExpired)
                          .sub
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* 网格布局的活动列表 - 按日期分组以支持线条连接 */}
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-12 relative">
                {weekGroup.dates.map((dateGroup) =>
                  dateGroup.actives.map((active, index) => {
                    const pinnedTag = tags.find(
                      (tag) => tagTitle(tag.title).tx === "置顶",
                    );
                    const isPinned = pinnedTag
                      ? active.tags?.some((t) => t.tag_id === pinnedTag.id)
                      : false;
                    const isLineHighlighted =
                      highlightedDate === active.dateKey;
                    const isCardHighlighted = hoveredActiveId === active.id;
                    const isFirstInDate = index === 0;
                    const weekdays = [
                      "周日",
                      "周一",
                      "周二",
                      "周三",
                      "周四",
                      "周五",
                      "周六",
                    ];
                    const weekday = weekdays[active.eventDate.day()];

                    // 检查同一天的活动组内，是否是第一个或最后一个
                    // 如果是第一个，左边不延伸；如果是最后一个，右边不延伸
                    // 中间的活动都延伸，以便连接
                    const hasLeftSameDate = index > 0; // 同一天组内不是第一个
                    const hasRightSameDate =
                      index < dateGroup.actives.length - 1; // 同一天组内不是最后一个

                    return (
                      <Link
                        key={active.id}
                        to="/active/$id"
                        params={{ id: active.id }}
                        data-date-key={active.dateKey}
                        onMouseEnter={() =>
                          handleMouseEnter(active.dateKey, active.id)
                        }
                        onMouseLeave={handleMouseLeave}
                        className={`group card bg-base-100 shadow-md hover:shadow-lg transition-all relative overflow-visible w-full ${
                          isCardHighlighted ? "bg-base-200/50" : ""
                        }`}
                      >
                        {/* 日期标识 - 顶部水平线条（lg+），左侧竖线（md），默认显示，只连接同一天的活动 */}
                        {/* 大屏幕：顶部水平线条 */}
                        <div
                          className={`hidden lg:block absolute top-0 h-1 transition-colors z-30 ${
                            isLineHighlighted
                              ? "bg-secondary"
                              : "bg-primary group-hover:bg-secondary"
                          }`}
                          style={{
                            borderRadius: "0.5rem 0.5rem 0 0",
                            // 只有左边有同一天的活动时才向左延伸
                            left: hasLeftSameDate ? "-1rem" : "0",
                            // 只有右边有同一天的活动时才向右延伸
                            right: hasRightSameDate ? "-1rem" : "0",
                          }}
                        />
                        {/* 中等屏幕：左侧竖线 */}
                        <div
                          className={`lg:hidden absolute left-0 top-0 bottom-0 w-1 transition-colors z-30 ${
                            isLineHighlighted
                              ? "bg-secondary"
                              : "bg-primary group-hover:bg-secondary"
                          }`}
                          style={{
                            borderRadius: "0.25rem 0 0 0.25rem",
                            // 只有上边有同一天的活动时才向上延伸
                            top: hasLeftSameDate ? "-3rem" : "0",
                            // 只有下边有同一天的活动时才向下延伸
                            bottom: hasRightSameDate ? "-3rem" : "0",
                          }}
                        />
                        {/* 周几标签 - 只在同一天的第一个活动显示 */}
                        {isFirstInDate && (
                          <>
                            {/* 大屏幕：顶部标签 */}
                            <div
                              className={`hidden lg:block absolute left-0 -top-6 px-2 py-0.5 text-xs font-semibold bg-base-100 border rounded transition-all z-40 whitespace-nowrap shadow-sm ${
                                isLineHighlighted
                                  ? "text-secondary border-secondary bg-base-100"
                                  : "text-primary border-primary/30 group-hover:text-secondary group-hover:border-secondary group-hover:bg-base-100"
                              }`}
                            >
                              {weekday}
                            </div>
                            {/* 中等屏幕：左侧旋转90度标签 */}
                            <div
                              className={`lg:hidden absolute -left-8 top-1/2 px-2 py-0.5 text-xs font-semibold bg-base-100 border rounded transition-all z-40 whitespace-nowrap shadow-sm ${
                                isLineHighlighted
                                  ? "text-secondary border-secondary bg-base-100"
                                  : "text-primary border-primary/30 group-hover:text-secondary group-hover:border-secondary group-hover:bg-base-100"
                              }`}
                              style={{
                                transform:
                                  "translateY(-50%) translateX(0.5rem) rotate(-90deg)",
                                transformOrigin: "center",
                              }}
                            >
                              {weekday}
                            </div>
                          </>
                        )}

                        {active.cover_image && (
                          <figure className="h-48 overflow-hidden rounded-t-lg">
                            <img
                              src={active.cover_image}
                              alt={active.name || "活动头图"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          </figure>
                        )}
                        <div className="card-body">
                          <div className="flex items-start justify-between gap-2">
                            <h2 className="card-title text-lg">
                              {isPinned && (
                                <span className="text-primary" title="置顶">
                                  📌
                                </span>
                              )}
                              {(active as any).is_game ? (
                                <span className="badge badge-sm badge-accent mr-2">
                                  约局
                                </span>
                              ) : (
                                active.name
                              )}
                            </h2>
                          </div>
                          {/* 约局显示发起者和报名者 */}
                          {(active as any).is_game && (
                            <div className="text-sm text-base-content/70 mb-2">
                              <div className="mb-1">
                                <span className="font-semibold">发起者：</span>
                                <span className="font-mono text-xs">
                                  {gameParticipants.get(active.id)
                                    ?.creator_id ||
                                    (active as any).creator_id ||
                                    "未知"}
                                </span>
                              </div>
                              {gameParticipants.get(active.id)?.participant_ids
                                .length ? (
                                <div>
                                  <span className="font-semibold">
                                    报名者：
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {gameParticipants
                                      .get(active.id)
                                      ?.participant_ids.map((userId) => (
                                        <span
                                          key={userId}
                                          className="badge badge-xs font-mono"
                                        >
                                          {userId}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-base-content/50">
                                  暂无报名者
                                </div>
                              )}
                            </div>
                          )}
                          {active.description && !(active as any).is_game && (
                            <p className="text-sm text-base-content/70 line-clamp-2">
                              {active.description}
                            </p>
                          )}
                          {/* 标签显示：活动和约局标签在最前面，报名标签也在同一行 */}
                          <div className="flex flex-wrap items-center gap-1 mt-2">
                            {/* 活动标签（闪电图标）- 仅对非约局活动显示 */}
                            {!(active as any).is_game && (
                              <span className="badge badge-sm gap-1 badge-primary inline-flex items-center whitespace-nowrap">
                                <span>⚡</span>
                                活动
                              </span>
                            )}
                            {/* 约局发起者标签（user图标）- 仅对约局显示 */}
                            {(active as any).is_game && (
                              <span className="badge badge-sm gap-1 badge-accent inline-flex items-center whitespace-nowrap">
                                <span>👤</span>
                                发起者:{" "}
                                {creatorInfo.get(active.id)?.nickname ||
                                  gameParticipants.get(active.id)?.creator_id ||
                                  (active as any).creator_id ||
                                  "未知"}
                              </span>
                            )}
                            {/* 其他标签 */}
                            {active.tags &&
                              active.tags.length > 0 &&
                              active.tags.map((tagMapping) => {
                                const title = tagTitle(tagMapping.tag?.title);
                                return (
                                  <span
                                    key={tagMapping.tag_id}
                                    className="badge badge-sm gap-1 inline-flex items-center whitespace-nowrap"
                                  >
                                    <span>{title.emoji}</span>
                                    {title.tx}
                                  </span>
                                );
                              })}
                            {/* 报名和观望标签 */}
                            {active.enable_registration && (
                              <span className="badge badge-sm badge-info gap-1 items-center inline-flex whitespace-nowrap">
                                <span>👥</span>
                                {(() => {
                                  const stats = registrationStats.get(
                                    active.id,
                                  );
                                  // 约局显示人数上限
                                  if ((active as any).is_game) {
                                    const maxParticipants = (active as any)
                                      .max_participants;
                                    const current = stats?.current || 0;
                                    if (maxParticipants) {
                                      return `${current}/${maxParticipants}`;
                                    }
                                    return `${current}+`;
                                  }
                                  if (stats) {
                                    if (stats.total === -1) {
                                      return `${stats.current}+`;
                                    }
                                    return `${stats.current}/${stats.total}`;
                                  }
                                  return "报名中";
                                })()}
                              </span>
                            )}
                            {active.allow_watching && (
                              <span className="badge badge-sm badge-warning gap-1 items-center inline-flex whitespace-nowrap">
                                <span>👀</span>
                                观望
                                {(() => {
                                  const stats = registrationStats.get(
                                    active.id,
                                  );
                                  if (stats && stats.watching > 0) {
                                    return ` (${stats.watching})`;
                                  }
                                  return "";
                                })()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-4 gap-4">
                            <div className="text-sm font-medium text-primary">
                              {active.eventDate.format("HH:mm")}
                            </div>
                            <div className="text-right">
                              {(() => {
                                const dateTitle = getDateTitle(
                                  active.eventDate,
                                );
                                return (
                                  <>
                                    <div className="text-xs text-base-content/70">
                                      {dateTitle.main}
                                    </div>
                                    {dateTitle.sub && (
                                      <div className="text-xs text-base-content/40 mt-0.5">
                                        {dateTitle.sub}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  }),
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 约局创建弹窗 */}
      <dialog ref={gameDialogRef} className="modal">
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-lg mb-4">创建约局</h3>

          <div className="flex flex-col gap-4">
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
                <span className="label-text">人数上限（留空表示无上限）</span>
              </label>
              <input
                type="number"
                min="1"
                className="input input-bordered w-full"
                placeholder="例如：4"
                value={gameForm.max_participants}
                onChange={(e) =>
                  setGameForm((prev) => ({
                    ...prev,
                    max_participants: e.target.value,
                  }))
                }
              />
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 max-h-48 overflow-y-auto">
                  {gameSearchResults.map((game) => {
                    const gameContent = game.content;
                    if (!gameContent || !game.gstone_id) return null;

                    const isSelected = gameForm.selectedBoardGames.includes(
                      game.gstone_id,
                    );

                    return (
                      <div
                        key={game.id}
                        className={`card bg-base-200 shadow-sm overflow-hidden cursor-pointer ${
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
                              if (prev.some((g) => g.gstone_id === gstoneId)) {
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
                              alt={gameContent.sch_name || gameContent.eng_name}
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

          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost">取消</button>
            </form>
            <button
              onClick={handleCreateGame}
              disabled={creatingGame}
              className="btn btn-primary"
            >
              {creatingGame && (
                <span className="loading loading-spinner loading-sm" />
              )}
              创建约局
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>关闭</button>
        </form>
      </dialog>
    </main>
  );
}
