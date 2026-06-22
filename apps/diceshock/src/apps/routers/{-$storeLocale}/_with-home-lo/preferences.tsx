import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useMessages } from "@/client/hooks/useMessages";
import { CATEGORY_LABELS } from "@/shared/preferences/constants";
import { rruleToHumanReadable } from "@/shared/preferences/rruleDisplay";
import type { PreferenceCategory } from "@/shared/preferences/types";
import trpcClientPublic from "@/shared/utils/trpc";

export const Route = createFileRoute(
  "/{-$storeLocale}/_with-home-lo/preferences",
)({
  component: PreferencesPage,
});

type PreferenceItem = {
  id: string;
  raw_text: string;
  rrule: string;
  categories: string[];
  player_count: number | null;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
  displayText: string;
};

function PreferencesPage() {
  const messages = useMessages();
  const [preferences, setPreferences] = useState<PreferenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [inputText, setInputText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<{
    rrule: string;
    categories: string[];
    playerCount: number | null;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    trpcClientPublic.preferences.list
      .query()
      .then((data) => {
        setPreferences(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleInputSubmit = useCallback(
    async (e: React.FormEvent | React.KeyboardEvent) => {
      if ("key" in e && e.key !== "Enter") return;
      e.preventDefault();

      const text = inputText.trim();
      if (!text || isParsing) return;

      setIsParsing(true);
      try {
        const result =
          await trpcClientPublic.preferenceParser.parsePreference.mutate({
            rawText: text,
          });
        if (result.success) {
          setParseResult({
            rrule: result.rrule,
            categories: result.categories,
            playerCount: result.playerCount,
          });
        } else {
          messages.error(result.error);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("额度") || msg.includes("limit")) {
          messages.error("额度不足，请稍后再试");
        } else {
          messages.error("解析失败，请稍后再试");
        }
      } finally {
        setIsParsing(false);
      }
    },
    [inputText, isParsing, messages],
  );

  const handleConfirmAdd = useCallback(async () => {
    if (!parseResult) return;
    setIsCreating(true);
    try {
      const created = await trpcClientPublic.preferences.create.mutate({
        rawText: inputText.trim(),
        rrule: parseResult.rrule,
        categories: parseResult.categories as PreferenceCategory[],
        playerCount: parseResult.playerCount,
      });
      setPreferences((prev) => [
        { ...created, displayText: rruleToHumanReadable(created.rrule) },
        ...prev,
      ]);
      setInputText("");
      setParseResult(null);
      messages.success("偏好已添加");
    } catch {
      messages.error("添加失败");
    } finally {
      setIsCreating(false);
    }
  }, [parseResult, inputText, messages]);

  const handleCancelAdd = useCallback(() => {
    setParseResult(null);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await trpcClientPublic.preferences.delete.mutate({ id });
        setPreferences((prev) => prev.filter((p) => p.id !== id));
        messages.success("偏好已删除");
      } catch {
        messages.error("删除失败");
      }
    },
    [messages],
  );

  const handleToggle = useCallback(
    async (id: string) => {
      try {
        const result = await trpcClientPublic.preferences.toggle.mutate({ id });
        setPreferences((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, enabled: result.enabled } : p,
          ),
        );
      } catch {
        messages.error("操作失败");
      }
    },
    [messages],
  );

  return (
    <main className="min-h-[calc(100vh-8rem)] w-full px-4 pt-6 pb-12">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-xl font-bold mb-4">约局偏好</h1>
        <p className="text-sm text-base-content/60 mb-6">
          描述你的约局时间和类型偏好, 系统会自动为你匹配合适的约局
        </p>

        <div className="sticky top-16 z-10 bg-base-100 pb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="描述偏好, 如「周三晚上想打麻将」"
              className="input input-bordered w-full pr-10"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInputSubmit(e);
              }}
              disabled={isParsing || isCreating}
            />
            {isParsing && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="loading loading-spinner loading-xs" />
              </span>
            )}
          </div>

          {parseResult && (
            <div className="mt-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <p className="text-sm font-medium">
                {rruleToHumanReadable(parseResult.rrule)}
              </p>
              {parseResult.categories.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {parseResult.categories.map((cat) => (
                    <span
                      key={cat}
                      className="badge badge-xs badge-primary badge-outline"
                    >
                      {CATEGORY_LABELS[cat as PreferenceCategory] ?? cat}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-primary btn-xs"
                  onClick={handleConfirmAdd}
                  disabled={isCreating}
                >
                  {isCreating ? "添加中..." : "确认添加"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={handleCancelAdd}
                  disabled={isCreating}
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3 mt-4">
            <div className="skeleton h-20 w-full rounded-xl" />
            <div className="skeleton h-20 w-full rounded-xl" />
          </div>
        ) : preferences.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-base-content/50 text-sm">还没有设置偏好</p>
            <p className="text-base-content/40 text-xs mt-2">
              示例: "每周三晚上想打麻将"、"周末有空玩桌游"
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-4">
            {preferences.map((pref) => (
              <PreferenceCard
                key={pref.id}
                preference={pref}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function PreferenceCard({
  preference,
  onDelete,
  onToggle,
}: {
  preference: PreferenceItem;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const displayText = rruleToHumanReadable(preference.rrule);
  const categories = (preference.categories ?? []) as PreferenceCategory[];

  return (
    <div
      className={`bg-base-200 rounded-xl px-4 py-3 border border-base-content/5 ${!preference.enabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{preference.raw_text}</p>
          <p className="text-xs text-base-content/60 mt-0.5">{displayText}</p>
          {categories.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {categories.map((cat) => (
                <span key={cat} className="badge badge-xs badge-outline">
                  {CATEGORY_LABELS[cat]}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="checkbox"
            className="toggle toggle-xs toggle-primary"
            checked={preference.enabled}
            onChange={() => onToggle(preference.id)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle text-error/60 hover:text-error"
            onClick={() => onDelete(preference.id)}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
