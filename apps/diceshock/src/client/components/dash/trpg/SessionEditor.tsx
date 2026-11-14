import { type FormEvent, useRef, useState } from "react";
import {
  type TrpgSessionFieldsFragment,
  useCreateTrpgSessionMutation,
  useResubmitTrpgSessionMutation,
  useTrpgHostsQuery,
  useTrpgResourcesQuery,
} from "@/client/graphql/__generated__/trpg";
import { useTranslation } from "@/client/hooks/useTranslation";
import { sessionInput } from "@/shared/trpg/validation";
import { ErrorMessage, Field, instant, localTime } from "./common";

export function SessionEditor({
  storeId,
  canReview,
  session,
  onSaved,
  onClose,
}: {
  storeId: string;
  canReview: boolean;
  session?: TrpgSessionFieldsFragment;
  onSaved: () => Promise<unknown>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const requestId = useRef(crypto.randomUUID());
  const [pendingTime, setPendingTime] = useState(
    session ? !session.startsAt : false,
  );
  const [error, setError] = useState("");
  const [create, creating] = useCreateTrpgSessionMutation();
  const [resubmit, submitting] = useResubmitTrpgSessionMutation();
  const resources = useTrpgResourcesQuery({ variables: { storeId } });
  const hosts = useTrpgHostsQuery({
    variables: { storeId },
    skip: !canReview || !!session,
  });
  const busy = creating.loading || submitting.loading;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const get = (name: string) => String(values.get(name) || "");
    const input = sessionInput.safeParse({
      requestId: requestId.current,
      storeId,
      hostId: get("hostId") || undefined,
      tableId: pendingTime ? null : get("tableId"),
      title: get("title"),
      description: get("description"),
      moduleName: get("moduleName"),
      gameSystem: get("gameSystem"),
      startsAt: pendingTime ? null : instant(values.get("startsAt")),
      deadline: pendingTime ? null : instant(values.get("deadline")),
      capacity: Number(get("capacity")),
      minimum: Number(get("minimum")),
      durationMinutes: Number(get("durationMinutes")),
      feeCents: Math.round(Number(get("fee")) * 100),
      timeHint: get("timeHint"),
      tags: get("tags")
        .split(/[,，、]/)
        .map((v) => v.trim())
        .filter(Boolean),
    });
    if (!input.success) {
      setError(input.error.issues[0].message);
      return;
    }
    setError("");
    try {
      if (session?.revision)
        await resubmit({
          variables: {
            id: session.id,
            revision: session.revision,
            input: input.data,
          },
        });
      else await create({ variables: { input: input.data } });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  }
  return (
    <section className="card border border-base-300 bg-base-100">
      <div className="card-body">
        <h2 className="card-title">
          {t(session ? "trpg.edit" : "trpg.create")}
        </h2>
        <ErrorMessage
          error={error || resources.error?.message || hosts.error?.message}
        />
        <form onSubmit={save}>
          <fieldset disabled={busy} className="grid gap-x-4 md:grid-cols-2">
            <Field label={t("trpg.title")}>
              <input
                className="input w-full"
                name="title"
                required
                maxLength={100}
                defaultValue={session?.title}
              />
            </Field>
            <Field label={t("trpg.system")}>
              <input
                className="input w-full"
                name="gameSystem"
                required
                maxLength={40}
                defaultValue={session?.gameSystem}
              />
            </Field>
            <Field label={t("trpg.module")}>
              <input
                className="input w-full"
                name="moduleName"
                maxLength={100}
                defaultValue={session?.moduleName}
              />
            </Field>
            <Field label={t("trpg.tags")}>
              <input
                className="input w-full"
                name="tags"
                defaultValue={session?.tags.join(", ")}
              />
            </Field>
            {canReview && !session && (
              <Field label={t("trpg.host")}>
                <select className="select w-full" name="hostId">
                  <option value="">{t("trpg.me")}</option>
                  {hosts.data?.trpgHosts.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nickname}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {(
              [
                ["minimum", 1, 6, session?.minimum ?? 4],
                ["capacity", 1, 6, session?.capacity ?? 6],
                ["durationMinutes", 1, 1440, session?.durationMinutes ?? 300],
                ["fee", 0, 9999.99, (session?.feeCents ?? 11800) / 100],
              ] as const
            ).map(([name, min, max, value]) => (
              <Field key={name} label={t(`trpg.${name}`)}>
                <input
                  className="input w-full"
                  name={name}
                  type="number"
                  min={min}
                  max={max}
                  step={name === "fee" ? "0.01" : "1"}
                  required
                  defaultValue={value}
                />
              </Field>
            ))}
            <label className="flex min-h-11 items-center gap-2 md:col-span-2">
              <input
                className="checkbox checkbox-sm"
                type="checkbox"
                checked={pendingTime}
                onChange={(e) => setPendingTime(e.target.checked)}
              />
              {t("trpg.pendingTime")}
            </label>
            {pendingTime ? (
              <Field label={t("trpg.timeHint")}>
                <input
                  className="input w-full"
                  name="timeHint"
                  maxLength={40}
                  defaultValue={session?.timeHint}
                />
              </Field>
            ) : (
              <>
                <Field label={t("trpg.table")}>
                  <select
                    className="select w-full"
                    name="tableId"
                    required
                    defaultValue={session?.tableId ?? ""}
                    disabled={resources.loading}
                  >
                    <option value="">{t("trpg.selectTable")}</option>
                    {resources.data?.trpgTables.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} · {v.capacity}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("trpg.startsAt")}>
                  <input
                    className="input w-full"
                    type="datetime-local"
                    name="startsAt"
                    required
                    defaultValue={localTime(session?.startsAt)}
                  />
                </Field>
                <Field label={t("trpg.deadline")}>
                  <input
                    className="input w-full"
                    type="datetime-local"
                    name="deadline"
                    required
                    defaultValue={localTime(session?.deadline)}
                  />
                </Field>
              </>
            )}
            <div className="md:col-span-2">
              <Field label={t("trpg.description")}>
                <textarea
                  className="textarea min-h-28 w-full"
                  name="description"
                  required
                  maxLength={1000}
                  defaultValue={session?.description}
                />
              </Field>
            </div>
            <div className="mt-4 flex gap-2 md:col-span-2">
              <button
                className="btn btn-primary"
                disabled={resources.loading || !!resources.error}
              >
                {busy && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                {t(
                  canReview && !session ? "trpg.publish" : "trpg.submitReview",
                )}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                {t("common.cancel")}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
