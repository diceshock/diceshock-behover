import { createFileRoute, Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
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

  // 筛选活动：根据选中的标签筛选
  const filteredActives = useMemo(() => {
    if (selectedTags.length === 0) return actives;
    return actives.filter((active) =>
      active.tags?.some((t) => selectedTags.includes(t.tag_id)),
    );
  }, [actives, selectedTags]);

  // 按周和日期分组活动
  const groupedActives = useMemo(() => {
    const groups: Map<
      string,
      Map<string, { date: dayjs.Dayjs; actives: ActiveItem[] }>
    > = new Map();

    // 只处理有 event_date 的活动，并按 event_date 排序
    const activesWithDate = filteredActives
      .filter((active) => active.event_date)
      .sort((a, b) => {
        const dateA = dayjs(a.event_date!);
        const dateB = dayjs(b.event_date!);
        return dateA.valueOf() - dateB.valueOf();
      });

    activesWithDate.forEach((active) => {
      const eventDate = dayjs(active.event_date!);
      const weekKey = `${eventDate.isoWeekYear()}-W${String(eventDate.isoWeek()).padStart(2, "0")}`;
      const dateKey = eventDate.format("YYYY-MM-DD");

      if (!groups.has(weekKey)) {
        groups.set(weekKey, new Map());
      }

      const weekGroup = groups.get(weekKey)!;
      if (!weekGroup.has(dateKey)) {
        weekGroup.set(dateKey, { date: eventDate, actives: [] });
      }

      weekGroup.get(dateKey)!.actives.push(active);
    });

    // 转换为数组并排序
    return Array.from(groups.entries())
      .map(([weekKey, dateMap]) => ({
        weekKey,
        weekStart: Array.from(dateMap.values())[0]?.date.startOf("isoWeek") || dayjs(),
        dates: Array.from(dateMap.values()).sort((a, b) =>
          a.date.valueOf() - b.date.valueOf(),
        ),
      }))
      .sort((a, b) => a.weekStart.valueOf() - b.weekStart.valueOf());
  }, [filteredActives]);

  // 获取周标题
  const getWeekTitle = (weekStart: dayjs.Dayjs) => {
    const now = dayjs();
    const weekEnd = weekStart.add(6, "day");

    if (weekStart.isSame(now, "week")) {
      return "本周";
    }
    if (weekStart.isSame(now.add(1, "week"), "week")) {
      return "下周";
    }
    if (weekStart.isBefore(now, "week")) {
      return `${weekStart.format("MM月DD日")} - ${weekEnd.format("MM月DD日")}`;
    }
    return `${weekStart.format("MM月DD日")} - ${weekEnd.format("MM月DD日")}`;
  };

  // 获取日期标题
  const getDateTitle = (date: dayjs.Dayjs) => {
    const now = dayjs();
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

    if (date.isToday()) {
      return `今天 (${date.format("MM月DD日")})`;
    }
    if (date.isTomorrow()) {
      return `明天 (${date.format("MM月DD日")})`;
    }
    if (date.isSame(now, "week")) {
      return `${weekdays[date.day()]} (${date.format("MM月DD日")})`;
    }
    return `${weekdays[date.day()]} ${date.format("MM月DD日")}`;
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
          {tags.map((tag) => {
            const title = tagTitle(tag.title);
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`badge badge-lg gap-2 cursor-pointer transition-all ${isSelected
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
        {selectedTags.length > 0 && (
          <button
            onClick={() => setSelectedTags([])}
            className="btn btn-sm btn-ghost mb-4"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* 活动列表 - 按周和日期分组 */}
      {groupedActives.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-base-content/60">暂无活动</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedActives.map((weekGroup) => (
            <div key={weekGroup.weekKey} className="space-y-6">
              {/* 周标题 */}
              <div className="divider">
                <h2 className="text-2xl font-bold text-base-content">
                  {getWeekTitle(weekGroup.weekStart)}
                </h2>
              </div>

              {/* 每天的活动 */}
              {weekGroup.dates.map((dateGroup) => (
                <div key={dateGroup.date.format("YYYY-MM-DD")} className="space-y-4">
                  {/* 日期标题 */}
                  <h3 className="text-xl font-semibold text-base-content/80">
                    {getDateTitle(dateGroup.date)}
                  </h3>

                  {/* 该日期的活动列表 - 按时间排序 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dateGroup.actives
                      .sort((a, b) => {
                        const timeA = dayjs(a.event_date!).format("HH:mm");
                        const timeB = dayjs(b.event_date!).format("HH:mm");
                        return timeA.localeCompare(timeB);
                      })
                      .map((active) => {
                        const pinnedTag = tags.find(
                          (tag) => tagTitle(tag.title).tx === "置顶",
                        );
                        const isPinned = pinnedTag
                          ? active.tags?.some((t) => t.tag_id === pinnedTag.id)
                          : false;

                        return (
                          <Link
                            key={active.id}
                            to="/active/$id"
                            params={{ id: active.id }}
                            className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow"
                          >
                            {active.cover_image && (
                              <figure className="h-48 overflow-hidden">
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
                              {active.event_date && (
                                <div className="text-sm font-medium text-primary mt-2">
                                  {dayjs(active.event_date).format("HH:mm")}
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
