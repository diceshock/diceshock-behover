import { createFileRoute, Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import trpcClientPublic from "@/shared/utils/trpc";

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

  // 筛选和排序：根据选中的标签筛选，并将"置顶"标签的活动放到前面
  const filteredAndSortedActives = useMemo(() => {
    // 先筛选：如果选中了标签，只显示包含任一选中标签的活动
    let filtered = actives;
    if (selectedTags.length > 0) {
      filtered = actives.filter((active) =>
        active.tags?.some((t) => selectedTags.includes(t.tag_id)),
      );
    }

    // 再排序：将"置顶"标签的活动放到前面
    const pinnedTag = tags.find((tag) => tagTitle(tag.title).tx === "置顶");
    // 获取时间戳的辅助函数
    const getTimestamp = (date: Date | string | null | undefined): number => {
      if (!date) return 0;
      if (date instanceof Date) return date.getTime();
      return dayjs(date).valueOf();
    };

    if (!pinnedTag) {
      // 如果没有"置顶"标签，按发布时间排序
      return [...filtered].sort(
        (a, b) => getTimestamp(b.publish_at) - getTimestamp(a.publish_at),
      );
    }

    return [...filtered].sort((a, b) => {
      const aHasPinned = a.tags?.some((t) => t.tag_id === pinnedTag.id);
      const bHasPinned = b.tags?.some((t) => t.tag_id === pinnedTag.id);

      if (aHasPinned && !bHasPinned) return -1;
      if (!aHasPinned && bHasPinned) return 1;
      // 如果都有或都没有，按发布时间排序
      return getTimestamp(b.publish_at) - getTimestamp(a.publish_at);
    });
  }, [actives, tags, selectedTags]);

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
        {selectedTags.length > 0 && (
          <button
            onClick={() => setSelectedTags([])}
            className="btn btn-sm btn-ghost mb-4"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* 活动列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedActives.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-lg text-base-content/60">暂无活动</p>
          </div>
        ) : (
          filteredAndSortedActives.map((active) => {
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
                        (e.target as HTMLImageElement).style.display = "none";
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
                  {active.publish_at && (
                    <div className="text-xs text-base-content/50 mt-2">
                      {dayjs(active.publish_at).format("YYYY-MM-DD")}
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
