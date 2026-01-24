import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { EmojiPicker } from "@/client/components/diceshock/EmojiPicker";
import { useMsg } from "@/client/components/diceshock/Msg";
import { trpcClientDash } from "@/shared/utils/trpc";
import defaultTagsToml from "./game-tags.toml?raw";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTag, setEditingTag] = useState<{
    id: string;
    emoji: string;
    tx: string;
    keywords: string;
    is_pinned: boolean;
  } | null>(null);

  const [newTagDraft, setNewTagDraft] = useState({
    emoji: "🎲",
    tx: "",
    keywords: "",
    is_pinned: false,
  });
  const [creatingTag, setCreatingTag] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [togglingPinId, setTogglingPinId] = useState<string | null>(null);
  const [importToml, setImportToml] = useState(defaultTagsToml);
  const [importing, setImporting] = useState(false);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const gameTags = await trpcClientDash.activeTags.getGameTags.query({
        search: searchQuery || undefined,
      });
      setTags(gameTags);
    } catch (error) {
      console.error("获取约局标签失败", error);
      msg.error("获取约局标签失败");
    } finally {
      setLoading(false);
    }
  }, [msg, searchQuery]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleStartEdit = (tag: TagItem) => {
    setEditingTag({
      id: tag.id,
      emoji: tag.title?.emoji || "🎲",
      tx: tag.title?.tx || "约局",
      keywords: tag.keywords || "",
      is_pinned: tag.is_pinned || false,
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
        keywords: editingTag.keywords.trim() || undefined,
        is_pinned: editingTag.is_pinned,
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
        keywords: newTagDraft.keywords.trim() || undefined,
        is_pinned: newTagDraft.is_pinned,
      });
      msg.success("标签创建成功");
      setNewTagDraft({ emoji: "🎲", tx: "", keywords: "", is_pinned: false });
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

  const handleTogglePin = useCallback(
    async (tagId: string, currentPinned: boolean) => {
      const tag = tags.find((t) => t.id === tagId);
      if (!tag) {
        msg.error("标签不存在");
        return;
      }

      try {
        setTogglingPinId(tagId);
        await trpcClientDash.activeTags.update.mutate({
          id: tagId,
          title: tag.title || {
            emoji: "🎲",
            tx: "约局",
          },
          keywords: tag.keywords || undefined,
          is_pinned: !currentPinned,
        });
        msg.success(currentPinned ? "已取消置顶" : "已置顶");
        await fetchTags();
      } catch (error) {
        console.error("切换置顶状态失败", error);
        msg.error(error instanceof Error ? error.message : "切换置顶状态失败");
      } finally {
        setTogglingPinId(null);
      }
    },
    [msg, fetchTags, tags],
  );

  // 解析 TOML 格式的标签数据
  const parseTomlTags = useCallback((tomlText: string) => {
    let rewrite = false;
    const tags: Array<{
      name: string;
      emoji?: string;
      keywords?: string;
      is_pinned?: boolean;
    }> = [];

    // 解析 rewrite 配置项（在文件顶部）
    const rewriteMatch = tomlText.match(/rewrite\s*=\s*(true|false)/);
    if (rewriteMatch) {
      rewrite = rewriteMatch[1] === "true";
    }

    // 简单的 TOML 解析（专门用于解析标签数组）
    const tagBlocks = tomlText.match(
      /\[\[tags\]\]\s*\n([\s\S]*?)(?=\[\[tags\]\]|$)/g,
    );

    if (!tagBlocks) {
      throw new Error("未找到标签数据，请确保格式为 [[tags]] ...");
    }

    for (const block of tagBlocks) {
      const tag: {
        name?: string;
        emoji?: string;
        keywords?: string;
        is_pinned?: boolean;
      } = {};

      // 解析 name
      const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
      if (nameMatch) {
        tag.name = nameMatch[1];
      }

      // 解析 emoji
      const emojiMatch = block.match(/emoji\s*=\s*"([^"]+)"/);
      if (emojiMatch) {
        tag.emoji = emojiMatch[1];
      }

      // 解析 keywords
      const keywordsMatch = block.match(/keywords\s*=\s*"([^"]+)"/);
      if (keywordsMatch) {
        tag.keywords = keywordsMatch[1];
      }

      // 解析 is_pinned
      const pinnedMatch = block.match(/is_pinned\s*=\s*(true|false)/);
      if (pinnedMatch) {
        tag.is_pinned = pinnedMatch[1] === "true";
      }

      if (tag.name) {
        tags.push(
          tag as {
            name: string;
            emoji?: string;
            keywords?: string;
            is_pinned?: boolean;
          },
        );
      }
    }

    return { tags, rewrite };
  }, []);

  const handleImportTags = useCallback(async () => {
    if (!importToml.trim()) {
      msg.warning("请输入 TOML 格式的标签数据");
      return;
    }

    try {
      setImporting(true);
      const { tags: parsedTags, rewrite } = parseTomlTags(importToml);

      if (parsedTags.length === 0) {
        msg.warning("未找到有效的标签数据");
        return;
      }

      const result = await trpcClientDash.activeTags.importTags.mutate({
        tags: parsedTags,
        rewrite,
      });

      const message = `导入完成：创建 ${result.created} 个${
        result.updated > 0 ? `，更新 ${result.updated} 个` : ""
      }，跳过 ${result.skipped} 个${
        result.errors.length > 0 ? `，失败 ${result.errors.length} 个` : ""
      }`;

      if (result.errors.length > 0) {
        console.error("导入错误:", result.errors);
        msg.warning(message);
      } else {
        msg.success(message);
      }

      await fetchTags();
    } catch (error) {
      console.error("导入标签失败", error);
      msg.error(
        error instanceof Error
          ? error.message
          : "导入标签失败，请检查 TOML 格式",
      );
    } finally {
      setImporting(false);
    }
  }, [importToml, parseTomlTags, msg, fetchTags]);

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
      <div className="max-w-6xl mx-auto">
        <DashBackButton />
        <h1 className="text-3xl font-bold mb-6">约局标签管理</h1>

        {/* 搜索框和添加新标签 */}
        <div className="card bg-base-200 mb-6">
          <div className="card-body">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="label">
                  <span className="label-text">搜索标签</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="搜索标签名称、关键字或 emoji..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 导入标签 */}
        <div className="card bg-base-200 mb-6">
          <div className="card-body">
            <h2 className="card-title mb-4">批量导入标签 (TOML)</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="label">
                  <span className="label-text">TOML 格式标签数据</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full font-mono text-sm"
                  rows={15}
                  value={importToml}
                  onChange={(e) => setImportToml(e.target.value)}
                  placeholder={`rewrite = false

[[tags]]
name = "标签名称"
emoji = "🎲"
keywords = "关键字1,关键字2"
is_pinned = false`}
                />
                <div className="label">
                  <span className="label-text-alt text-base-content/60">
                    提示：如果标签名称已存在，默认将跳过该标签。设置 rewrite =
                    true 可覆盖同名标签。
                  </span>
                </div>
              </div>
              <button
                onClick={handleImportTags}
                disabled={importing || !importToml.trim()}
                className="btn btn-primary"
              >
                {importing && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                导入标签
              </button>
            </div>
          </div>
        </div>

        {/* 添加新标签 */}
        <div className="card bg-base-200 mb-6">
          <div className="card-body">
            <h2 className="card-title mb-4">添加新约局标签</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div>
                <label className="label">
                  <span className="label-text">关键字（可选）</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={newTagDraft.keywords}
                  onChange={(e) =>
                    setNewTagDraft((prev) => ({
                      ...prev,
                      keywords: e.target.value,
                    }))
                  }
                  placeholder="多个关键字用逗号分隔"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <label className="label cursor-pointer gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={newTagDraft.is_pinned}
                  onChange={(e) =>
                    setNewTagDraft((prev) => ({
                      ...prev,
                      is_pinned: e.target.checked,
                    }))
                  }
                />
                <span className="label-text">置顶</span>
              </label>
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

        {/* 标签表格 */}
        <div className="card bg-base-200">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>置顶</th>
                    <th>图标</th>
                    <th>标签名称</th>
                    <th>关键字</th>
                    <th>标签 ID</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <p className="text-base-content/60">暂无约局标签</p>
                      </td>
                    </tr>
                  ) : (
                    tags.map((tag) => {
                      const isEditing = editingTag?.id === tag.id;
                      return (
                        <tr
                          key={tag.id}
                          className={tag.is_pinned ? "bg-base-300/50" : ""}
                        >
                          <td>
                            {isEditing && editingTag ? (
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={editingTag?.is_pinned || false}
                                onChange={(e) =>
                                  setEditingTag((prev) =>
                                    prev
                                      ? { ...prev, is_pinned: e.target.checked }
                                      : null,
                                  )
                                }
                              />
                            ) : (
                              <input
                                type="checkbox"
                                className="toggle toggle-sm"
                                checked={tag.is_pinned || false}
                                disabled={togglingPinId === tag.id}
                                onChange={(e) => {
                                  const newValue = e.target.checked;
                                  handleTogglePin(tag.id, !newValue);
                                }}
                              />
                            )}
                          </td>
                          <td>
                            {isEditing && editingTag ? (
                              <EmojiPicker
                                value={editingTag?.emoji || "🎲"}
                                onChange={(emoji) =>
                                  setEditingTag((prev) =>
                                    prev ? { ...prev, emoji } : null,
                                  )
                                }
                              />
                            ) : (
                              <span className="text-2xl">
                                {tag.title?.emoji || "🎲"}
                              </span>
                            )}
                          </td>
                          <td>
                            {isEditing && editingTag ? (
                              <input
                                type="text"
                                className="input input-sm input-bordered w-full max-w-xs"
                                value={editingTag?.tx || ""}
                                onChange={(e) =>
                                  setEditingTag((prev) =>
                                    prev
                                      ? { ...prev, tx: e.target.value }
                                      : null,
                                  )
                                }
                                placeholder="约局"
                              />
                            ) : (
                              <span className="font-medium">
                                {tag.title?.tx || "约局"}
                              </span>
                            )}
                          </td>
                          <td>
                            {isEditing && editingTag ? (
                              <input
                                type="text"
                                className="input input-sm input-bordered w-full max-w-xs"
                                value={editingTag?.keywords || ""}
                                onChange={(e) =>
                                  setEditingTag((prev) =>
                                    prev
                                      ? { ...prev, keywords: e.target.value }
                                      : null,
                                  )
                                }
                                placeholder="多个关键字用逗号分隔"
                              />
                            ) : (
                              <span className="text-sm text-base-content/70">
                                {tag.keywords || "—"}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="text-xs font-mono text-base-content/60">
                              {tag.id}
                            </span>
                          </td>
                          <td>
                            {isEditing ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveEdit}
                                  className="btn btn-xs btn-primary"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="btn btn-xs btn-ghost"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleStartEdit(tag)}
                                  className="btn btn-xs btn-outline"
                                >
                                  <PencilSimpleIcon className="size-3" />
                                  编辑
                                </button>
                                <button
                                  onClick={() => handleDeleteTag(tag.id)}
                                  disabled={deletingTagId === tag.id}
                                  className="btn btn-xs btn-error"
                                >
                                  {deletingTagId === tag.id ? (
                                    <span className="loading loading-spinner loading-xs" />
                                  ) : (
                                    <TrashIcon className="size-3" />
                                  )}
                                  删除
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
