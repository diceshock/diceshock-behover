import { useApolloClient } from "@apollo/client";
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
import {
  MediaObjectsDocument,
  RemoveMediaObjectDocument,
  RenameMediaObjectDocument,
} from "@/client/graphql/__generated__";
import { useTranslation } from "@/client/hooks/useTranslation";
import { formatMessage } from "@/shared/i18n";
import { cfImageUrl, cfThumbUrl } from "@/shared/utils/cfImage";
import dayjs from "@/shared/utils/dayjs-config";

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

const SORT_OPTIONS: { labelKey: string; value: SortKey }[] = [
  { labelKey: "dashMedia.sortNewest", value: "uploaded-desc" },
  { labelKey: "dashMedia.sortOldest", value: "uploaded-asc" },
  { labelKey: "dashMedia.sortNameAsc", value: "name-asc" },
  { labelKey: "dashMedia.sortNameDesc", value: "name-desc" },
  { labelKey: "dashMedia.sortSizeAsc", value: "size-asc" },
  { labelKey: "dashMedia.sortSizeDesc", value: "size-desc" },
];

const TYPE_FILTERS: { labelKey: string; value: string }[] = [
  { labelKey: "dashMedia.all", value: "" },
  { labelKey: "dashMedia.images", value: "image/" },
  { labelKey: "dashMedia.videos", value: "video/" },
  { labelKey: "dashMedia.audio", value: "audio/" },
  { labelKey: "dashMedia.documents", value: "text/" },
  { labelKey: "dashMedia.pdf", value: "application/pdf" },
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
  const { t } = useTranslation();
  const client = useApolloClient();
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
      const { data } = await client.query({
        query: MediaObjectsDocument,
        variables: { input: { limit: 1000 } },
      });
      setAllItems(data.mediaObjects.items as MediaItem[]);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : t("dashMedia.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [client, msg, t]);

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
            const data = await res
              .json()
              .catch(() => ({ error: t("dashMedia.uploadFailed") }));
            msg.error(
              (data as { error?: string }).error ??
                formatMessage(t("dashMedia.uploadFileFailed"), {
                  name: file.name,
                }),
            );
          } else {
            successCount++;
          }
        } catch {
          msg.error(
            formatMessage(t("dashMedia.uploadFileFailed"), {
              name: file.name,
            }),
          );
        }
      }
      setUploading(false);
      if (successCount > 0) {
        msg.success(
          formatMessage(t("dashMedia.uploadSuccess"), { count: successCount }),
        );
        void fetchItems();
      }
    },
    [fetchItems, msg, t],
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
    (url: string, contentType: string) => {
      const copyUrl = contentType.startsWith("image/")
        ? cfImageUrl(url, { width: 1200, fit: "scale-down" })
        : url;
      try {
        navigator.clipboard.writeText(copyUrl);
        msg.success(t("dashMedia.linkCopied"));
      } catch {
        msg.error(t("dashMedia.clipboardDenied"));
      }
    },
    [msg, t],
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
      await client.mutate({
        mutation: RenameMediaObjectDocument,
        variables: {
          oldKey: pendingRename.key,
          newName: renameValue.trim(),
        },
      });
      msg.success(t("dashMedia.renameSuccess"));
      renameDialogRef.current?.close();
      setPendingRename(null);
      void fetchItems();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashMedia.renameFailed"),
      );
    } finally {
      setRenamePending(false);
    }
  }, [pendingRename, renameValue, client, fetchItems, msg, t]);

  const openDeleteDialog = useCallback((item: MediaItem) => {
    setPendingDelete(item);
    setTimeout(() => deleteDialogRef.current?.showModal(), 0);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeletePending(true);
    try {
      await client.mutate({
        mutation: RemoveMediaObjectDocument,
        variables: { key: pendingDelete.key },
      });
      msg.success(t("dashMedia.fileDeleted"));
      deleteDialogRef.current?.close();
      setPendingDelete(null);
      void fetchItems();
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashMedia.deleteFailed"),
      );
    } finally {
      setDeletePending(false);
    }
  }, [pendingDelete, client, fetchItems, msg, t]);

  return (
    <main className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 pt-4 flex items-center justify-between">
        <DashBackButton />
        <button
          type="button"
          className="btn btn-primary btn-sm gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <UploadSimpleIcon className="size-4" weight="bold" />
          {t("dashMedia.uploadFile")}
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
            <span className="text-sm text-base-content/60">
              {t("dashMedia.uploading")}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <CloudArrowUpIcon className="size-10 text-base-content/30" />
            <span className="text-sm text-base-content/60">
              {t("dashMedia.dropHint")}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 flex flex-wrap items-center gap-2">
        <label className="input input-sm input-bordered flex items-center gap-2">
          <MagnifyingGlassIcon className="size-4 text-base-content/40" />
          <input
            type="text"
            placeholder={t("dashMedia.searchPlaceholder")}
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
              {t(f.labelKey)}
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
              {t(s.labelKey)}
            </option>
          ))}
        </select>

        <span className="text-xs text-base-content/50 ml-auto">
          {formatMessage(t("dashMedia.fileCount"), {
            count: filteredItems.length,
          })}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-4 pt-4 pb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-dots loading-md" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-base-content/50">
            {t("dashMedia.noMedia")}
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
                      src={cfThumbUrl(item.url, 300)}
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
                      title={t("dashMedia.copyLink")}
                      onClick={() => handleCopy(item.url, item.contentType)}
                    >
                      <CopyIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-square"
                      title={t("dashMedia.rename")}
                      onClick={() => openRenameDialog(item)}
                    >
                      <PencilSimpleIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-square text-error"
                      title={t("dashMedia.delete")}
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
            <h3 className="font-bold text-lg mb-4">
              {t("dashMedia.renameFile")}
            </h3>
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
                {t("dashMedia.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void confirmRename()}
                disabled={renamePending || !renameValue.trim()}
              >
                {renamePending ? t("dashMedia.saving") : t("dashMedia.save")}
              </button>
            </div>
          </div>
        )}
      </dialog>

      <dialog ref={deleteDialogRef} className="modal">
        {pendingDelete && (
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {t("dashMedia.confirmDeleteTitle")}
            </h3>
            <p>{t("dashMedia.confirmDeleteDesc")}</p>
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm">
                <strong>{t("dashMedia.fileNameLabel")}</strong>{" "}
                {pendingDelete.name}
              </p>
              <p className="text-sm">
                <strong>{t("dashMedia.sizeLabel")}</strong>{" "}
                {formatSize(pendingDelete.size)}
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
                {t("dashMedia.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={() => void confirmDelete()}
                disabled={deletePending}
              >
                {deletePending
                  ? t("dashMedia.deleting")
                  : t("dashMedia.confirmDelete")}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
