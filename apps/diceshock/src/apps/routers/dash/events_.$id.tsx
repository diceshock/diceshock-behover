import {
  ClientOnly,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import TiptapEditor from "@/client/components/diceshock/TiptapEditor";
import { trpcClientDash } from "@/shared/utils/trpc";

export const Route = createFileRoute("/dash/events_/$id")({
  component: EventEditorPage,
});

function EventEditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const msg = useMsg();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const event = await trpcClientDash.eventsManagement.getById.query({ id });
      setTitle(event.title);
      setDescription(event.description ?? "");
      setCoverImageUrl(event.cover_image_url ?? "");
      setContent(event.content ?? "");
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载活动失败");
    } finally {
      setLoading(false);
    }
  }, [id, msg]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        msg.error("请输入标题");
        return;
      }

      setSubmitting(true);
      try {
        await trpcClientDash.eventsManagement.update.mutate({
          id,
          title: title.trim(),
          description: description.trim() || undefined,
          cover_image_url: coverImageUrl.trim() || undefined,
          content: content || undefined,
        });
        msg.success("活动已保存");
        navigate({ to: "/dash/events" });
      } catch (err) {
        msg.error(err instanceof Error ? err.message : "保存失败");
      } finally {
        setSubmitting(false);
      }
    },
    [id, title, description, coverImageUrl, content, msg, navigate],
  );

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  return (
    <ClientOnly>
      <main className="size-full overflow-y-auto">
        <div className="px-4 pt-4">
          <DashBackButton to="/dash/events" label="返回活动列表" />
        </div>

        <div className="mx-auto w-full max-w-2xl px-4 pb-20">
          <h1 className="text-2xl font-bold mb-8">活动详情</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">标题</span>
              <input
                type="text"
                placeholder="活动标题"
                className="input input-bordered w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">描述（可选）</span>
              <textarea
                placeholder="活动描述，会显示在列表页卡片上"
                className="textarea textarea-bordered w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">
                头图URL（可选）
              </span>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                className="input input-bordered w-full"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
              />
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt="preview"
                  className="w-full max-h-48 object-cover rounded-lg mt-2"
                />
              )}
            </label>

            <div className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">正文</span>
              <TiptapEditor
                content={content}
                onChange={setContent}
                placeholder="活动详情..."
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate({ to: "/dash/events" })}
                disabled={submitting}
              >
                取消
              </button>
              <button
                type="submit"
                className={clsx("btn btn-primary", submitting && "loading")}
                disabled={submitting}
              >
                {submitting ? "保存中..." : "保存"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </ClientOnly>
  );
}
