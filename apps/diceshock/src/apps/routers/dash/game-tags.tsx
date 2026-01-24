import { TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { EmojiPicker } from "@/client/components/diceshock/EmojiPicker";
import { useMsg } from "@/client/components/diceshock/Msg";
import { trpcClientDash } from "@/shared/utils/trpc";

export const Route = createFileRoute("/dash/game-tags")({
  component: RouteComponent,
});

type TagItem = Awaited<
  ReturnType<typeof trpcClientDash.activeTags.getGameTags.query>
>[number];

function RouteComponent() {
  const msg = useMsg();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<{
    id: string;
    emoji: string;
    tx: string;
  } | null>(null);

  const [newTagDraft, setNewTagDraft] = useState({ emoji: "🎲", tx: "" });
  const [creatingTag, setCreatingTag] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const gameTags = await trpcClientDash.activeTags.getGameTags.query();
      setTags(gameTags);
    } catch (error) {
      console.error("获取约局标签失败", error);
      msg.error("获取约局标签失败");
    } finally {
      setLoading(false);
    }
  }, [msg]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleStartEdit = (tag: TagItem) => {
    setEditingTag({
      id: tag.id,
      emoji: tag.title?.emoji || "🎲",
      tx: tag.title?.tx || "约局",
    });
  };

  const handleSaveEdit = useCallback(async () => {
    if (!editingTag) return;

    if (!editingTag.tx.trim()) {
      msg.warning("请输入标签名称");
      return;
    }

    try {
      await trpcClientDash.activeTags.update.mutate({
        id: editingTag.id,
        title: {
          emoji: editingTag.emoji.trim() || "🎲",
          tx: editingTag.tx.trim(),
        },
      });
      msg.success("标签更新成功");
      setEditingTag(null);
      await fetchTags();
    } catch (error) {
      console.error("更新标签失败", error);
      msg.error(error instanceof Error ? error.message : "更新标签失败");
    }
  }, [editingTag, msg, fetchTags]);

  const handleCancelEdit = () => {
    setEditingTag(null);
  };

  const handleCreateTag = useCallback(async () => {
    if (!newTagDraft.tx.trim()) {
      msg.warning("请输入标签名称");
      return;
    }

    try {
      setCreatingTag(true);
      await trpcClientDash.activeTags.createGameTag.mutate({
        title: {
          emoji: newTagDraft.emoji.trim() || "🎲",
          tx: newTagDraft.tx.trim(),
        },
      });
      msg.success("标签创建成功");
      setNewTagDraft({ emoji: "🎲", tx: "" });
      await fetchTags();
    } catch (error) {
      console.error("创建标签失败", error);
      msg.error(error instanceof Error ? error.message : "创建标签失败");
    } finally {
      setCreatingTag(false);
    }
  }, [newTagDraft, msg, fetchTags]);

  const handleDeleteTag = useCallback(
    async (tagId: string) => {
      if (
        !confirm(
          "确定要删除这个标签吗？删除后所有使用该标签的活动将不再显示此标签。",
        )
      ) {
        return;
      }

      try {
        setDeletingTagId(tagId);
        await trpcClientDash.activeTags.delete.mutate({ id: tagId });
        msg.success("标签删除成功");
        await fetchTags();
      } catch (error) {
        console.error("删除标签失败", error);
        msg.error(error instanceof Error ? error.message : "删除标签失败");
      } finally {
        setDeletingTagId(null);
      }
    },
    [msg, fetchTags],
  );

  if (loading) {
    return (
      <main className="size-full p-4">
        <div className="flex items-center justify-center h-full">
          <span className="loading loading-dots loading-md"></span>
        </div>
      </main>
    );
  }

  return (
    <main className="size-full p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">约局标签管理</h1>

        {/* 添加新标签 */}
        <div className="card bg-base-200 mb-6">
          <div className="card-body">
            <h2 className="card-title mb-4">添加新约局标签</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="label">
                  <span className="label-text">图标 (Emoji)</span>
                </label>
                <EmojiPicker
                  value={newTagDraft.emoji}
                  onChange={(emoji) =>
                    setNewTagDraft((prev) => ({ ...prev, emoji }))
                  }
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">标签名称 *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={newTagDraft.tx}
                  onChange={(e) =>
                    setNewTagDraft((prev) => ({ ...prev, tx: e.target.value }))
                  }
                  placeholder="约局"
                />
              </div>
              <button
                onClick={handleCreateTag}
                disabled={creatingTag || !newTagDraft.tx.trim()}
                className="btn btn-primary"
              >
                {creatingTag && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                创建标签
              </button>
            </div>
          </div>
        </div>

        {/* 现有标签列表 */}
        <h2 className="text-2xl font-bold mb-4">现有约局标签</h2>
        {tags.length === 0 ? (
          <div className="card bg-base-200">
            <div className="card-body">
              <p className="text-center text-base-content/60">暂无约局标签</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {tags.map((tag) => {
              const isEditing = editingTag?.id === tag.id;
              return (
                <div key={tag.id} className="card bg-base-200">
                  <div className="card-body">
                    {isEditing ? (
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="label">
                            <span className="label-text">图标 (Emoji)</span>
                          </label>
                          <EmojiPicker
                            value={editingTag.emoji}
                            onChange={(emoji) =>
                              setEditingTag((prev) =>
                                prev ? { ...prev, emoji } : null,
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="label">
                            <span className="label-text">标签名称</span>
                          </label>
                          <input
                            type="text"
                            className="input input-bordered w-full"
                            value={editingTag.tx}
                            onChange={(e) =>
                              setEditingTag((prev) =>
                                prev ? { ...prev, tx: e.target.value } : null,
                              )
                            }
                            placeholder="约局"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="btn btn-primary"
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn btn-ghost"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="badge badge-lg gap-2">
                            <span>{tag.title?.emoji || "🎲"}</span>
                            {tag.title?.tx || "约局"}
                          </span>
                          <span className="text-sm text-base-content/60">
                            标签 ID: {tag.id}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartEdit(tag)}
                            className="btn btn-sm btn-outline"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            disabled={deletingTagId === tag.id}
                            className="btn btn-sm btn-error"
                          >
                            {deletingTagId === tag.id ? (
                              <span className="loading loading-spinner loading-sm" />
                            ) : (
                              <TrashIcon className="size-4" />
                            )}
                            删除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
