import { createFileRoute, Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function RouteComponent() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showExpired, setShowExpired] = useState(false);
  const [actives, setActives] = useState<ActiveItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  // 处理 hover 高亮同一天的活动
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);

  const handleMouseEnter = useCallback((dateKey: string) => {
    setHighlightedDate(dateKey);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHighlightedDate(null);
  }, []);

  // 筛选活动：根据选中的标签筛选，默认过滤过期活动
  const filteredActives = useMemo(() => {
    let result = actives;

    // 默认过滤掉过期活动，除非 showExpired 为 true
    if (!showExpired) {
      result = result.filter((active) => !active.isExpired);
    }

    // 根据选中的标签筛选
    if (selectedTags.length > 0) {
      result = result.filter((active) =>
        active.tags?.some((t) => selectedTags.includes(t.tag_id)),
      );
    }

    return result;
  }, [actives, selectedTags, showExpired]);

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
  const weekGroups = useMemo(() => {
    const groups = new Map<string, Map<string, typeof flattenedActives>>();
    flattenedActives.forEach((active) => {
      if (!groups.has(active.weekKey)) {
        groups.set(active.weekKey, new Map());
      }
      const weekGroup = groups.get(active.weekKey)!;
      if (!weekGroup.has(active.dateKey)) {
        weekGroup.set(active.dateKey, []);
      }
      weekGroup.get(active.dateKey)!.push(active);
    });

    return Array.from(groups.entries())
      .map(([weekKey, dateMap]) => {
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
        };
      })
      .sort((a, b) => a.weekStart.valueOf() - b.weekStart.valueOf());
  }, [flattenedActives]);

  // 获取周标题
  const getWeekTitle = (weekStart: dayjs.Dayjs) => {
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

  if (loading) {
    return (
      <main className="w-full min-h-screen p-4 flex items-center justify-center">
        <span className="loading loading-dots loading-md"></span>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen p-4 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">活动列表</h1>

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

        {/* 清除筛选 */}
        {(selectedTags.length > 0 || showExpired) && (
          <button
            onClick={() => {
              setSelectedTags([]);
              setShowExpired(false);
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
              <div className="divider mt-12 mb-24">
                <div className="flex flex-col items-center gap-1">
                  <h2 className="text-2xl font-bold text-base-content">
                    {getWeekTitle(weekGroup.weekStart).main}
                  </h2>
                  {getWeekTitle(weekGroup.weekStart).sub && (
                    <div className="text-sm text-base-content/50">
                      {getWeekTitle(weekGroup.weekStart).sub}
                    </div>
                  )}
                </div>
              </div>

              {/* 网格布局的活动列表 - 按日期分组以支持线条连接 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative">
                {weekGroup.dates.map((dateGroup) =>
                  dateGroup.actives.map((active, index) => {
                    const pinnedTag = tags.find(
                      (tag) => tagTitle(tag.title).tx === "置顶",
                    );
                    const isPinned = pinnedTag
                      ? active.tags?.some((t) => t.tag_id === pinnedTag.id)
                      : false;
                    const isHighlighted = highlightedDate === active.dateKey;
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
                        onMouseEnter={() => handleMouseEnter(active.dateKey)}
                        onMouseLeave={handleMouseLeave}
                        className={`group card bg-base-100 shadow-md hover:shadow-lg transition-all relative overflow-visible ${
                          isHighlighted ? "bg-base-200/50 translate-x-1" : ""
                        }`}
                      >
                        {/* 日期标识 - 顶部水平线条，默认显示，只连接同一天的活动 */}
                        <div
                          className={`absolute top-0 h-1 transition-all z-30 ${
                            isHighlighted
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
                        {/* 周几标签 - 只在同一天的第一个活动显示 */}
                        {isFirstInDate && (
                          <div
                            className={`absolute left-0 -top-6 px-2 py-0.5 text-xs font-semibold bg-base-100 border rounded transition-all z-30 whitespace-nowrap shadow-sm ${
                              isHighlighted
                                ? "text-secondary border-secondary bg-secondary/20"
                                : "text-primary border-primary/30 group-hover:text-secondary group-hover:border-secondary"
                            }`}
                          >
                            {weekday}
                          </div>
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
                              {active.name}
                            </h2>
                          </div>
                          {active.description && (
                            <p className="text-sm text-base-content/70 line-clamp-2">
                              {active.description}
                            </p>
                          )}
                          {active.tags && active.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {active.tags.map((tagMapping) => {
                                const title = tagTitle(tagMapping.tag?.title);
                                return (
                                  <span
                                    key={tagMapping.tag_id}
                                    className="badge badge-sm gap-1"
                                  >
                                    <span>{title.emoji}</span>
                                    {title.tx}
                                  </span>
                                );
                              })}
                            </div>
                          )}
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
    </main>
  );
}
