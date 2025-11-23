import {
  ArrowBendUpRightIcon,
  MagicWandIcon,
  PencilLineIcon,
  PlusIcon,
  PushPinIcon,
  ToggleRightIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMsg } from "@/client/components/diceshock/Msg";
import { trpcClientDash } from "@/shared/utils/trpc";

type ActiveList = Awaited<ReturnType<typeof trpcClientDash.active.get.query>>;
type ActiveItem = ActiveList[number];

type TagList = Awaited<ReturnType<typeof trpcClientDash.activeTags.get.query>>;
type TagItem = TagList[number];

type StatusFilter = "all" | "published" | "trash";

const PAGE_SIZE = 30;
const statusTabs: { label: string; value: StatusFilter }[] = [
  { label: "垃圾桶", value: "trash" },
  { label: "无论状态", value: "all" },
  { label: "已发布", value: "published" },
];

const tagTitle = (tag?: TagItem["title"] | null) => ({
  emoji: tag?.emoji ?? "🏷️",
  tx: tag?.tx ?? "未命名",
});

const isSelectableTag = (
  value: unknown,
): value is { id: string; title: TagItem["title"] } => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string";
};

export const Route = createFileRoute("/dash/acitve")({
  component: RouteComponent,
});

function RouteComponent() {
  const msg = useMsg();
  const [searchWords, setSearchWords] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [actives, setActives] = useState<ActiveItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const createDialogRef = useRef<HTMLDialogElement>(null);
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  const searchWordsRef = useRef(searchWords);
  const selectedTagsRef = useRef(selectedTags);
  const statusRef = useRef(status);

  useEffect(() => {
    searchWordsRef.current = searchWords;
  }, [searchWords]);

  useEffect(() => {
    selectedTagsRef.current = selectedTags;
  }, [selectedTags]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    tags: [] as string[],
    newTags: [] as Array<{ emoji: string; tx: string }>,
  });
  const [createPending, setCreatePending] = useState(false);

  const [editForm, setEditForm] = useState<{
    id: string;
    name: string;
    description: string;
    tags: string[];
    is_published: boolean;
    is_deleted: boolean;
  } | null>(null);
  const [editPending, setEditPending] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<ActiveItem | null>(null);
  const [tagDraft, setTagDraft] = useState({ emoji: "", tx: "" });

  const refreshTags = useCallback(async () => {
    try {
      const data = await trpcClientDash.activeTags.get.query();
      setTags(data);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "获取标签失败");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshActives = useCallback(async () => {
    setLoading(true);
    try {
      const currentStatus = statusRef.current;
      const currentSearchWords = searchWordsRef.current;
      const currentSelectedTags = selectedTagsRef.current;

      const params: {
        isDeleted?: boolean;
        isPublished?: boolean;
        searchWords?: string;
        tags?: string[];
      } = {};

      if (currentStatus === "trash") {
        params.isDeleted = true;
      } else if (currentStatus === "published") {
        params.isDeleted = false;
        params.isPublished = true;
      } else {
        params.isDeleted = false;
      }

      if (currentSearchWords.trim()) {
        params.searchWords = currentSearchWords.trim();
      }

      if (currentSelectedTags.length) {
        params.tags = currentSelectedTags;
      }

      const data = await trpcClientDash.active.get.query({
        page,
        pageSize: PAGE_SIZE,
        params,
      });

      setActives(data);
      setSelectedRows((prev) =>
        prev.filter((id) => data.some((active) => active.id === id)),
      );
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "获取活动失败");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    refreshTags();
  }, [refreshTags]);

  const selectedTagsKey = useMemo(
    () => selectedTags.sort().join(","),
    [selectedTags],
  );

  useEffect(() => {
    refreshActives();
  }, [refreshActives, status, searchWords, selectedTagsKey]);

  // 监听删除对话框的关闭事件，确保状态同步
  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      // 延迟清空状态，确保对话框动画完成
      setTimeout(() => {
        if (!dialog.open) {
          setPendingDelete(null);
        }
      }, 100);
    };

    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, []);

  const toggleFilterTag = (tagId: string) => {
    setPage(1);
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const openCreateDialog = () => {
    setCreateForm({ name: "", description: "", tags: [], newTags: [] });
    createDialogRef.current?.showModal();
  };

  const handleCreateActive = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!createForm.name.trim()) {
      msg.warning("请填写活动名称");
      return;
    }

    setCreatePending(true);
    try {
      // 先创建活动
      const newActive = await trpcClientDash.active.mutation.mutate({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        tags: createForm.tags,
      });

      // 如果有新标签，创建并关联
      if (
        createForm.newTags.length > 0 &&
        Array.isArray(newActive) &&
        newActive[0]?.id
      ) {
        const activeId = newActive[0].id;
        const tagResults = await trpcClientDash.activeTags.insert.mutate(
          createForm.newTags.map((tag) => ({
            activeId,
            title: { emoji: tag.emoji.trim(), tx: tag.tx.trim() },
          })),
        );

        const createdTagIds = tagResults
          .filter(isSelectableTag)
          .map((tag) => tag.id);

        if (createdTagIds.length > 0) {
          // 更新活动，添加新创建的标签
          await trpcClientDash.active.mutation.mutate({
            id: activeId,
            tags: [...createForm.tags, ...createdTagIds],
          });
        }
      }

      msg.success("活动已创建");
      createDialogRef.current?.close();
      setCreateForm({ name: "", description: "", tags: [], newTags: [] });
      setPage(1);
      await refreshActives();
      await refreshTags();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "创建活动失败");
    } finally {
      setCreatePending(false);
    }
  };

  const openEditDialog = (active: ActiveItem) => {
    setEditForm({
      id: active.id,
      name: active.name ?? "",
      description: active.description ?? "",
      tags: (active.tags ?? []).map((t) => t.tag_id),
      is_published: Boolean(active.is_published),
      is_deleted: Boolean(active.is_deleted),
    });
    setTagDraft({ emoji: "", tx: "" });
    editDialogRef.current?.showModal();
  };

  const handleEditSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!editForm) return;
    setEditPending(true);
    try {
      await trpcClientDash.active.mutation.mutate({
        id: editForm.id,
        name: editForm.name.trim() || undefined,
        description: editForm.description.trim() || undefined,
        is_published: editForm.is_published,
        is_deleted: editForm.is_deleted,
        tags: editForm.tags,
      });
      msg.success("活动已更新");
      editDialogRef.current?.close();
      setEditForm(null);
      await refreshActives();
      await refreshTags();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setEditPending(false);
    }
  };

  const handleCreateTag = async () => {
    if (!editForm) return;
    if (!tagDraft.emoji.trim() || !tagDraft.tx.trim()) {
      msg.warning("请先填写 Emoji 与标签名称");
      return;
    }

    try {
      const result = await trpcClientDash.activeTags.insert.mutate([
        {
          activeId: editForm.id,
          title: { emoji: tagDraft.emoji.trim(), tx: tagDraft.tx.trim() },
        },
      ]);

      const created = result.find(isSelectableTag);
      if (!created) {
        msg.error("标签创建失败");
        return;
      }

      setEditForm((prev) =>
        prev
          ? {
              ...prev,
              tags: [...new Set([...prev.tags, created.id])],
            }
          : prev,
      );
      setTagDraft({ emoji: "", tx: "" });
      await refreshActives();
      await refreshTags();
      msg.success("标签已添加");
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "创建标签失败");
    }
  };

  const patchActive = async (
    id: string,
    patch: { is_deleted?: boolean; is_published?: boolean },
  ) => {
    try {
      await trpcClientDash.active.mutation.mutate({ id, ...patch });
      await refreshActives();
      await refreshTags();
      msg.success("操作成功");
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  const openDeleteDialog = (active: ActiveItem) => {
    // 使用 setTimeout 确保状态更新后再显示对话框，避免闪烁
    setPendingDelete(active);
    setTimeout(() => {
      deleteDialogRef.current?.showModal();
    }, 0);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await patchActive(pendingDelete.id, {
      is_deleted: !pendingDelete.is_deleted,
    });
    deleteDialogRef.current?.close();
    setPendingDelete(null);
  };

  const confirmPermanentDelete = async () => {
    if (!pendingDelete) return;
    const deleteId = pendingDelete.id;
    try {
      // 先关闭对话框并清空状态，避免刷新时导致对话框闪烁
      deleteDialogRef.current?.close();
      setPendingDelete(null);

      await trpcClientDash.active.delete.mutate({ id: deleteId });
      msg.success("活动已永久删除");

      // 延迟刷新，确保对话框已完全关闭
      setTimeout(async () => {
        await refreshActives();
        await refreshTags();
      }, 100);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "永久删除失败");
      // 如果删除失败，重新打开对话框
      const failedActive = actives.find((a) => a.id === deleteId);
      if (failedActive) {
        setPendingDelete(failedActive);
        deleteDialogRef.current?.showModal();
      }
    }
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id],
    );
  };

  const [batchProcessing, setBatchProcessing] = useState(false);

  const handleBatchPublish = async () => {
    if (selectedRows.length === 0) {
      msg.warning("请先选择要发布的活动");
      return;
    }

    setBatchProcessing(true);
    try {
      // 过滤掉已在垃圾桶中的活动
      const validIds = actives
        .filter(
          (active) => selectedRows.includes(active.id) && !active.is_deleted,
        )
        .map((active) => active.id);

      if (validIds.length === 0) {
        msg.warning("选中的活动都在垃圾桶中，无法发布");
        setBatchProcessing(false);
        return;
      }

      // 批量发布
      await Promise.all(
        validIds.map((id) =>
          trpcClientDash.active.mutation.mutate({
            id,
            is_published: true,
          }),
        ),
      );

      msg.success(`已发布 ${validIds.length} 个活动`);
      setSelectedRows([]);
      await refreshActives();
      await refreshTags();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "批量发布失败");
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRows.length === 0) {
      msg.warning("请先选择要删除的活动");
      return;
    }

    if (!confirm(`确定要将 ${selectedRows.length} 个活动放入垃圾桶吗？`)) {
      return;
    }

    setBatchProcessing(true);
    try {
      // 批量删除（放入垃圾桶）
      await Promise.all(
        selectedRows.map((id) =>
          trpcClientDash.active.mutation.mutate({
            id,
            is_deleted: true,
          }),
        ),
      );

      msg.success(`已将 ${selectedRows.length} 个活动放入垃圾桶`);
      setSelectedRows([]);
      await refreshActives();
      await refreshTags();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "批量删除失败");
    } finally {
      setBatchProcessing(false);
    }
  };

  const availableTags = useMemo(() => {
    const sorted = [...tags].sort((a, b) => {
      const aSelected = selectedTags.includes(a.id);
      const bSelected = selectedTags.includes(b.id);

      // 选中的标签排在前面
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      // 都选中或都没选中时，按名称排序
      return (a.title?.tx ?? "").localeCompare(b.title?.tx ?? "");
    });
    return sorted;
  }, [tags, selectedTags]);

  return (
    <main className="size-full">
      <form className="w-full flex flex-col items-center gap-6 px-4 pt-4 bg-base-100 z-10">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <input
            type="text"
            value={searchWords}
            onChange={(evt) => {
              setSearchWords(evt.target.value);
              setPage(1);
            }}
            placeholder="搜索"
            className="input input-lg w-full sm:w-1/3"
          />

          <ul className="sm:w-2/3 h-auto overflow-x-auto flex flex-row items-center gap-2 py-1">
            <p className="sticky w-20 left-0 h-full py-2 bg-base-100 text-nowrap pointer-events-none">
              标签:
            </p>

            {availableTags.length === 0 && (
              <li className="text-sm text-base-content/50">暂无标签数据</li>
            )}

            {availableTags.map((tag) => {
              const title = tagTitle(tag.title);
              const selected = selectedTags.includes(tag.id);
              return (
                <li key={tag.id} className="w-fit flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFilterTag(tag.id)}
                    className={`btn btn-ghost ${
                      selected ? "btn-primary" : "btn-outline"
                    } p-0 size-fit`}
                  >
                    <div
                      className={`badge shrink-0 text-nowrap badge-lg gap-1 ${
                        selected ? "badge-neutral" : "badge-warning"
                      }`}
                    >
                      <span>{title.emoji}</span>
                      {title.tx}
                      {selected && <XIcon className="size-4" />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div role="tablist" className="tabs tabs-border">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`tab ${status === tab.value ? "tab-active" : ""} ${
                tab.value === "trash" ? "text-error" : ""
              }`}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
            >
              {tab.value === "trash" && <TrashIcon className="mr-1" />}
              {tab.value === "published" && (
                <ToggleRightIcon className="mr-1" weight="fill" />
              )}
              {tab.label}
            </button>
          ))}
        </div>
      </form>

      {/* 批量操作栏 */}
      {selectedRows.length > 0 && (
        <div className="w-full px-4 py-2 bg-base-200 border-b border-base-300 flex items-center justify-between">
          <span className="text-sm text-base-content/70">
            已选中 {selectedRows.length} 个活动
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleBatchPublish}
              disabled={batchProcessing}
            >
              {batchProcessing ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <ToggleRightIcon className="size-4" weight="fill" />
              )}
              批量发布
            </button>
            <button
              type="button"
              className="btn btn-sm btn-error"
              onClick={handleBatchDelete}
              disabled={batchProcessing}
            >
              {batchProcessing ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <TrashIcon className="size-4" />
              )}
              批量删除
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setSelectedRows([])}
              disabled={batchProcessing}
            >
              <XIcon className="size-4" />
              取消选择
            </button>
          </div>
        </div>
      )}

      <div className="w-full h-[calc(100vh-8rem)] overflow-y-auto overflow-x-auto pb-40">
        <table className="table table-pin-rows table-pin-cols">
          <thead>
            <tr className="z-20">
              <th></th>
              <td>名称</td>
              <td>状态</td>
              <td>简介</td>
              <td>Tags</td>
              <td>发布日期</td>
              <td>
                <div className="flex items-center gap-4 py-2 h-full">
                  操作
                  <button
                    type="button"
                    className="btn btn-neutral btn-sm"
                    onClick={openCreateDialog}
                  >
                    <PlusIcon />
                    新增
                  </button>
                </div>
              </td>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <span className="loading loading-dots loading-md"></span>
                </td>
              </tr>
            ) : actives.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-12 text-center text-base-content/60"
                >
                  暂无活动，尝试调整筛选条件。
                </td>
              </tr>
            ) : (
              actives.map((active) => {
                const tagsForRow = active.tags ?? [];
                return (
                  <tr key={active.id}>
                    <th className="z-10">
                      <label className="size-full hover:cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selectedRows.includes(active.id)}
                          onChange={() => toggleRow(active.id)}
                        />
                      </label>
                    </th>
                    <td className="p-0">
                      <Link
                        to="/dash/active/$id"
                        params={{ id: active.id }}
                        className="btn btn-ghost w-40 justify-start m-0 truncate line-clamp-1"
                      >
                        {active.name || "未命名活动"}
                      </Link>
                    </td>
                    <td>
                      <label
                        className={`size-full flex items-center gap-2 text-nowrap ${active.is_deleted ? "opacity-50 cursor-not-allowed" : "hover:cursor-pointer"}`}
                      >
                        <input
                          type="checkbox"
                          className="toggle"
                          checked={Boolean(active.is_published)}
                          disabled={Boolean(active.is_deleted)}
                          onChange={() => {
                            if (active.is_deleted) return;
                            const nextPublished = !active.is_published;
                            void patchActive(active.id, {
                              is_published: nextPublished,
                            });
                          }}
                        />
                        {active.is_published ? "已发布" : "未发布"}
                      </label>
                    </td>
                    <td className="p-0">
                      <Link
                        to="/dash/active/$id"
                        params={{ id: active.id }}
                        className="btn btn-ghost justify-start w-full"
                      >
                        <p className="w-full max-w-80 m-0 truncate line-clamp-1">
                          {active.description || "暂无简介"}
                        </p>
                      </Link>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {tagsForRow.length === 0 && (
                          <span className="text-xs text-base-content/50">
                            暂无
                          </span>
                        )}
                        {tagsForRow.map((tag) => {
                          const title = tagTitle(tag.tag?.title);
                          return (
                            <div
                              key={tag.tag_id}
                              className="badge shrink-0 text-nowrap badge-sm gap-1 badge-neutral"
                            >
                              <span>{title.emoji}</span>
                              {title.tx}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      {active.publish_at
                        ? dayjs(active.publish_at).format("YYYY/MM/DD HH:mm")
                        : "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-4 py-2 h-full">
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost btn-primary"
                          onClick={() => openEditDialog(active)}
                        >
                          编辑
                          <PencilLineIcon />
                        </button>

                        <button
                          type="button"
                          className={`btn btn-xs btn-ghost ${
                            active.is_deleted ? "btn-success" : "btn-error"
                          }`}
                          onClick={() => openDeleteDialog(active)}
                        >
                          {active.is_deleted ? "恢复/删除" : "删除"}
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <dialog ref={createDialogRef} className="modal">
        <form
          method="dialog"
          className="modal-box"
          onSubmit={handleCreateActive}
        >
          <div className="modal-action flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">创建活动</h3>
            <button
              type="button"
              className="btn btn-ghost btn-square"
              onClick={() => createDialogRef.current?.close()}
            >
              <XIcon />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <input
              type="text"
              className="input input-bordered"
              placeholder="活动名称"
              value={createForm.name}
              onChange={(evt) =>
                setCreateForm((prev) => ({ ...prev, name: evt.target.value }))
              }
            />
            <textarea
              placeholder="活动简介"
              className="textarea textarea-bordered h-24"
              value={createForm.description}
              onChange={(evt) =>
                setCreateForm((prev) => ({
                  ...prev,
                  description: evt.target.value,
                }))
              }
            />
            <div className="flex flex-col gap-2">
              <p className="text-sm text-base-content/70">标签</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {createForm.tags.map((tagId) => {
                  const tag = availableTags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  const title = tagTitle(tag.title);
                  return (
                    <div
                      key={tagId}
                      className="badge badge-lg gap-2 badge-neutral"
                    >
                      <span>{title.emoji}</span>
                      {title.tx}
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs p-0"
                        onClick={() =>
                          setCreateForm((prev) => ({
                            ...prev,
                            tags: prev.tags.filter((id) => id !== tagId),
                          }))
                        }
                      >
                        <XIcon className="size-3" />
                      </button>
                    </div>
                  );
                })}
                {createForm.newTags.map((newTag, idx) => (
                  <div
                    key={`new-${idx}`}
                    className="badge badge-lg gap-2 badge-primary"
                  >
                    <span>{newTag.emoji || "🏷️"}</span>
                    {newTag.tx}
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs p-0"
                      onClick={() =>
                        setCreateForm((prev) => ({
                          ...prev,
                          newTags: prev.newTags.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
              <TagAutocompleteInput
                tags={availableTags}
                selectedTagIds={createForm.tags}
                onSelectTag={(tagId) => {
                  setCreateForm((prev) => ({
                    ...prev,
                    tags: prev.tags.includes(tagId)
                      ? prev.tags
                      : [...prev.tags, tagId],
                  }));
                }}
                onCreateTag={async (emoji, tx) => {
                  // 在创建活动时，先存储新标签信息，在创建活动时一起处理
                  setCreateForm((prev) => ({
                    ...prev,
                    newTags: [...prev.newTags, { emoji, tx }],
                  }));
                  msg.success("标签将在创建活动时一起创建");
                }}
              />
            </div>
          </div>

          <div className="modal-action mt-6">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createPending}
            >
              {createPending ? "创建中..." : "确认创建"}
            </button>
          </div>
        </form>
      </dialog>

      <dialog ref={editDialogRef} className="modal">
        <form
          method="dialog"
          className="modal-box max-w-3xl"
          onSubmit={handleEditSubmit}
        >
          <div className="modal-action flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">编辑活动</h3>
            <button
              type="button"
              className="btn btn-ghost btn-square"
              onClick={() => editDialogRef.current?.close()}
            >
              <XIcon />
            </button>
          </div>

          {editForm && (
            <div className="flex flex-col gap-4">
              <input
                type="text"
                className="input input-bordered"
                value={editForm.name}
                onChange={(evt) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, name: evt.target.value } : prev,
                  )
                }
              />

              <textarea
                className="textarea textarea-bordered h-32"
                value={editForm.description}
                onChange={(evt) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, description: evt.target.value } : prev,
                  )
                }
              />

              <div className="flex flex-col gap-2">
                <p className="text-sm text-base-content/70">标签</p>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const title = tagTitle(tag.title);
                    const checked = editForm.tags.includes(tag.id);
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
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    tags: checked
                                      ? prev.tags.filter((id) => id !== tag.id)
                                      : [...prev.tags, tag.id],
                                  }
                                : prev,
                            )
                          }
                        />
                        <span>{title.emoji}</span>
                        {title.tx}
                      </label>
                    );
                  })}
                </div>
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

              <div className="flex items-center gap-4">
                <label
                  className={`label gap-2 ${editForm.is_deleted ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className="label-text">发布状态</span>
                  <input
                    type="checkbox"
                    className="toggle"
                    checked={editForm.is_published}
                    disabled={editForm.is_deleted}
                    onChange={(evt) => {
                      if (editForm.is_deleted) return;
                      setEditForm((prev) =>
                        prev
                          ? { ...prev, is_published: evt.target.checked }
                          : prev,
                      );
                    }}
                  />
                </label>

                <label className="label cursor-pointer gap-2">
                  <span className="label-text">垃圾桶</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-error"
                    checked={editForm.is_deleted}
                    onChange={(evt) =>
                      setEditForm((prev) =>
                        prev
                          ? { ...prev, is_deleted: evt.target.checked }
                          : prev,
                      )
                    }
                  />
                </label>
              </div>
            </div>
          )}

          <div className="modal-action mt-6">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={editPending}
            >
              {editPending ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </dialog>

      <dialog ref={deleteDialogRef} className="modal">
        {pendingDelete && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {pendingDelete.is_deleted ? "恢复活动或永久删除" : "确认删除"}
            </h3>
            <p>
              {pendingDelete.is_deleted
                ? "该活动可以恢复到列表，或者永久删除（无法恢复）。"
                : "活动将被放入垃圾桶，可在垃圾桶里恢复。"}
            </p>
            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteDialogRef.current?.close();
                  // 延迟清空状态，确保对话框先关闭
                  setTimeout(() => {
                    setPendingDelete(null);
                  }, 100);
                }}
              >
                取消
              </button>
              {pendingDelete.is_deleted ? (
                <>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void confirmDelete();
                    }}
                  >
                    恢复
                  </button>
                  <button
                    type="button"
                    className="btn btn-error"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void confirmPermanentDelete();
                    }}
                  >
                    永久删除
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-error"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void confirmDelete();
                  }}
                >
                  确认删除
                </button>
              )}
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}

type TagAutocompleteInputProps = {
  tags: TagItem[];
  selectedTagIds: string[];
  onSelectTag: (tagId: string) => void;
  onCreateTag: (emoji: string, tx: string) => Promise<void>;
};

function TagAutocompleteInput({
  tags,
  selectedTagIds,
  onSelectTag,
  onCreateTag,
}: TagAutocompleteInputProps) {
  const msg = useMsg();
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [emoji, setEmoji] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const availableTags = useMemo(
    () => tags.filter((tag) => !selectedTagIds.includes(tag.id)),
    [tags, selectedTagIds],
  );

  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    const lowerInput = inputValue.toLowerCase();
    return availableTags
      .filter((tag) => {
        const title = tagTitle(tag.title);
        return (
          title.tx.toLowerCase().includes(lowerInput) ||
          title.emoji.includes(lowerInput)
        );
      })
      .slice(0, 5);
  }, [inputValue, availableTags]);

  const handleInputChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const value = evt.target.value;
    setInputValue(value);
    setShowSuggestions(value.trim().length > 0);
  };

  const handleSelectTag = (tagId: string) => {
    onSelectTag(tagId);
    setInputValue("");
    setEmoji("");
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleCreateNewTag = async () => {
    const parts = inputValue.trim().split(/\s+/);
    let newEmoji = emoji.trim();
    let newTx = inputValue.trim();

    if (parts.length > 0 && /^[\p{Emoji}]$/u.test(parts[0])) {
      newEmoji = parts[0];
      newTx = parts.slice(1).join(" ");
    } else if (!newEmoji) {
      newEmoji = "🏷️";
    }

    if (!newTx) {
      msg.warning("请输入标签名称");
      return;
    }

    await onCreateTag(newEmoji, newTx);
    setInputValue("");
    setEmoji("");
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === "Enter" && !evt.shiftKey) {
      evt.preventDefault();
      if (suggestions.length > 0) {
        handleSelectTag(suggestions[0].id);
      } else if (inputValue.trim()) {
        void handleCreateNewTag();
      }
    } else if (evt.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    const handleClickOutside = (evt: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(evt.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(evt.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          className="input input-bordered input-sm flex-1"
          placeholder="输入标签名称或选择已有标签..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(inputValue.trim().length > 0)}
        />
        <EmojiPicker value={emoji} onChange={setEmoji} />
        {inputValue.trim() && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleCreateNewTag}
          >
            <PlusIcon className="size-4" />
            新建
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((tag) => {
            const title = tagTitle(tag.title);
            return (
              <button
                key={tag.id}
                type="button"
                className="w-full text-left px-4 py-2 hover:bg-base-200 flex items-center gap-2"
                onClick={() => handleSelectTag(tag.id)}
              >
                <span>{title.emoji}</span>
                <span>{title.tx}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
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
    "🏷️",
    "📝",
    "📌",
    "⭐",
    "🔥",
    "💡",
    "🎯",
    "✅",
    "❌",
    "⚠️",
    "📅",
    "📊",
    "📈",
    "📉",
    "🎉",
    "🎊",
    "🎁",
    "🎈",
    "🎀",
    "🎪",
    "🏠",
    "🏢",
    "🏫",
    "🏥",
    "🏪",
    "🏨",
    "🏰",
    "⛪",
    "🕌",
    "🕍",
    "🚗",
    "🚕",
    "🚙",
    "🚌",
    "🚎",
    "🏎️",
    "🚓",
    "🚑",
    "🚒",
    "🚐",
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "🤣",
    "😂",
    "🙂",
    "🙃",
    "😉",
    "😊",
    "😇",
    "🥰",
    "😍",
    "🤩",
    "😘",
    "😗",
    "😚",
    "😙",
    "🥳",
    "🤗",
    "🤔",
    "🤨",
    "😐",
    "😑",
    "😶",
    "🙄",
    "😏",
    "😣",
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
      // 重置 select 为默认值
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
