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
      msg.error(
        err instanceof Error
          ? err.message
          : "\u52A0\u8F7D\u6D3B\u52A8\u5931\u8D25",
      );
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
        msg.error("\u8BF7\u8F93\u5165\u6807\u9898");
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
        msg.success("\u6D3B\u52A8\u5DF2\u4FDD\u5B58");
        navigate({ to: "/dash/events" });
      } catch (err) {
        msg.error(
          err instanceof Error ? err.message : "\u4FDD\u5B58\u5931\u8D25",
        );
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
          <DashBackButton />
        </div>

        <div className="mx-auto w-full max-w-2xl px-4 pb-20">
          <h1 className="text-2xl font-bold mb-8">
            {"\u7F16\u8F91\u6D3B\u52A8"}
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">
                {"\u6807\u9898"}
              </span>
              <input
                type="text"
                placeholder="\u6D3B\u52A8\u6807\u9898"
                className="input input-bordered w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">
                {"\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09"}
              </span>
              <textarea
                placeholder="\u6D3B\u52A8\u63CF\u8FF0\uFF0C\u4F1A\u663E\u793A\u5728\u5217\u8868\u9875\u5361\u7247\u4E0A"
                className="textarea textarea-bordered w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">
                {"\u5934\u56FEURL\uFF08\u53EF\u9009\uFF09"}
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
              <span className="label text-sm font-semibold">
                {"\u6B63\u6587"}
              </span>
              <TiptapEditor
                content={content}
                onChange={setContent}
                placeholder="\u6D3B\u52A8\u8BE6\u60C5..."
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate({ to: "/dash/events" })}
                disabled={submitting}
              >
                {"\u53D6\u6D88"}
              </button>
              <button
                type="submit"
                className={clsx("btn btn-primary", submitting && "loading")}
                disabled={submitting}
              >
                {submitting ? "\u4FDD\u5B58\u4E2D..." : "\u4FDD\u5B58"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </ClientOnly>
  );
}
