import {
  CloudArrowUpIcon,
  CopyIcon,
  FileIcon,
  FilePdfIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  MusicNoteIcon,
  PencilSimpleIcon,
  TrashIcon,
  UploadSimpleIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import dayjs from "@/shared/utils/dayjs-config";
import { trpcClientDash } from "@/shared/utils/trpc";

type MediaItem = {
  key: string;
  name: string;
  contentType: string;
  size: number;
  uploaded: string;
  url: string;
};

type SortKey =
  | "uploaded-desc"
  | "uploaded-asc"
  | "name-asc"
  | "name-desc"
  | "size-asc"
  | "size-desc";

export const Route = createFileRoute("/dash/media")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
    type: (search.type as string) ?? "",
    sort: [
      "uploaded-desc",
      "uploaded-asc",
      "name-asc",
      "name-desc",
      "size-asc",
      "size-desc",
    ].includes(search.sort as string)
      ? (search.sort as SortKey)
      : "uploaded-desc",
  }),
});

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: "最新上传", value: "uploaded-desc" },
  { label: "最早上传", value: "uploaded-asc" },
  { label: "名称 A-Z", value: "name-asc" },
  { label: "名称 Z-A", value: "name-desc" },
  { label: "大小 ↑", value: "size-asc" },
  { label: "大小 ↓", value: "size-desc" },
];

const TYPE_FILTERS = [
  { label: "全部", value: "" },
  { label: "图片", value: "image/" },
  { label: "视频", value: "video/" },
  { label: "音频", value: "audio/" },
  { label: "文档", value: "text/" },
  { label: "PDF", value: "application/pdf" },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatTime(val: string): string {
  if (!val) return "—";
  try {
    const d = dayjs.tz(val, "Asia/Shanghai");
    return d.isValid() ? d.format("YYYY/MM/DD HH:mm") : "—";
  } catch {
    return "—";
  }
}

function FileTypeIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith("video/"))
    return <VideoCameraIcon className="size-12 text-base-content/30" />;
  if (contentType.startsWith("audio/"))
    return <MusicNoteIcon className="size-12 text-base-content/30" />;
  if (contentType === "application/pdf")
    return <FilePdfIcon className="size-12 text-base-content/30" />;
  if (contentType.startsWith("text/"))
    return <FileTextIcon className="size-12 text-base-content/30" />;
  return <FileIcon className="size-12 text-base-content/30" />;
}

function sortItems(items: MediaItem[], sortKey: SortKey): MediaItem[] {
  const sorted = [...items];
  switch (sortKey) {
    case "uploaded-desc":
      return sorted.sort((a, b) => b.uploaded.localeCompare(a.uploaded));
    case "uploaded-asc":
      return sorted.sort((a, b) => a.uploaded.localeCompare(b.uploaded));
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "size-asc":
      return sorted.sort((a, b) => a.size - b.size);
    case "size-desc":
      return sorted.sort((a, b) => b.size - a.size);
  }
}

