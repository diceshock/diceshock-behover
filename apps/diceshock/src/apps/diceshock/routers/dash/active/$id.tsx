import { ArrowBendUpRightIcon, ArrowLeftIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { trpcClientDash } from "@/shared/utils/trpc";
import { useMsg } from "@/client/components/diceshock/Msg";

type TagList = Awaited<
  ReturnType<typeof trpcClientDash.activeTags.get.query>
>;
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
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [isDeleted, setIsDeleted] = useState<boolean>(false);
  const [active, setActive] = useState<Awaited<ReturnType<typeof trpcClientDash.active.getById.query>> | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagDraft, setTagDraft] = useState({ emoji: "", tx: "" });

  const fetchTags = useCallback(async () => {
    try {
      const data = await trpcClientDash.activeTags.get.query();
      setTags(data);
    } catch (error) {
      console.error("获取标签失败", error);
    }
  }, []);

  const fetchActive = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await trpcClientDash.active.getById.query({ id });
      setActive(data);
      if (data) {
        setContent(data.content || "");
        setName(data.name || "");
        setDescription(data.description || "");
        setCoverImage(data.cover_image || "");
        setSelectedTags(data.tags?.map((t) => t.tag_id) || []);
        setIsPublished(Boolean(data.is_published));
        setIsDeleted(Boolean(data.is_deleted));
      }
    } catch (error) {
      msg.error("获取活动失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id, msg]);

  useEffect(() => {
    fetchTags();
    fetchActive();
  }, [fetchTags, fetchActive]);

  const availableTags = useMemo(
    () => tags.sort((a, b) => {
      const aSelected = selectedTags.includes(a.id);
      const bSelected = selectedTags.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return (a.title?.tx ?? "").localeCompare(b.title?.tx ?? "");
    }),
    [tags, selectedTags]
  );

  const handleCreateTag = useCallback(async () => {
    if (!active || !tagDraft.tx.trim()) {
      if (!tagDraft.tx.trim()) {
        msg.warning("请输入标签名称");
      }
      return;
    }
    try {
      const result = await trpcClientDash.activeTags.insert.mutate([
        {
          activeId: active.id,
          title: {
            emoji: tagDraft.emoji.trim() || "🏷️",
            tx: tagDraft.tx.trim(),
          },
        },
      ]);

      const created = result.find(
        (tag): tag is TagItem => tag && "id" in tag && "title" in tag
      );
      if (!created) {
        msg.error("标签创建失败");
        return;
      }

      setTags((prev) => [...prev, created]);
      setSelectedTags((prev) => [...prev, created.id]);
      setTagDraft({ emoji: "", tx: "" });
      msg.success("标签创建成功");
    } catch (error) {
      msg.error("创建标签失败");
      console.error(error);
    }
  }, [active, tagDraft, msg]);

  const handleSave = async () => {
    if (!active) return;

    try {
      setSaving(true);
      await trpcClientDash.active.mutation.mutate({
        id: active.id,
        name,
        description,
        content,
        cover_image: coverImage.trim() ? coverImage.trim() : null,
        tags: selectedTags,
        is_published: isPublished,
        is_deleted: isDeleted,
      });
      msg.success("保存成功");
      await fetchActive();
    } catch (error) {
      msg.error("保存失败");
      console.error(error);
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
          <h2 className="text-2xl font-bold mb-4">活动不存在</h2>
          <Link to="/dash/acitve" className="btn btn-primary">
            返回列表
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="size-full flex flex-col">
      <div className="navbar bg-base-100 shadow-sm">
        <div className="flex-1">
          <Link to="/dash/acitve" className="btn btn-ghost btn-sm">
            <ArrowLeftIcon className="size-4" />
            返回
          </Link>
        </div>
        <div className="flex-none flex items-center gap-2">
          <Link
            to="/active/$id"
            params={{ id: active.id }}
            target="_blank"
            className="btn btn-ghost btn-sm"
          >
            预览
            <ArrowBendUpRightIcon className="size-4" />
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary btn-sm"
          >
            {saving && <span className="loading loading-spinner loading-sm" />}
            保存
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
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
                          (e.target as HTMLImageElement).style.display = "none";
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
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const title = tagTitle(tag.title);
                    const checked = selectedTags.includes(tag.id);
                    return (
                      <label
                        key={tag.id}
                        className="badge badge-lg gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={checked}
                          onChange={() =>
                            setSelectedTags((prev) =>
                              checked
                                ? prev.filter((id) => id !== tag.id)
                                : [...prev, tag.id]
                            )
                          }
                        />
                        <span>{title.emoji}</span>
                        {title.tx}
                      </label>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <EmojiPicker
                    value={tagDraft.emoji}
                    onChange={(emoji) =>
                      setTagDraft((prev) => ({ ...prev, emoji }))
                    }
                  />
                  <input
                    className="input input-bordered input-sm flex-1 min-w-40"
                    placeholder="标签名称"
                    value={tagDraft.tx}
                    onChange={(evt) =>
                      setTagDraft((prev) => ({ ...prev, tx: evt.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleCreateTag}
                  >
                    新建标签
                    <PlusIcon className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 状态 */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title">状态</h2>
              <div className="flex items-center gap-4">
                <label className={`label gap-2 ${isDeleted ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                  <span className="label-text">发布状态</span>
                  <input
                    type="checkbox"
                    className="toggle"
                    checked={isPublished}
                    disabled={isDeleted}
                    onChange={(evt) => {
                      setIsPublished(evt.target.checked);
                    }}
                  />
                </label>
                <label className="label cursor-pointer gap-2">
                  <span className="label-text">垃圾桶</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-error"
                    checked={isDeleted}
                    onChange={(evt) => setIsDeleted(evt.target.checked)}
                  />
                </label>
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
        </div>
      </div>
    </main>
  );
}

type EmojiPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const selectRef = useRef<HTMLSelectElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commonEmojis = [
    "🏷️", "📝", "📌", "⭐", "🔥", "💡", "🎯", "✅", "❌", "⚠️",
    "📅", "📊", "📈", "📉", "🎉", "🎊", "🎁", "🎈", "🎀", "🎪",
    "🏠", "🏢", "🏫", "🏥", "🏪", "🏨", "🏰", "⛪", "🕌", "🕍",
    "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐",
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
    "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
    "🥳", "🤗", "🤔", "🤨", "😐", "😑", "😶", "🙄", "😏", "😣",
  ];

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = evt.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = evt.target.value;
    if (selectedValue && selectedValue !== "") {
      onChange(selectedValue);
      setInputValue(selectedValue);
      if (selectRef.current) {
        selectRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative flex gap-1">
      <input
        ref={inputRef}
        type="text"
        className="input input-bordered input-sm w-20"
        placeholder="Emoji"
        value={inputValue}
        onChange={handleInputChange}
      />
      <select
        ref={selectRef}
        defaultValue=""
        className="select select-bordered select-sm w-20"
        onChange={handleSelectChange}
      >
        <option value="" disabled>
          😀
        </option>
        {commonEmojis.map((emoji, idx) => (
          <option key={idx} value={emoji}>
            {emoji}
          </option>
        ))}
      </select>
    </div>
  );
}
