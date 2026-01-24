import { Link } from "@tanstack/react-router";
import MDEditor from "@uiw/react-md-editor";
import { useAtomValue } from "jotai";
import dayjs from "dayjs";
import { themeA } from "@/client/components/ThemeSwap";
import ActiveRegistration from "@/client/components/diceshock/ActiveRegistration";
import trpcClientPublic from "@/shared/utils/trpc";
import { trpcClientDash } from "@/shared/utils/trpc";

type Active =
  | Awaited<ReturnType<typeof trpcClientPublic.active.getById.query>>
  | Awaited<ReturnType<typeof trpcClientDash.active.getById.query>>;

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

  return (
    <main className="w-full min-h-screen p-4 max-w-4xl mx-auto">
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

          {active?.publish_at && (
            <time className="text-sm text-base-content/50">
              {dayjs(active.publish_at).format("YYYY年MM月DD日")}
            </time>
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
    </main>
  );
}
