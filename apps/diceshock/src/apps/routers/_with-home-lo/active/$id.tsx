import { createFileRoute, Link } from "@tanstack/react-router";
import MDEditor from "@uiw/react-md-editor";
import { useCallback, useEffect, useState } from "react";
import "@uiw/react-md-editor/markdown-editor.css";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { themeA } from "@/client/components/ThemeSwap";
import trpcClientPublic from "@/shared/utils/trpc";

export const Route = createFileRoute("/_with-home-lo/active/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Awaited<
    ReturnType<typeof trpcClientPublic.active.getById.query>
  > | null>(null);

  const theme = useAtomValue(themeA);

  const fetchActive = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await trpcClientPublic.active.getById.query({ id });
      setActive(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  if (loading) {
    return (
      <main className="size-full p-4 flex items-center justify-center min-h-screen">
        <span className="loading loading-dots loading-md"></span>
      </main>
    );
  }

  if (!active) {
    return (
      <main className="size-full p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">活动不存在</h2>
          <Link to="/" className="btn btn-primary">
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  // 只显示已发布且未删除的活动
  if (!active.is_published || active.is_deleted) {
    return (
      <main className="size-full p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">活动不可用</h2>
          <Link to="/" className="btn btn-primary">
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen p-4 max-w-4xl mx-auto">
      {active.cover_image?.trim() && (
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
          <h1 className="text-4xl font-bold mb-4">{active.name}</h1>

          {active.description && (
            <p className="text-xl text-base-content/70 mb-4">
              {active.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {active.tags?.map((tagMapping) => (
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

          {active.publish_at && (
            <time className="text-sm text-base-content/50">
              {dayjs(active.publish_at).format("YYYY年MM月DD日")}
            </time>
          )}
        </header>

        <div data-color-mode={theme ?? "light"} className="mt-8">
          <MDEditor.Markdown
            source={active.content ?? ""}
            className="bg-transparent!"
          />
        </div>
      </article>
    </main>
  );
}
