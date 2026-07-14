import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr";
import {
  ClientOnly,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import clsx from "clsx";
import { produce } from "immer";
import { useCallback, useRef, useState } from "react";
import { z } from "zod/v4";
import MarkdownTextEditor from "@/client/components/diceshock/MarkdownEditor/MarkdownTextEditor";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  ArticleType,
  useManagedEventQuery,
  usePublishArticleToWechatMutation,
  useUpdateEventMutation,
} from "@/client/graphql/__generated__";

const eventEditSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(100),
  description: z.string().trim().max(500),
  coverImageUrl: z.string().trim().max(500),
  content: z.string().trim().max(10000),
});

export const Route = createFileRoute("/dash/events_/$id")({
  component: EventEditorPage,
});
function EventEditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const msg = useMsg();

  const [form, setForm] = useState({
    title: "",
    description: "",
    coverImageUrl: "",
    content: "",
  });
  const updateForm = useCallback(
    (recipe: (draft: typeof form) => void) => setForm(produce(recipe)),
    [],
  );

  const [submitting, setSubmitting] = useState(false);

  const { loading } = useManagedEventQuery({
    variables: { id },
    onCompleted: (res) => {
      const event = res.managedEvent;
      setForm({
        title: event.title,
        description: event.description ?? "",
        coverImageUrl: event.coverImageUrl ?? "",
        content: event.content ?? "",
      });
    },
    onError: (err) => {
      msg.error(err.message || "加载活动失败");
    },
  });

  const [updateEventMutation] = useUpdateEventMutation({
    refetchQueries: ["ManagedEvent"],
  });

  const [publishArticleMutation] = usePublishArticleToWechatMutation();
  const [publishing, setPublishing] = useState(false);
  const publishDialogRef = useRef<HTMLDialogElement>(null);

  const handlePublishToWechat = async (autoPublish: boolean) => {
    setPublishing(true);
    try {
      const { data } = await publishArticleMutation({
        variables: {
          input: { type: ArticleType.Event, id, autoPublish },
        },
      });
      const result = data?.publishArticleToWechat;
      if (result?.success) {
        msg.success(
          autoPublish
            ? "已发布到微信服务号"
            : "草稿已创建，请在微信公众平台确认发布",
        );
      } else {
        msg.error(`发布失败: ${result?.error ?? "未知错误"}`);
      }
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "发布失败");
    } finally {
      setPublishing(false);
      publishDialogRef.current?.close();
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const result = eventEditSchema.safeParse(form);
      if (!result.success) {
        msg.error(result.error.issues[0]?.message ?? "表单验证失败");
        return;
      }

      setSubmitting(true);
      try {
        const { title, description, coverImageUrl, content } = result.data;
        await updateEventMutation({
          variables: {
            input: {
              id,
              title,
              description: description || undefined,
              coverImageUrl: coverImageUrl || undefined,
              content: content || undefined,
            },
          },
        });
        msg.success("活动已保存");
        navigate({ to: "/dash/events", search: { q: "", page: 1 } });
      } catch (err) {
        msg.error(err instanceof Error ? err.message : "保存失败");
      } finally {
        setSubmitting(false);
      }
    },
    [id, form, msg, navigate, updateEventMutation],
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

        <div className="mx-auto w-full max-w-2xl px-4 pb-20">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">活动详情</h1>
            <button
              type="button"
              className={clsx("btn btn-sm btn-primary gap-1", publishing && "loading")}
              onClick={() => publishDialogRef.current?.showModal()}
              disabled={publishing}
            >
              <PaperPlaneTiltIcon className="size-4" weight="fill" />
              发布到微信
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">标题</span>
              <input
                type="text"
                placeholder="活动标题"
                className="input input-bordered w-full"
                value={form.title}
                onChange={(e) => updateForm((d) => { d.title = e.target.value; })}
                maxLength={200}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">描述（可选）</span>
              <textarea
                placeholder="活动描述，会显示在列表页卡片上"
                className="textarea textarea-bordered w-full"
                value={form.description}
                onChange={(e) => updateForm((d) => { d.description = e.target.value; })}
                rows={3}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">
                头图URL（可选）
              </span>
              <span className="text-xs text-base-content/50">
                推荐尺寸 1500 × 600，比例 2.5:1
              </span>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                className="input input-bordered w-full"
                value={form.coverImageUrl}
                onChange={(e) => updateForm((d) => { d.coverImageUrl = e.target.value; })}
              />
              {form.coverImageUrl && (
                <img
                  src={form.coverImageUrl}
                  alt="preview"
                  className="w-full max-h-48 object-cover rounded-lg mt-2"
                />
              )}
            </label>

            <div className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">正文</span>
              <MarkdownTextEditor
                content={form.content}
                onChange={(val) => updateForm((d) => { d.content = val; })}
                placeholder="活动详情..."
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  navigate({ to: "/dash/events", search: { q: "", page: 1 } })
                }
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

      <dialog ref={publishDialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">发布到微信服务号</h3>
          <p className="text-sm text-base-content/70 mb-2">
            将此活动渲染为图片文章并同步到微信服务号。
          </p>
          <p className="text-sm text-base-content/70">
            「创建草稿」仅创建草稿，需要在微信公众平台手动发布；「立即发布」将直接发布到服务号。
          </p>
          <div className="modal-action mt-6">
            <button
              type="button"
              className="btn"
              onClick={() => publishDialogRef.current?.close()}
              disabled={publishing}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void handlePublishToWechat(false)}
              disabled={publishing}
            >
              {publishing ? "处理中..." : "创建草稿"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handlePublishToWechat(true)}
              disabled={publishing}
            >
              {publishing ? "发布中..." : "立即发布"}
            </button>
          </div>
        </div>
      </dialog>
    </ClientOnly>
  );
}
