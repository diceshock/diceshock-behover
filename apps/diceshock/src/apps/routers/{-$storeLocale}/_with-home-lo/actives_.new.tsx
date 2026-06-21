import {
  CalendarBlankIcon,
  ClockIcon,
  GameControllerIcon,
  TextAlignLeftIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  ClientOnly,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import TiptapEditor from "@/client/components/diceshock/TiptapEditor";
import useAuth from "@/client/hooks/useAuth";
import { useMessages } from "@/client/hooks/useMessages";
import { useTranslation } from "@/client/hooks/useTranslation";
import dayjs from "@/shared/utils/dayjs-config";
import trpcClientPublic from "@/shared/utils/trpc";

export const Route = createFileRoute(
  "/{-$storeLocale}/_with-home-lo/actives_/new",
)({
  component: NewActivePage,
});

function NewActivePage() {
  const { t } = useTranslation();
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const messages = useMessages();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [content, setContent] = useState("");
  const [boardGameId, setBoardGameId] = useState<string | undefined>();
  const [boardGameName, setBoardGameName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        messages.error(t("actives.newTitleRequired"));
        return;
      }
      if (!date) {
        messages.error(t("actives.newDateRequired"));
        return;
      }

      setSubmitting(true);
      try {
        const active = await trpcClientPublic.actives.create.mutate({
          title: title.trim(),
          date,
          time: time || undefined,
          max_players: maxPlayers,
          content: content || undefined,
          board_game_id: boardGameId,
          is_game: true,
        });
        messages.success(t("actives.newCreateSuccess"));
        navigate({
          to: "/{-$storeLocale}/actives/$id",
          params: (prev) => ({ ...prev, id: active.id }),
        });
      } catch (error) {
        console.error("Failed to create active:", error);
        messages.error(t("actives.newCreateFailed"));
      } finally {
        setSubmitting(false);
      }
    },
    [
      title,
      date,
      time,
      maxPlayers,
      content,
      boardGameId,
      messages,
      navigate,
      t,
    ],
  );

  if (!userInfo) {
    return (
      <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
        <div className="mx-auto w-full max-w-2xl text-center py-20">
          <p className="text-lg text-base-content/60">
            {t("actives.newNeedLogin")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <ClientOnly>
      <main className="min-h-[calc(100vh-32rem)] w-full mt-20 sm:mt-32 md:mt-40 px-4 pb-20">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold mb-8">
            {t("actives.newTitle")}
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold flex items-center gap-1.5">
                <TextAlignLeftIcon className="size-4" />
                {t("actives.newLabelTitle")}
              </span>
              <input
                type="text"
                placeholder={t("actives.newTitlePlaceholder")}
                className="input input-bordered w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="label text-sm font-semibold flex items-center gap-1.5">
                <GameControllerIcon className="size-4" />
                {t("actives.newBoardGameOptional")}
              </span>
              {boardGameId ? (
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary badge-lg gap-1">
                    🎲 {boardGameName}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      setBoardGameId(undefined);
                      setBoardGameName("");
                    }}
                  >
                    {t("common.clear")}
                  </button>
                </div>
              ) : (
                <BoardGameSearch
                  onSelect={(id, name) => {
                    setBoardGameId(id);
                    setBoardGameName(name);
                  }}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold flex items-center gap-1.5">
                  <CalendarBlankIcon className="size-4" />
                  {t("actives.newLabelDate")}
                </span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD")}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="label text-sm font-semibold flex items-center gap-1.5">
                  <ClockIcon className="size-4" />
                  {t("actives.newTimeOptional")}
                </span>
                <input
                  type="time"
                  className="input input-bordered w-full"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="label text-sm font-semibold flex items-center gap-1.5">
                <UsersIcon className="size-4" />
                {t("actives.newMaxPlayers")}
              </span>
              <input
                type="number"
                className="input input-bordered w-24"
                value={maxPlayers}
                onChange={(e) =>
                  setMaxPlayers(
                    Math.max(1, Math.min(100, Number(e.target.value))),
                  )
                }
                min={1}
                max={100}
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="label text-sm font-semibold">
                {t("actives.newContent")}
              </span>
              <TiptapEditor
                content={content}
                onChange={setContent}
                placeholder={t("actives.newContentPlaceholder")}
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate({ to: "/{-$storeLocale}/actives" })}
                disabled={submitting}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className={clsx("btn btn-primary", submitting && "loading")}
                disabled={submitting}
              >
                {submitting ? t("actives.newCreating") : t("actives.newSubmit")}
              </button>
            </div>
          </form>
        </div>
      </main>
    </ClientOnly>
  );
}

type GameResult = {
  id: string;
  sch_name: string | null;
  eng_name: string | null;
};

function BoardGameSearch({
  onSelect,
}: {
  onSelect: (id: string, name: string) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameResult[]>([]);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const timer = setTimeout(async () => {
      try {
        const data = await trpcClientPublic.owned.get.query({
          page: 1,
          pageSize: 8,
          params: {
            searchWords: query,
            tags: [],
            numOfPlayers: null,
            isBestNumOfPlayers: false,
          },
        });
        if (!ctrl.signal.aborted) {
          setResults(
            data.map((g) => ({
              id: g.id,
              sch_name: g.sch_name,
              eng_name: g.eng_name,
            })),
          );
        }
      } catch {
        if (!ctrl.signal.aborted) setResults([]);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const showDropdown = focused && query.trim().length > 0;

  return (
    <div
      ref={containerRef}
      className="relative"
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget)) {
          setFocused(false);
        }
      }}
    >
      <input
        type="text"
        placeholder={t("actives.newSearchGame")}
        className="input input-bordered w-full"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {showDropdown && (
        <ul className="absolute z-20 top-full left-0 right-0 mt-1 bg-base-200 border border-base-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.length === 0 ? (
            <li className="p-3 text-center text-sm text-base-content/50">
              {query.trim()
                ? t("common.searching")
                : t("actives.newSearchHint")}
            </li>
          ) : (
            results.map((game) => (
              <li key={game.id}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-base-300 transition-colors text-sm"
                  onClick={() =>
                    onSelect(game.id, game.sch_name || game.eng_name || "")
                  }
                >
                  {game.sch_name || game.eng_name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
