import { useState } from "react";
import {
  useSetTrpgAccessMutation,
  useTrpgMemberHistoryQuery,
  useTrpgMembersLazyQuery,
} from "@/client/graphql/__generated__/trpg";
import { useTranslation } from "@/client/hooks/useTranslation";
import { displayTime, ErrorMessage, Field } from "./common";

export function MemberPanel({
  storeId,
  admin,
}: {
  storeId: string;
  admin: boolean;
}) {
  const { t } = useTranslation();
  const [search, result] = useTrpgMembersLazyQuery({
    fetchPolicy: "network-only",
  });
  const [selected, setSelected] = useState("");
  const [offset, setOffset] = useState(0);
  const [setAccess, saving] = useSetTrpgAccessMutation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const history = useTrpgMemberHistoryQuery({
    variables: { storeId, userId: selected, offset },
    skip: !selected,
  });
  return (
    <section className="card border border-base-300 bg-base-100">
      <div className="card-body">
        <h2 className="card-title">{t("trpg.members")}</h2>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSelected("");
            setMessage("");
            void search({
              variables: {
                storeId,
                search: String(
                  new FormData(e.currentTarget).get("search"),
                ).trim(),
              },
            }).catch(() => {});
          }}
        >
          <Field label={t("trpg.memberSearch")}>
            <input
              className="input"
              name="search"
              required
              minLength={2}
              maxLength={80}
            />
          </Field>
          <button className="btn mb-1" disabled={result.loading}>
            {t("common.search")}
          </button>
        </form>
        <ErrorMessage
          error={error || result.error?.message || history.error?.message}
        />
        {result.loading && <p role="status">{t("common.loading")}</p>}
        {result.called &&
          !result.loading &&
          !result.error &&
          result.data?.trpgMembers.length === 0 && <p>{t("common.noData")}</p>}
        <div className="flex flex-wrap gap-2">
          {result.data?.trpgMembers.map((m) => (
            <button
              type="button"
              className={`btn btn-sm ${selected === m.id ? "btn-primary" : "btn-ghost"}`}
              key={m.id}
              onClick={() => {
                setSelected(m.id);
                setOffset(0);
              }}
            >
              {m.nickname} · {m.uid}
            </button>
          ))}
        </div>
        {selected && (
          <div className="space-y-2 border-t border-base-200 pt-3">
            {history.loading ? (
              <p role="status">{t("common.loading")}</p>
            ) : (
              !history.error &&
              history.data?.trpgMemberHistory.items.length === 0 && (
                <p>{t("trpg.noHistory")}</p>
              )
            )}
            {history.data?.trpgMemberHistory.items.map((s) => (
              <p key={s.id}>
                {s.title} · {s.storeName} · {displayTime(s.startsAt)} ·{" "}
                {s.hostName}
              </p>
            ))}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-sm"
                disabled={offset === 0 || history.loading}
                onClick={() => setOffset(offset - 30)}
              >
                {t("trpg.previous")}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={
                  !history.data?.trpgMemberHistory.hasMore || history.loading
                }
                onClick={() => setOffset(offset + 30)}
              >
                {t("trpg.next")}
              </button>
            </div>
          </div>
        )}
        {admin && (
          <details className="mt-4">
            <summary className="cursor-pointer py-2 font-semibold">
              {t("trpg.access")}
            </summary>
            <p className="text-sm text-base-content/70">
              {t("trpg.accessHelp")}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (saving.loading) return;
                const data = new FormData(e.currentTarget);
                setMessage("");
                setError("");
                try {
                  await setAccess({
                    variables: {
                      id: String(data.get("id")).trim(),
                      storeId,
                      staff: data.has("staff"),
                      host: data.has("host"),
                    },
                  });
                  setMessage(t("trpg.accessSaved"));
                } catch (e) {
                  setError(e instanceof Error ? e.message : t("common.error"));
                }
              }}
            >
              <fieldset
                disabled={saving.loading}
                className="flex flex-wrap items-center gap-3"
              >
                <Field label={t("trpg.accountId")}>
                  <input
                    className="input"
                    name="id"
                    required
                    defaultValue={selected}
                    key={selected}
                  />
                </Field>
                <label className="flex items-center gap-2">
                  <input
                    className="checkbox checkbox-sm"
                    type="checkbox"
                    name="staff"
                  />
                  {t("trpg.staff")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    className="checkbox checkbox-sm"
                    type="checkbox"
                    name="host"
                  />
                  {t("trpg.host")}
                </label>
                <button className="btn">{t("common.save")}</button>
              </fieldset>
            </form>
            {message && (
              <p role="status" className="text-success">
                {message}
              </p>
            )}
          </details>
        )}
      </div>
    </section>
  );
}
