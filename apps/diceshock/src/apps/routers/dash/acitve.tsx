import {
  PencilLineIcon,
  PlusIcon,
  ToggleRightIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ActiveTags } from "@/client/components/diceshock/ActiveTags";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
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
  const [allTags, setAllTags] = useState<
    Array<{
      id: string;
      title: { emoji: string; tx: string } | null;
      keywords: string | null;
      is_pinned: boolean | null;
      is_game_enabled: boolean | null;
    }>
  >([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
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

  const statusParams = useMemo(() => {
    if (status === "trash") return { isDeleted: true, isPublished: undefined };
    if (status === "published") return { isDeleted: false, isPublished: true };
    return { isDeleted: false, isPublished: undefined };
  }, [status]);

  const refreshTags = useCallback(async () => {
    try {
      // 获取已发布活动使用的标签（用于筛选）
      const data = await trpcClientDash.activeTags.get.query();
      setTags(data);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "获取标签失败");
    }
  }, [msg]);

  const refreshAllTags = useCallback(async () => {
    try {
      // 获取所有标签（活动版本：支持置顶标签和非约局标签）
      const data = await trpcClientDash.activeTags.getGameTags.query({
        search: tagSearchQuery || undefined,
        // 活动可以使用所有标签，包括置顶标签和非约局标签
      });
      setAllTags(data);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "获取所有标签失败");
    }
  }, [tagSearchQuery, msg]);

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
  }, [page, msg]);

  useEffect(() => {
    refreshTags();
    refreshAllTags();
  }, [refreshTags, refreshAllTags]);

  useEffect(() => {
    refreshActives();
  }, [refreshActives]);

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
    setCreateForm({ name: "", description: "", tags: [] });
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
      // 创建活动
      await trpcClientDash.active.mutation.mutate({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        tags: createForm.tags,
      });

      msg.success("活动已创建");
      createDialogRef.current?.close();
      setCreateForm({ name: "", description: "", tags: [] });
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

  const availableAllTags = useMemo(() => {
    const sorted = [...allTags].sort((a, b) => {
      // 置顶标签排在前面
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      // 然后按名称排序
      return (a.title?.tx ?? "").localeCompare(b.title?.tx ?? "");
    });
    return sorted;
  }, [allTags]);

  return (
    <main className="size-full">
      <div className="px-4 pt-4">
        <DashBackButton />
      </div>
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
                      {tagsForRow.length === 0 ? (
                        <span className="text-xs text-base-content/50">
                          暂无
                        </span>
                      ) : (
                        <ActiveTags tags={tagsForRow} size="sm" />
                      )}
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
              <div className="alert alert-info">
                <span>
                  活动可以使用所有标签（包括置顶标签和非约局标签）
                  {createForm.tags.length > 0 && (
                    <span className="ml-2">
                      ({createForm.tags.length} 个已选择)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {createForm.tags.map((tagId) => {
                  const tag = availableAllTags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  const title = tagTitle(tag.title);
                  return (
                    <div
                      key={tagId}
                      className="badge badge-lg gap-2 badge-primary"
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
              </div>
              <input
                type="text"
                className="input input-bordered w-full mb-2"
                placeholder="搜索标签（留空则显示所有标签）..."
                value={tagSearchQuery}
                onChange={(e) => {
                  setTagSearchQuery(e.target.value);
                }}
              />
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {availableAllTags
                  .filter((tag) => !createForm.tags.includes(tag.id))
                  .map((tag) => {
                    const title = tagTitle(tag.title);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          setCreateForm((prev) => ({
                            ...prev,
                            tags: [...prev.tags, tag.id],
                          }));
                        }}
                        className="badge badge-lg gap-2 badge-outline hover:badge-primary cursor-pointer"
                      >
                        <span>{title.emoji}</span>
                        {title.tx}
                      </button>
                    );
                  })}
              </div>
              {availableAllTags.length === 0 && (
                <div className="alert alert-warning">
                  <span>
                    {tagSearchQuery
                      ? "未找到匹配的标签"
                      : "暂无标签，请先在标签管理页面创建标签"}
                  </span>
                </div>
              )}
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
                <div className="alert alert-info">
                  <span>
                    活动可以使用所有标签（包括置顶标签和非约局标签）
                    {editForm.tags.length > 0 && (
                      <span className="ml-2">
                        ({editForm.tags.length} 个已选择)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editForm.tags.map((tagId) => {
                    const tag = availableAllTags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    const title = tagTitle(tag.title);
                    return (
                      <div
                        key={tagId}
                        className="badge badge-lg gap-2 badge-primary"
                      >
                        <span>{title.emoji}</span>
                        {title.tx}
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs p-0"
                          onClick={() =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    tags: prev.tags.filter((id) => id !== tagId),
                                  }
                                : prev,
                            )
                          }
                        >
                          <XIcon className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <input
                  type="text"
                  className="input input-bordered w-full mb-2"
                  placeholder="搜索标签（留空则显示所有标签）..."
                  value={tagSearchQuery}
                  onChange={(e) => {
                    setTagSearchQuery(e.target.value);
                  }}
                />
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {availableAllTags
                    .filter((tag) => !editForm.tags.includes(tag.id))
                    .map((tag) => {
                      const title = tagTitle(tag.title);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    tags: [...prev.tags, tag.id],
                                  }
                                : prev,
                            )
                          }
                          className="badge badge-lg gap-2 badge-outline hover:badge-primary cursor-pointer"
                        >
                          <span>{title.emoji}</span>
                          {title.tx}
                        </button>
                      );
                    })}
                </div>
                {availableAllTags.length === 0 && (
                  <div className="alert alert-warning">
                    <span>
                      {tagSearchQuery
                        ? "未找到匹配的标签"
                        : "暂无标签，请先在标签管理页面创建标签"}
                    </span>
                  </div>
                )}
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
