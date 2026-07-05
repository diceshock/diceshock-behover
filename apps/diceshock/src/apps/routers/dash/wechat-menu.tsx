import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  CaretUpIcon,
  CloudArrowUpIcon,
  CopyIcon,
  DotsSixVerticalIcon,
  FloppyDiskIcon,
  GlobeIcon,
  LinkIcon,
  ListPlusIcon,
  PlusIcon,
  TrashIcon,
  TranslateIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  type WechatMenuSnapshotsQuery,
  usePublishWechatMenuSnapshotMutation,
  useRestoreWechatMenuSnapshotMutation,
  useSaveWechatMenuSnapshotMutation,
  useTranslateWechatMenuTextMutation,
  useWechatMenuDraftQuery,
  useWechatMenuSnapshotsQuery,
  useWechatMenuVariablesQuery,
} from "@/client/graphql/__generated__";
import { useTranslation } from "@/client/hooks/useTranslation";
import { formatMessage } from "@/shared/i18n";

export const Route = createFileRoute("/dash/wechat-menu")({
  component: WechatMenuPage,
});

interface WechatMenuItem {
  id: string;
  type: "view" | "click";
  name: string;
  url?: string;
  key?: string;
  link_target?: string;
  notification?: { message: string; translations: Record<string, string> };
}

interface WechatMenuCategory {
  id: string;
  name: string;
  items: WechatMenuItem[];
}

interface WechatMenuData {
  buttons: Array<WechatMenuItem | WechatMenuCategory>;
}

type ButtonEntry = WechatMenuItem | WechatMenuCategory;

function isCategory(entry: ButtonEntry): entry is WechatMenuCategory {
  return "items" in entry;
}

function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const SUPPORTED_LOCALES = ["zh_Hant", "en", "ja", "ru", "es", "pt", "fr", "de"] as const;
const LOCALE_NAMES: Record<string, string> = {
  zh_Hans: "简体中文", zh_Hant: "繁體中文", en: "English", ja: "日本語",
  ru: "Русский", es: "Español", pt: "Português", fr: "Français", de: "Deutsch",
};

const ROUTE_OPTIONS = [
  { value: "/", labelKey: "dashWechatMenu.linkTarget.home" },
  { value: "/inventory", labelKey: "dashWechatMenu.routes.inventory" },
  { value: "/riichi", labelKey: "dashWechatMenu.routes.riichi" },
  { value: "/actives", labelKey: "dashWechatMenu.routes.actives" },
  { value: "/me", labelKey: "dashWechatMenu.routes.me" },
  { value: "/contact-us", labelKey: "dashWechatMenu.routes.contactUs" },
  { value: "/diceshock-agents", labelKey: "dashWechatMenu.routes.agents" },
] as const;

const EMPTY_DATA: WechatMenuData = { buttons: [] };

function parseMenuData(raw: string | null | undefined): WechatMenuData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.buttons)) return parsed as WechatMenuData;
  } catch (e) { console.error("[wechat-menu] parseMenuData error", e); }
  return null;
}

