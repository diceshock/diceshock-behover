import { type FormEvent, useState } from "react";
import {
  type TrpgSessionFieldsFragment,
  useReviewTrpgRegistrationMutation,
  useScheduleTrpgSessionMutation,
  useTransitionTrpgSessionMutation,
  useTrpgResourcesQuery,
  useTrpgRosterQuery,
} from "@/client/graphql/__generated__/trpg";
import { useTranslation } from "@/client/hooks/useTranslation";
import { displayTime, ErrorMessage, Field, instant } from "./common";

type Action =
  | { kind: "session"; action: "approve" | "return" | "cancel" | "complete" }
  | {
      kind: "booking";
      action: "approve" | "reject" | "withdraw";
      id: string;
      nickname: string;
    };
export function SessionDetails({
  session,
  onChanged,
  onEdit,
  onClose,
}: {
  session: TrpgSessionFieldsFragment;
  onChanged: () => Promise<unknown>;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [action, setAction] = useState<Action | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState("");
  const [rosterOffset, setRosterOffset] = useState(0);
  const roster = useTrpgRosterQuery({
    variables: { id: session.id, offset: rosterOffset },
    fetchPolicy: "network-only",
  });
  const resources = useTrpgResourcesQuery({
    variables: { storeId: session.storeId },
    skip: !scheduling,
  });
  const [transition, transitioning] = useTransitionTrpgSessionMutation();
  const [review, reviewing] = useReviewTrpgRegistrationMutation();
  const [schedule, saving] = useScheduleTrpgSessionMutation();
  const busy = transitioning.loading || reviewing.loading || saving.loading;
  async function perform(task: () => Promise<unknown>) {
    if (busy) return;
    setError("");
    try {
      await task();
      setAction(null);
      setScheduling(false);
      await Promise.all([onChanged(), roster.refetch()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  }
  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || !session.revision) return;
    const data = new FormData(event.currentTarget);
    const reason = String(data.get("reason") || "").trim();
    void perform(() =>
      action.kind === "session"
        ? transition({
            variables: {
              id: session.id,
              revision: session.revision!,
              action: action.action,
              reason,
            },
          })
        : review({
            variables: {
              id: session.id,
              registrationId: action.id,
              decision: action.action,
              reason,
              depositConfirmed: data.has("deposit"),
            },
          }),
    );
  }
  return (
    <section className="card border border-base-300 bg-base-100">
      <div className="card-body gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="badge badge-soft mb-2">
              {t(`trpg.status.${session.status}`)}
            </span>
            <h2 className="card-title">{session.title}</h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={onClose}
          >
            {t("common.back")}
          </button>
        </div>
        <p className="text-sm text-base-content/70">
          {session.storeName} · {session.hostName} ·{" "}
          {displayTime(session.startsAt) || t("trpg.pendingTime")}{" "}
          {session.tableName && `· ${session.tableName}`}
        </p>
        <p className="whitespace-pre-wrap">{session.description}</p>
        <div className="flex flex-wrap gap-2">
          {session.tags.map((tag) => (
            <span key={tag} className="badge badge-outline">
              {tag}
            </span>
          ))}
        </div>
        <p>
          {t("trpg.summary", {
            confirmed: session.confirmedCount,
            capacity: session.capacity,
            minimum: session.minimum,
            fee: (session.feeCents / 100).toFixed(2),
          })}
        </p>
        {session.reason && (
          <div className="alert alert-warning">{session.reason}</div>
        )}
        <ErrorMessage
          error={error || roster.error?.message || resources.error?.message}
        />
        <div className="flex flex-wrap gap-2">
          {session.canReview &&
            (session.status === "pending"
              ? (["approve", "return"] as const)
              : session.status === "published"
                ? ([
                    "cancel",
                    ...(session.startsAt &&
                    Date.parse(session.startsAt) <= Date.now()
                      ? ["complete" as const]
                      : []),
                  ] as const)
                : []
            ).map((value) => (
              <button
                type="button"
                key={value}
                className="btn btn-sm"
                disabled={busy}
                onClick={() => {
                  setAction({ kind: "session", action: value });
                  setScheduling(false);
                }}
              >
                {t(`trpg.actions.${value}`)}
              </button>
            ))}
          {session.canEdit && (
            <button
              type="button"
              className="btn btn-sm"
              disabled={busy}
              onClick={onEdit}
            >
              {t("trpg.edit")}
            </button>
          )}
          {session.canReview &&
            session.status === "published" &&
            !session.startsAt && (
              <button
                type="button"
                className="btn btn-sm"
                disabled={busy}
                onClick={() => {
                  setScheduling(true);
                  setAction(null);
                }}
              >
                {t("trpg.schedule")}
              </button>
            )}
        </div>
        {action && (
          <form
            onSubmit={confirm}
            className="rounded-box border border-base-300 p-4"
          >
            <fieldset disabled={busy} className="space-y-3">
              <h3 className="font-semibold">
                {t(`trpg.actions.${action.action}`)}
                {action.kind === "booking" && ` · ${action.nickname}`}
              </h3>
              {!["approve", "complete"].includes(action.action) && (
                <Field label={t("trpg.reason")}>
                  <textarea
                    className="textarea w-full"
                    name="reason"
                    required
                    maxLength={300}
                  />
                </Field>
              )}
              {action.kind === "booking" &&
                action.action === "approve" &&
                session.feeCents > 0 && (
                  <label className="flex items-center gap-2">
                    <input
                      className="checkbox"
                      name="deposit"
                      type="checkbox"
                      required
                    />
                    {t("trpg.deposit")}
                  </label>
                )}
              <p className="text-sm text-base-content/70">
                {t("trpg.confirmAction")}
              </p>
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm">
                  {t("common.confirm")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAction(null)}
                >
                  {t("common.cancel")}
                </button>
              </div>
            </fieldset>
          </form>
        )}
        {scheduling && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void perform(() =>
                schedule({
                  variables: {
                    id: session.id,
                    revision: session.revision!,
                    tableId: String(data.get("tableId")),
                    startsAt: instant(data.get("startsAt"))!,
                    deadline: instant(data.get("deadline"))!,
                  },
                }),
              );
            }}
          >
            <fieldset disabled={busy} className="grid gap-3 md:grid-cols-3">
              <Field label={t("trpg.table")}>
                <select
                  className="select w-full"
                  name="tableId"
                  required
                  defaultValue=""
                >
                  <option value="">{t("trpg.selectTable")}</option>
                  {resources.data?.trpgTables.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("trpg.startsAt")}>
                <input
                  className="input w-full"
                  name="startsAt"
                  type="datetime-local"
                  required
                />
              </Field>
              <Field label={t("trpg.deadline")}>
                <input
                  className="input w-full"
                  name="deadline"
                  type="datetime-local"
                  required
                />
              </Field>
              <p className="text-sm text-base-content/70 md:col-span-3">
                {t("trpg.priorityHelp")}
              </p>
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm"
                  disabled={resources.loading || !!resources.error}
                >
                  {t("common.save")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setScheduling(false)}
                >
                  {t("common.cancel")}
                </button>
              </div>
            </fieldset>
          </form>
        )}
        <h3 className="font-semibold">{t("trpg.roster")}</h3>
        {roster.loading ? (
          <p role="status">{t("common.loading")}</p>
        ) : (
          !roster.error &&
          !roster.data?.trpgRoster.items.length && (
            <p className="text-base-content/60">{t("trpg.noBookings")}</p>
          )
        )}
        {roster.data?.trpgRoster.items.map((entry) => (
          <div
            key={entry.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 py-3"
          >
            <div>
              <p className="font-medium">
                {entry.nickname}{" "}
                <span className="badge badge-sm">
                  {t(`trpg.booking.${entry.status}`)}
                </span>
              </p>
              <p className="text-sm text-base-content/70">
                {entry.phone} {entry.reason}
              </p>
            </div>
            {session.canReview &&
              session.status === "published" &&
              (!session.startsAt ||
                Date.parse(session.startsAt) > Date.now()) && (
                <div className="flex gap-2">
                  {(entry.status === "pending"
                    ? (["approve", "reject", "withdraw"] as const)
                    : ["confirmed", "interested"].includes(entry.status)
                      ? (["withdraw"] as const)
                      : []
                  ).map((value) => (
                    <button
                      type="button"
                      key={value}
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() =>
                        setAction({
                          kind: "booking",
                          action: value,
                          id: entry.id,
                          nickname: entry.nickname,
                        })
                      }
                    >
                      {t(`trpg.actions.${value}`)}
                    </button>
                  ))}
                </div>
              )}
          </div>
        ))}
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-sm"
            disabled={rosterOffset === 0 || roster.loading || busy}
            onClick={() => setRosterOffset(rosterOffset - 30)}
          >
            {t("trpg.previous")}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={
              !roster.data?.trpgRoster.hasMore || roster.loading || busy
            }
            onClick={() => setRosterOffset(rosterOffset + 30)}
          >
            {t("trpg.next")}
          </button>
        </div>
      </div>
    </section>
  );
}