function RouteComponent() {
  const msg = useMsg();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  const [allItems, setAllItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const { q, type, sort } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const setSearch = useCallback(
    (updates: Partial<{ q: string; type: string; sort: SortKey }>) =>
      navigate({ search: (prev) => ({ ...prev, ...updates }), replace: true }),
    [navigate],
  );

  const [pendingRename, setPendingRename] = useState<MediaItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, setRenamePending] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const [dragOver, setDragOver] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await trpcClientDash.mediaManagement.list.query({
        limit: 1000,
      });
      setAllItems(result.items);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "获取媒体列表失败");
    } finally {
      setLoading(false);
    }
  }, [msg]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const filteredItems = useMemo(() => {
    let result = allItems;
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(lower));
    }
    if (type) {
      result = result.filter((i) => i.contentType.startsWith(type));
    }
    return sortItems(result, sort);
  }, [allItems, q, type, sort]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/edge/media/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({ error: "上传失败" }));
            msg.error(
              (data as { error?: string }).error ?? `上传 ${file.name} 失败`,
            );
          } else {
            successCount++;
          }
        } catch {
          msg.error(`上传 ${file.name} 失败`);
        }
      }
      setUploading(false);
      if (successCount > 0) {
        msg.success(`成功上传 ${successCount} 个文件`);
        void fetchItems();
      }
    },
    [fetchItems, msg],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        void uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void uploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [uploadFiles],
  );

  const handleCopy = useCallback(
    (url: string) => {
      try {
        navigator.clipboard.writeText(url);
        msg.success("链接已复制");
      } catch {
        msg.error("没有剪贴板访问权限");
      }
    },
    [msg],
  );

  const openRenameDialog = useCallback((item: MediaItem) => {
    setPendingRename(item);
    setRenameValue(item.name);
    setTimeout(() => renameDialogRef.current?.showModal(), 0);
  }, []);

  const confirmRename = useCallback(async () => {
    if (!pendingRename || !renameValue.trim()) return;
    setRenamePending(true);
    try {
      await trpcClientDash.mediaManagement.rename.mutate({
        oldKey: pendingRename.key,
        newName: renameValue.trim(),
      });
      msg.success("重命名成功");
      renameDialogRef.current?.close();
      setPendingRename(null);
      void fetchItems();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "重命名失败");
    } finally {
      setRenamePending(false);
    }
  }, [pendingRename, renameValue, fetchItems, msg]);

  const openDeleteDialog = useCallback((item: MediaItem) => {
    setPendingDelete(item);
    setTimeout(() => deleteDialogRef.current?.showModal(), 0);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeletePending(true);
    try {
      await trpcClientDash.mediaManagement.remove.mutate({
        key: pendingDelete.key,
      });
      msg.success("文件已删除");
      deleteDialogRef.current?.close();
      setPendingDelete(null);
      void fetchItems();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletePending(false);
    }
  }, [pendingDelete, fetchItems, msg]);

  return (
    <main className="size-full flex flex-col">
      <div className="px-4 pt-4 flex items-center justify-between">
        <DashBackButton />
        <button
          type="button"
          className="btn btn-primary btn-sm gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <UploadSimpleIcon className="size-4" weight="bold" />
          上传文件
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div
        className={`mx-4 mt-4 border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-base-300 hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <span className="loading loading-spinner loading-md text-primary" />
            <span className="text-sm text-base-content/60">上传中...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <CloudArrowUpIcon className="size-10 text-base-content/30" />
            <span className="text-sm text-base-content/60">
              拖拽文件到此处，或点击选择文件
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 flex flex-wrap items-center gap-2">
        <label className="input input-sm input-bordered flex items-center gap-2">
          <MagnifyingGlassIcon className="size-4 text-base-content/40" />
          <input
            type="text"
            placeholder="搜索文件名..."
            className="grow w-32"
            value={q}
            onChange={(e) => setSearch({ q: e.target.value })}
          />
        </label>

        <select
          className="select select-sm select-bordered"
          value={type}
          onChange={(e) => setSearch({ type: e.target.value })}
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          className="select select-sm select-bordered"
          value={sort}
          onChange={(e) => setSearch({ sort: e.target.value as SortKey })}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <span className="text-xs text-base-content/50 ml-auto">
          共 {filteredItems.length} 个文件
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-4 pt-4 pb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-dots loading-md" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-base-content/50">
            暂无媒体文件
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.key}
                className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <figure className="h-32 bg-base-200 flex items-center justify-center overflow-hidden">
                  {item.contentType.startsWith("image/") ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <FileTypeIcon contentType={item.contentType} />
                  )}
                </figure>
                <div className="card-body p-3 gap-1">
                  <h3
                    className="text-sm font-medium truncate"
                    title={item.name}
                  >
                    {item.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-base-content/50">
                      {formatSize(item.size)}
                    </span>
                    <span className="text-xs text-base-content/40">
                      {formatTime(item.uploaded)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-square"
                      title="复制链接"
                      onClick={() => handleCopy(item.url)}
                    >
                      <CopyIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-square"
                      title="重命名"
                      onClick={() => openRenameDialog(item)}
                    >
                      <PencilSimpleIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-square text-error"
                      title="删除"
                      onClick={() => openDeleteDialog(item)}
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <dialog ref={renameDialogRef} className="modal">
        {pendingRename && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">重命名文件</h3>
            <input
              type="text"
              className="input input-bordered w-full"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmRename();
              }}
            />
            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  renameDialogRef.current?.close();
                  setPendingRename(null);
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void confirmRename()}
                disabled={renamePending || !renameValue.trim()}
              >
                {renamePending ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        )}
      </dialog>

      <dialog ref={deleteDialogRef} className="modal">
        {pendingDelete && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">确认删除文件</h3>
            <p>删除后此操作不可撤销。</p>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>文件名:</strong> {pendingDelete.name}
              </p>
              <p className="text-sm">
                <strong>大小:</strong> {formatSize(pendingDelete.size)}
              </p>
            </div>
            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  deleteDialogRef.current?.close();
                  setTimeout(() => setPendingDelete(null), 100);
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={() => void confirmDelete()}
                disabled={deletePending}
              >
                {deletePending ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