function formatTime(val: string | null | undefined): string {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function WechatMenuPage() {
  const msg = useMsg();
  const { t } = useTranslation();

  const [data, setData] = useState<WechatMenuData>(EMPTY_DATA);
  const [savedData, setSavedData] = useState<WechatMenuData>(EMPTY_DATA);
  const [snapshotName, setSnapshotName] = useState("");

  const { data: qlData, loading } = useWechatMenuDraftQuery();
  const { data: snapshotsData } = useWechatMenuSnapshotsQuery();
  const { data: variablesData } = useWechatMenuVariablesQuery();
  const [saveSnapshot] = useSaveWechatMenuSnapshotMutation();
  const [publishSnapshot] = usePublishWechatMenuSnapshotMutation();
  const [restoreSnapshot] = useRestoreWechatMenuSnapshotMutation();
  const [translateText] = useTranslateWechatMenuTextMutation();

  const snapshots: WechatMenuSnapshotsQuery["wechatMenuSnapshots"] = snapshotsData?.wechatMenuSnapshots ?? [];
  const variables = variablesData?.wechatMenuVariables ?? [];

  useEffect(() => {
    if (qlData?.wechatMenuDraft) {
      const parsed = parseMenuData(qlData.wechatMenuDraft.data);
      const d = parsed ?? EMPTY_DATA;
      setData(d);
      setSavedData(d);
      setSnapshotName(qlData.wechatMenuDraft.snapshotName ?? "");
    }
  }, [qlData]);

  const hasChanges = !isEqual(data, savedData);
  const hasDraft = snapshots.some((s) => s.status === "DRAFT");

  const updateButton = useCallback((index: number, updated: ButtonEntry) => {
    setData((prev) => ({
      ...prev,
      buttons: prev.buttons.map((b, i) => (i === index ? updated : b)),
    }));
  }, []);

  const removeButton = useCallback((index: number) => {
    setData((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index),
    }));
  }, []);

  const moveButton = useCallback((index: number, direction: -1 | 1) => {
    setData((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.buttons.length) return prev;
      const buttons = [...prev.buttons];
      [buttons[index], buttons[target]] = [buttons[target]!, buttons[index]!];
      return { ...prev, buttons };
    });
  }, []);

  const addItem = () => {
    const newItem: WechatMenuItem = { id: nanoid(8), type: "view", name: "", link_target: "/" };
    setData((prev) => ({ ...prev, buttons: [...prev.buttons, newItem] }));
  };

  const addCategory = () => {
    const newCat: WechatMenuCategory = { id: nanoid(8), name: "", items: [] };
    setData((prev) => ({ ...prev, buttons: [...prev.buttons, newCat] }));
  };

  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const handleDragStart = (idx: number) => { dragItemRef.current = idx; };

  const handleDrop = (targetIdx: number) => {
    setDragOverIdx(null);
    const sourceIdx = dragItemRef.current;
    dragItemRef.current = null;
    if (sourceIdx == null || sourceIdx === targetIdx) return;
    setData((prev) => {
      const buttons = [...prev.buttons];
      const [moved] = buttons.splice(sourceIdx, 1);
      if (!moved) return prev;
      buttons.splice(targetIdx, 0, moved);
      return { ...prev, buttons };
    });
  };

  const [savePending, setSavePending] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const [restorePending, setRestorePending] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);

  const openDeleteDialog = (idx: number) => {
    setPendingDeleteIdx(idx);
    setTimeout(() => deleteDialogRef.current?.showModal(), 0);
  };

  const confirmDelete = () => {
    if (pendingDeleteIdx != null) {
      removeButton(pendingDeleteIdx);
      deleteDialogRef.current?.close();
      setPendingDeleteIdx(null);
    }
  };

  const handleSaveDraft = async () => {
    setSavePending(true);
    try {
      await saveSnapshot({
        variables: { input: { name: snapshotName.trim() || t("dashWechatMenu.title"), data: JSON.stringify(data) } },
      });
      setSavedData(data);
      msg.success(t("dashWechatMenu.messages.draftSaved"));
    } catch (err) {
      msg.error(err instanceof Error ? err.message : t("dashWechatMenu.errors.saveFailed"));
    } finally {
      setSavePending(false);
    }
  };

  const handlePublish = async () => {
    setPublishPending(true);
    try {
      const result = await publishSnapshot();
      if (result.data?.publishWechatMenuSnapshot?.error) {
        msg.error(result.data.publishWechatMenuSnapshot.error);
      } else {
        msg.success(t("dashWechatMenu.messages.published"));
      }
    } catch (err) {
      msg.error(err instanceof Error ? err.message : t("dashWechatMenu.errors.publishFailed"));
    } finally {
      setPublishPending(false);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    setRestorePending(snapshotId);
    try {
      const result = await restoreSnapshot({ variables: { id: snapshotId } });
      const parsed = parseMenuData(result.data?.restoreWechatMenuSnapshot?.data);
      const d = parsed ?? EMPTY_DATA;
      setData(d);
      setSavedData(d);
      msg.success(t("dashWechatMenu.messages.restored"));
    } catch (err) {
      msg.error(err instanceof Error ? err.message : t("dashWechatMenu.errors.restoreFailed"));
    } finally {
      setRestorePending(null);
    }
  };

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  return (
    <main className="size-full overflow-y-auto">

      <div className="mx-auto w-full max-w-4xl px-4 pb-28 space-y-6 mt-4">
        {data.buttons.length === 0 ? (
          <div className="py-12 text-center text-base-content/60">{t("dashWechatMenu.noItems")}</div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.buttons.map((entry, idx) => (
              <div
                key={entry.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(idx); }}
                className={`card bg-base-100 shadow-sm transition-all ${dragOverIdx === idx ? "ring-2 ring-primary" : ""}`}
                style={{ opacity: dragOverIdx === idx ? 0.6 : 1 }}
              >
                <div className="card-body p-0">
                  <div className="flex items-center px-3 py-2 gap-2 border-b border-base-200 bg-base-200/30">
                    <div className="cursor-grab active:cursor-grabbing text-base-content/40 hover:text-base-content/70">
                      <DotsSixVerticalIcon className="size-4" />
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs gap-1"
                        disabled={idx === 0}
                        onClick={() => moveButton(idx, -1)}
                        title={t("dashWechatMenu.moveUp")}
                      >
                        <CaretUpIcon className="size-3.5" />
                        {t("dashWechatMenu.moveUp")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs gap-1"
                        disabled={idx === data.buttons.length - 1}
                        onClick={() => moveButton(idx, 1)}
                        title={t("dashWechatMenu.moveDown")}
                      >
                        <CaretDownIcon className="size-3.5" />
                        {t("dashWechatMenu.moveDown")}
                      </button>
                      <div className="divider divider-horizontal mx-0.5 h-4" />
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs gap-1 text-error"
                        onClick={() => openDeleteDialog(idx)}
                        title={t("dashWechatMenu.confirmDelete")}
                      >
                        <TrashIcon className="size-3.5" />
                        {t("dashWechatMenu.delete")}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    {isCategory(entry) ? (
                      <CategoryEditor
                        category={entry}
                        onChange={(updated) => updateButton(idx, updated)}
                        variables={variables}
                        translateText={translateText}
                        t={t}
                        msg={msg}
                      />
                    ) : (
                      <ItemEditor
                        item={entry}
                        onChange={(updated) => updateButton(idx, updated)}
                        variables={variables}
                        translateText={translateText}
                        t={t}
                        msg={msg}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-sm btn-primary gap-2" onClick={addItem}>
            <PlusIcon className="size-4" />
            {t("dashWechatMenu.addButton")}
          </button>
          <button type="button" className="btn btn-sm btn-outline gap-2" onClick={addCategory}>
            <ListPlusIcon className="size-4" />
            {t("dashWechatMenu.addCategory")}
          </button>
        </div>

        {/* History panel */}
        <div className="mt-8">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-semibold text-base-content/70 hover:text-base-content transition-colors"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <CaretDownIcon
              className={`size-4 transition-transform ${historyOpen ? "rotate-0" : "-rotate-90"}`}
            />
            {formatMessage(t("dashWechatMenu.historyWithCount"), { count: snapshots.length })}
          </button>

          {historyOpen && (
            <div className="mt-3 flex flex-col gap-2">
              {snapshots.length === 0 ? (
                <div className="py-6 text-center text-base-content/50 text-sm">
                  {t("dashWechatMenu.history")}
                </div>
              ) : (
                snapshots.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-base-200 rounded-lg px-4 py-3 gap-2 sm:gap-4"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={`badge badge-sm shrink-0 ${s.status === "PUBLISHED" ? "badge-success" : "badge-ghost"}`}
                        >
                          {s.status === "PUBLISHED" ? t("dashWechatMenu.published") : t("dashWechatMenu.draft")}
                        </span>
                        <span className="text-sm font-medium truncate">{s.name}</span>
                        <span className="text-xs text-base-content/40 whitespace-nowrap">
                          {formatTime(s.createdAt)}
                        </span>
                      </div>
                      {s.summary && (
                        <span className="text-xs text-base-content/50 line-clamp-2">{s.summary}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost gap-1"
                        onClick={() => void handleRestore(s.id)}
                        disabled={restorePending === s.id}
                      >
                        <ArrowCounterClockwiseIcon className="size-3.5" />
                        {restorePending === s.id ? t("dashWechatMenu.restoring") : t("dashWechatMenu.restore")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-16 bg-base-100 border-t border-base-200 px-4 py-2 flex items-center justify-end gap-2 z-30">
        {hasChanges && (
          <span className="text-xs text-warning mr-auto">{t("dashWechatMenu.unsavedChanges")}</span>
        )}
        <button
          type="button"
          className="btn btn-sm gap-2"
          onClick={() => void handleSaveDraft()}
          disabled={savePending || !hasChanges}
        >
          <FloppyDiskIcon className="size-4" />
          {savePending ? t("dashWechatMenu.saving") : t("dashWechatMenu.save")}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary gap-2"
          onClick={() => void handlePublish()}
          disabled={publishPending || hasChanges || !hasDraft}
          title={hasChanges ? t("dashWechatMenu.saveDraftFirst") : !hasDraft ? t("dashWechatMenu.noDraftToPublish") : ""}
        >
          <CloudArrowUpIcon className="size-4" />
          {publishPending ? t("dashWechatMenu.publishing") : t("dashWechatMenu.publish")}
        </button>
      </div>

      {/* Delete confirmation dialog */}
      <dialog ref={deleteDialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">{t("dashWechatMenu.confirmDelete")}</h3>
          <div className="modal-action mt-6">
            <button
              type="button"
              className="btn"
              onClick={() => { deleteDialogRef.current?.close(); setPendingDeleteIdx(null); }}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-error" onClick={confirmDelete}>
              <TrashIcon className="size-4" />
              {t("dashWechatMenu.confirmDelete")}
            </button>
          </div>
        </div>
      </dialog>
    </main>
  );
}

function ItemEditor({
  item,
  onChange,
  variables,
  translateText,
  t,
  msg,
}: {
  item: WechatMenuItem;
  onChange: (updated: WechatMenuItem) => void;
  variables: Array<{ id: string; label: string; description?: string | null; example?: string | null }>;
  translateText: ReturnType<typeof useTranslateWechatMenuTextMutation>[0];
  t: ReturnType<typeof useTranslation>["t"];
  msg: ReturnType<typeof useMsg>;
}) {
  const [translating, setTranslating] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);
  const [variablePickerOpen, setVariablePickerOpen] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const handleTranslate = async () => {
    const message = item.notification?.message;
    if (!message?.trim()) return;
    setTranslating(true);
    try {
      const result = await translateText({
        variables: { text: message, targetLocales: [...SUPPORTED_LOCALES] },
      });
      const translations: Record<string, string> = { ...(item.notification?.translations ?? {}) };
      for (const tr of result.data?.translateWechatMenuText?.translations ?? []) {
        translations[tr.locale] = tr.text;
      }
      onChange({ ...item, notification: { message, translations } });
      setShowTranslations(true);
      msg.success(t("dashWechatMenu.messages.translateDone"));
    } catch {
      msg.error(t("dashWechatMenu.errors.loadFailed"));
    } finally {
      setTranslating(false);
    }
  };

  const insertVariable = (varId: string) => {
    const textarea = messageRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = item.notification?.message ?? "";
    const insert = `{{${varId}}}`;
    const newMsg = current.slice(0, start) + insert + current.slice(end);
    onChange({
      ...item,
      notification: { ...(item.notification ?? { message: "", translations: {} }), message: newMsg },
    });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insert.length, start + insert.length);
    }, 0);
  };

  const isCustomUrl = item.type === "view" && item.link_target != null &&
    !ROUTE_OPTIONS.some((r) => r.value === item.link_target);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          className="input input-bordered input-sm w-40"
          placeholder={t("dashWechatMenu.addButton")}
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
        />
        <select
          className="select select-bordered select-sm"
          value={item.type}
          onChange={(e) => onChange({
            ...item,
            type: e.target.value as "view" | "click",
            link_target: e.target.value === "view" ? "/" : undefined,
            notification: e.target.value === "click" ? { message: "", translations: {} } : undefined,
          })}
        >
          <option value="view">{t("dashWechatMenu.itemType.view")}</option>
          <option value="click">{t("dashWechatMenu.itemType.click")}</option>
        </select>
      </div>

      {item.type === "view" && (
        <div className="flex flex-wrap items-center gap-2">
          <LinkIcon className="size-4 text-base-content/60" />
          <select
            className="select select-bordered select-sm"
            value={isCustomUrl ? "__custom__" : (item.link_target ?? "/")}
            onChange={(e) => {
              if (e.target.value === "__custom__") {
                onChange({ ...item, link_target: "https://" });
              } else {
                onChange({ ...item, link_target: e.target.value });
              }
            }}
          >
            {ROUTE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{t(r.labelKey)}</option>
            ))}
            <option value="__custom__">{t("dashWechatMenu.linkTarget.custom")}</option>
          </select>
          {isCustomUrl && (
            <input
              type="url"
              className="input input-bordered input-sm flex-1 min-w-[200px]"
              value={item.link_target ?? ""}
              onChange={(e) => onChange({ ...item, link_target: e.target.value })}
              placeholder="https://..."
            />
          )}
        </div>
      )}

      {item.type === "click" && (
        <div className="flex flex-col gap-2 pl-2 border-l-2 border-base-300">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-base-content/60">
              {t("dashWechatMenu.notification.message")}
            </span>
            {variables.length > 0 && (
              <button
                type="button"
                className="btn btn-xs btn-ghost gap-1"
                onClick={() => setVariablePickerOpen(true)}
              >
                <GlobeIcon className="size-3" />
                {t("dashWechatMenu.notification.insertVariable")}
              </button>
            )}
            {variablePickerOpen && (
              <VariablePickerDialog
                variables={variables}
                onInsert={(varId) => { insertVariable(varId); setVariablePickerOpen(false); }}
                onClose={() => setVariablePickerOpen(false)}
                t={t}
                msg={msg}
              />
            )}
          </div>
          <textarea
            ref={messageRef}
            className="textarea textarea-bordered text-sm min-h-[60px]"
            value={item.notification?.message ?? ""}
            onChange={(e) => onChange({
              ...item,
              notification: { ...(item.notification ?? { message: "", translations: {} }), message: e.target.value },
            })}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-xs btn-outline gap-1"
              onClick={() => void handleTranslate()}
              disabled={translating || !item.notification?.message?.trim()}
            >
              <TranslateIcon className="size-3.5" />
              {translating ? t("dashWechatMenu.notification.translating") : t("dashWechatMenu.notification.translate")}
            </button>
            {item.notification?.translations && Object.keys(item.notification.translations).length > 0 && (
              <button
                type="button"
                className="btn btn-xs btn-ghost gap-1"
                onClick={() => setShowTranslations(!showTranslations)}
              >
                <CaretDownIcon className={`size-3 transition-transform ${showTranslations ? "rotate-0" : "-rotate-90"}`} />
                {t("dashWechatMenu.notification.translations")}
              </button>
            )}
          </div>
          {showTranslations && item.notification?.translations && (
            <div className="flex flex-col gap-1.5 mt-1">
              {SUPPORTED_LOCALES.map((locale) => (
                <div key={locale} className="flex items-center gap-2">
                  <span className="text-xs w-16 shrink-0 text-base-content/60">{LOCALE_NAMES[locale]}</span>
                  <input
                    type="text"
                    className="input input-bordered input-xs flex-1"
                    value={item.notification?.translations?.[locale] ?? ""}
                    onChange={(e) => {
                      const translations = { ...(item.notification?.translations ?? {}), [locale]: e.target.value };
                      onChange({ ...item, notification: { ...(item.notification ?? { message: "" }), translations } });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryEditor({
  category,
  onChange,
  variables,
  translateText,
  t,
  msg,
}: {
  category: WechatMenuCategory;
  onChange: (updated: WechatMenuCategory) => void;
  variables: Array<{ id: string; label: string; description?: string | null; example?: string | null }>;
  translateText: ReturnType<typeof useTranslateWechatMenuTextMutation>[0];
  t: ReturnType<typeof useTranslation>["t"];
  msg: ReturnType<typeof useMsg>;
}) {
  const addSubItem = () => {
    const newItem: WechatMenuItem = { id: nanoid(8), type: "view", name: "", link_target: "/" };
    onChange({ ...category, items: [...category.items, newItem] });
  };

  const updateSubItem = (idx: number, updated: WechatMenuItem) => {
    onChange({ ...category, items: category.items.map((item, i) => (i === idx ? updated : item)) });
  };

  const removeSubItem = (idx: number) => {
    onChange({ ...category, items: category.items.filter((_, i) => i !== idx) });
  };

  const moveSubItem = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= category.items.length) return;
    const items = [...category.items];
    [items[idx], items[target]] = [items[target]!, items[idx]!];
    onChange({ ...category, items });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="badge badge-outline badge-sm">{t("dashWechatMenu.category.title")}</span>
        <input
          type="text"
          className="input input-bordered input-sm w-40"
          placeholder={t("dashWechatMenu.category.title")}
          value={category.name}
          onChange={(e) => onChange({ ...category, name: e.target.value })}
        />
      </div>

      {category.items.length === 0 ? (
        <div className="text-xs text-base-content/50 pl-4">{t("dashWechatMenu.category.empty")}</div>
      ) : (
        <div className="flex flex-col gap-2 pl-4 border-l-2 border-base-300">
          {category.items.map((item, idx) => (
            <div key={item.id} className="rounded-lg border border-base-200 overflow-hidden">
              <div className="p-2.5">
                <ItemEditor
                  item={item}
                  onChange={(updated) => updateSubItem(idx, updated)}
                  variables={variables}
                  translateText={translateText}
                  t={t}
                  msg={msg}
                />
              </div>
              <div className="flex items-center gap-1 px-2 py-1.5 border-t border-base-200 bg-base-200/30">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs gap-1"
                  disabled={idx === 0}
                  onClick={() => moveSubItem(idx, -1)}
                >
                  <CaretUpIcon className="size-3" />
                  {t("dashWechatMenu.moveUp")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs gap-1"
                  disabled={idx === category.items.length - 1}
                  onClick={() => moveSubItem(idx, 1)}
                >
                  <CaretDownIcon className="size-3" />
                  {t("dashWechatMenu.moveDown")}
                </button>
                <div className="divider divider-horizontal mx-0.5 h-3" />
                <button
                  type="button"
                  className="btn btn-ghost btn-xs gap-1 text-error"
                  onClick={() => removeSubItem(idx)}
                >
                  <TrashIcon className="size-3" />
                  {t("dashWechatMenu.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn btn-xs btn-ghost gap-1 self-start ml-4" onClick={addSubItem}>
        <PlusIcon className="size-3.5" />
        {t("dashWechatMenu.category.addItem")}
      </button>
    </div>
  );
}

// ─── Variable categories for the split-panel picker ─────────────────────────

const VARIABLE_CATEGORIES: Array<{ key: string; labelKey: string; prefixes: string[] }> = [
  { key: "user", labelKey: "dashWechatMenu.variableCategory.user", prefixes: ["user_"] },
  { key: "store", labelKey: "dashWechatMenu.variableCategory.store", prefixes: ["store_"] },
  { key: "system", labelKey: "dashWechatMenu.variableCategory.system", prefixes: ["system_"] },
  { key: "activity", labelKey: "dashWechatMenu.variableCategory.activity", prefixes: ["active_", "next_"] },
];

function VariablePickerDialog({
  variables,
  onInsert,
  onClose,
  t,
  msg,
}: {
  variables: Array<{ id: string; label: string; description?: string | null; example?: string | null }>;
  onInsert: (varId: string) => void;
  onClose: () => void;
  t: ReturnType<typeof useTranslation>["t"];
  msg: ReturnType<typeof useMsg>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeCategory, setActiveCategory] = useState(VARIABLE_CATEGORIES[0]!.key);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, typeof variables> = {};
    for (const cat of VARIABLE_CATEGORIES) {
      map[cat.key] = variables.filter((v) => cat.prefixes.some((p) => v.id.startsWith(p)));
    }
    return map;
  }, [variables]);

  const handleCopy = (varId: string) => {
    navigator.clipboard.writeText(`{{${varId}}}`);
    msg.success(t("dashWechatMenu.variablePicker.copied"));
  };

  const handleClose = () => {
    dialogRef.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={handleClose}
      onClick={(e) => { if (e.target === dialogRef.current) handleClose(); }}
    >
      <div className="modal-box max-w-2xl w-[95vw] p-0 flex flex-col max-h-[80vh] sm:max-h-[28rem]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-200">
          <h3 className="font-bold text-base">{t("dashWechatMenu.variablePicker.title")}</h3>
          <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={handleClose}>✕</button>
        </div>
        {/* Category tabs - horizontal on mobile, vertical nav on sm+ */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          <nav className="flex sm:flex-col sm:w-28 shrink-0 border-b sm:border-b-0 sm:border-r border-base-200 overflow-x-auto sm:overflow-y-auto bg-base-200/50 sm:py-2">
            {VARIABLE_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={`whitespace-nowrap px-3 py-2 sm:px-4 text-sm transition-colors ${
                  activeCategory === cat.key
                    ? "bg-primary/10 text-primary font-semibold border-b-2 sm:border-b-0 sm:border-r-2 border-primary"
                    : "hover:bg-base-200"
                } sm:w-full sm:text-left`}
                onClick={() => setActiveCategory(cat.key)}
              >
                {t(cat.labelKey)}
              </button>
            ))}
          </nav>
          {/* Variable list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(grouped[activeCategory] ?? []).map((v) => (
              <div key={v.id} className="rounded-lg border border-base-200 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <code className="text-xs font-mono bg-base-200 px-1.5 py-0.5 rounded">{`{{${v.id}}}`}</code>
                  <span className="text-sm font-medium">{v.label}</span>
                </div>
                {v.description && (
                  <p className="text-xs text-base-content/60">{v.description}</p>
                )}
                {v.example && (
                  <p className="text-xs text-base-content/40">
                    {t("dashWechatMenu.variablePicker.example")}: <code className="bg-base-200 px-1 rounded">{v.example}</code>
                  </p>
                )}
                <div className="flex flex-wrap gap-1 pt-1 border-t border-base-200">
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost gap-1"
                    onClick={() => handleCopy(v.id)}
                  >
                    <CopyIcon className="size-3.5" />
                    {t("dashWechatMenu.variablePicker.copy")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-primary gap-1"
                    onClick={() => onInsert(v.id)}
                  >
                    <PlusIcon className="size-3.5" />
                    {t("dashWechatMenu.variablePicker.insert")}
                  </button>
                </div>
              </div>
            ))}
            {(grouped[activeCategory] ?? []).length === 0 && (
              <div className="py-8 text-center text-base-content/50 text-sm">
                {t("dashWechatMenu.variablePicker.empty")}
              </div>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
