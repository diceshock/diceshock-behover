import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  type TrpgDirectoryQuery,
  useSetTrpgHostMutation,
  useSetTrpgMemberMutation,
  useTrpgDashboardQuery,
  useTrpgDirectoryQuery,
  useTrpgManagementContextQuery,
  useTrpgMemberHistoryQuery,
} from "@/client/graphql/__generated__/trpg";
import { useTranslation } from "@/client/hooks/useTranslation";
import { displayTime, ErrorMessage, Field } from "./common";
import { ManagementNav } from "./ManagementNav";

type Member = TrpgDirectoryQuery["trpgDirectory"]["items"][number];

export function PeopleManagement({ hostsOnly }: { hostsOnly: boolean }) {
  const { t } = useTranslation();
  const context = useTrpgManagementContextQuery();
  const allowed =
    context.data?.trpgProfile.admin ||
    context.data?.trpgStores.some((s) => s.canReview);
  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
        <ManagementNav />
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {t(hostsOnly ? "trpgOps.hosts" : "trpgOps.members")}
            </h1>
            <p className="mt-1 text-sm text-base-content/70">
              {t(hostsOnly ? "trpgOps.hostHelp" : "trpgOps.memberHelp")}
            </p>
          </div>
        </header>
        <ErrorMessage error={context.error?.message} />
        {context.loading && <p role="status">{t("common.loading")}</p>}
        {!context.loading && !context.error && !allowed && (
          <p className="alert">{t("trpg.noAccess")}</p>
        )}
        {allowed && (
          <Directory
            key={String(hostsOnly)}
            storeId=""
            hostsOnly={hostsOnly}
            admin={!!context.data?.trpgProfile.admin}
          />
        )}
      </div>
    </div>
  );
}

function Directory({
  storeId,
  hostsOnly,
  admin,
}: {
  storeId: string;
  hostsOnly: boolean;
  admin: boolean;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [change, setChange] = useState<{
    member: Member;
    host: boolean;
  } | null>(null);
  const [memberTarget, setMemberTarget] = useState<Member | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const directory = useTrpgDirectoryQuery({
    variables: {
      storeId: storeId || undefined,
      search,
      hostsOnly,
      membersOnly: !hostsOnly,
      offset,
    },
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });
  const candidates = useTrpgDirectoryQuery({
    variables: {
      storeId: storeId || undefined,
      search: candidateSearch,
      hostsOnly: false,
      offset: 0,
    },
    skip: !adding || candidateSearch.length < 2,
    fetchPolicy: "network-only",
  });
  const [save, saving] = useSetTrpgHostMutation();
  const [saveMember, savingMember] = useSetTrpgMemberMutation();
  async function confirmMember() {
    if (!memberTarget || savingMember.loading) return;
    setError("");
    setMessage("");
    try {
      await saveMember({
        variables: { id: memberTarget.id, member: true },
      });
      setMemberTarget(null);
      setAdding(false);
      setSelected(null);
      setMessage(t("trpgOps.memberSaved"));
      await directory.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  }
  async function confirmAccess() {
    if (!change || saving.loading) return;
    setError("");
    setMessage("");
    try {
      await save({
        variables: {
          id: change.member.id,
          host: change.host,
        },
      });
      setChange(null);
      setAdding(false);
      setSelected(null);
      setMessage(t("trpg.accessSaved"));
      await directory.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  }
  return (
    <>
      <form
        className="flex flex-wrap items-end gap-3 rounded-box border border-base-300 bg-base-100 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(
            String(new FormData(e.currentTarget).get("search") || "").trim(),
          );
          setOffset(0);
          setSelected(null);
        }}
      >
        <Field label={t("trpg.memberSearch")}>
          <input
            name="search"
            className="input w-full sm:w-80"
            maxLength={80}
          />
        </Field>
        <button className="btn btn-primary" disabled={directory.loading}>
          {t("common.search")}
        </button>
        <button
          type="button"
          className="btn"
          disabled={directory.loading}
          onClick={() => void directory.refetch().catch(() => {})}
        >
          {t("trpg.refresh")}
        </button>
        {hostsOnly && admin && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setAdding(!adding);
              setChange(null);
            }}
          >
            {t("trpgOps.addHost")}
          </button>
        )}
        {!hostsOnly && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setAdding(!adding);
              setMemberTarget(null);
              setChange(null);
            }}
          >
            {t("trpgOps.addMember")}
          </button>
        )}
      </form>
      {hostsOnly && !admin && (
        <p className="text-sm text-base-content/70">{t("trpgOps.adminOnly")}</p>
      )}
      <ErrorMessage
        error={error || directory.error?.message || candidates.error?.message}
      />
      {message && (
        <p role="status" className="alert alert-success">
          {message}
        </p>
      )}
      {adding && (
        <section className="space-y-3 rounded-box border border-base-300 p-4">
          <h2 className="font-semibold">
            {t(hostsOnly ? "trpgOps.addHost" : "trpgOps.addMember")}
          </h2>
          <p className="text-sm text-base-content/70">
            {t(hostsOnly ? "trpgOps.addHostHelp" : "trpgOps.addMemberHelp")}
          </p>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setCandidateSearch(
                String(
                  new FormData(e.currentTarget).get("candidate") || "",
                ).trim(),
              );
            }}
          >
            <Field label={t("trpg.memberSearch")}>
              <input
                className="input"
                name="candidate"
                required
                minLength={2}
                maxLength={80}
              />
            </Field>
            <button className="btn" disabled={candidates.loading}>
              {t("common.search")}
            </button>
          </form>
          {candidates.loading && <p role="status">{t("common.loading")}</p>}
          {candidateSearch &&
            !candidates.loading &&
            candidates.data?.trpgDirectory.items.length === 0 && (
              <p>{t("common.noData")}</p>
            )}
          <div className="flex flex-wrap gap-2">
            {candidates.data?.trpgDirectory.items.map((m) => (
              <button
                key={m.id}
                type="button"
                className="btn"
                disabled={
                  m.disabled ||
                  (hostsOnly
                    ? m.host || saving.loading
                    : m.host || m.role !== "customer" || savingMember.loading)
                }
                onClick={() =>
                  hostsOnly
                    ? setChange({ member: m, host: true })
                    : setMemberTarget(m)
                }
              >
                {m.nickname} · {m.uid}
                {m.host ? ` · ${t("trpg.host")}` : ""}
              </button>
            ))}
          </div>
          {candidates.data?.trpgDirectory.hasMore && (
            <p className="text-sm">{t("trpgOps.narrowSearch")}</p>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setAdding(false);
              setChange(null);
              setMemberTarget(null);
            }}
          >
            {t("common.cancel")}
          </button>
        </section>
      )}
      {memberTarget && (
        <section className="alert flex flex-wrap" role="alert">
          <div>
            <h2 className="font-semibold">
              {t("trpgOps.confirmAddMember")} · {memberTarget.nickname}
            </h2>
            <p className="mt-1 text-sm">{t("trpgOps.addMemberHelp")}</p>
          </div>
          <button
            type="button"
            className="btn"
            disabled={savingMember.loading}
            onClick={() => setMemberTarget(null)}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={savingMember.loading}
            onClick={() => void confirmMember()}
          >
            {t(savingMember.loading ? "common.saving" : "common.confirm")}
          </button>
        </section>
      )}
      {change && (
        <section className="alert flex flex-wrap" role="alert">
          <div>
            <h2 className="font-semibold">
              {t(
                change.host ? "trpgOps.confirmGrant" : "trpgOps.confirmRevoke",
              )}{" "}
              · {change.member.nickname}
            </h2>
            <p className="mt-1 text-sm">{t("trpgOps.accessScopeHelp")}</p>
          </div>
          <button
            type="button"
            className="btn"
            disabled={saving.loading}
            onClick={() => setChange(null)}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving.loading}
            onClick={() => void confirmAccess()}
          >
            {t(saving.loading ? "common.saving" : "common.confirm")}
          </button>
        </section>
      )}
      <section
        className="overflow-x-auto rounded-box border border-base-300 bg-base-100"
        aria-label={t(hostsOnly ? "trpgOps.hosts" : "trpgOps.members")}
        aria-busy={directory.loading}
      >
        {directory.loading ? (
          <p role="status" className="p-6">
            {t("common.loading")}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("trpgOps.memberName")}</th>
                {!hostsOnly && (
                  <>
                    <th>{t("trpgOps.phone")}</th>
                    <th>{t("trpgOps.memberType")}</th>
                    <th>{t("trpgOps.points")}</th>
                    <th>{t("trpgOps.balance")}</th>
                    <th>{t("trpgOps.validity")}</th>
                  </>
                )}
                <th>{t("trpg.state")}</th>
                <th>{t("dashActives.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {directory.data?.trpgDirectory.items.map((m) => (
                <tr
                  key={m.id}
                  className={selected?.id === m.id ? "bg-base-200" : ""}
                >
                  <td>
                    <p className="font-semibold">{m.nickname}</p>
                    <p className="text-xs text-base-content/60">{m.uid}</p>
                  </td>
                  {!hostsOnly && (
                    <>
                      <td>{m.phone || "—"}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {m.storedValueMember && (
                            <span className="badge badge-soft badge-primary">
                              {t("trpgOps.storedMember")}
                            </span>
                          )}
                          {!!m.timePlans.length && (
                            <span className="badge badge-soft badge-secondary">
                              {t("trpgOps.timeMember")}
                            </span>
                          )}
                          {!m.storedValueMember && !m.timePlans.length && (
                            <span className="text-base-content/60">
                              {t("trpgOps.nonMember")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{m.points}</td>
                      <td>¥{(m.balanceCents / 100).toFixed(2)}</td>
                      <td>
                        <TimeMembership member={m} />
                      </td>
                    </>
                  )}
                  <td>
                    <span className="badge badge-soft">
                      {t(m.disabled ? "trpgOps.disabled" : "trpgOps.enabled")}
                    </span>
                    {m.host && !hostsOnly && (
                      <span className="badge badge-soft ml-1">
                        {t("trpg.host")}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-sm min-h-10"
                        onClick={() => setSelected(m)}
                      >
                        {t(
                          hostsOnly
                            ? "trpgOps.hostSessions"
                            : "trpgOps.records",
                        )}
                      </button>
                      {!hostsOnly && (
                        <Link
                          className="btn btn-sm btn-primary min-h-10"
                          to="/dash/users/$id"
                          params={{ id: m.id }}
                          search={{ tab: "membership" }}
                        >
                          {t("trpgOps.manageAssets")}
                        </Link>
                      )}
                      {admin && (
                        <Link
                          className="btn btn-sm btn-ghost min-h-10"
                          to="/dash/users/$id"
                          params={{ id: m.id }}
                          search={{ tab: "basic" }}
                        >
                          {t("trpgOps.accountDetails")}
                        </Link>
                      )}
                      {hostsOnly && admin && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost text-error min-h-10"
                          disabled={m.disabled || saving.loading}
                          onClick={() =>
                            setChange({ member: m, host: !m.host })
                          }
                        >
                          {t(m.host ? "trpgOps.revokeHost" : "trpgOps.addHost")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!directory.loading &&
          !directory.error &&
          directory.data?.trpgDirectory.items.length === 0 && (
            <p className="p-8 text-center">{t("common.noData")}</p>
          )}
        <div className="flex items-center justify-between gap-2 border-t border-base-200 p-3">
          <span className="text-sm">
            {t("trpg.page", { page: offset / 30 + 1 })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={!offset || directory.loading}
              onClick={() => {
                setOffset(offset - 30);
                setSelected(null);
              }}
            >
              {t("trpg.previous")}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={
                !directory.data?.trpgDirectory.hasMore || directory.loading
              }
              onClick={() => {
                setOffset(offset + 30);
                setSelected(null);
              }}
            >
              {t("trpg.next")}
            </button>
          </div>
        </div>
      </section>
      {selected && hostsOnly && (
        <HostSessions
          key={selected.id}
          member={selected}
          storeId={storeId}
          onClose={() => setSelected(null)}
        />
      )}
      {selected && !hostsOnly && (
        <MemberHistory
          key={selected.id}
          member={selected}
          storeId={storeId}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function MemberHistory({
  member,
  storeId,
  onClose,
}: {
  member: Member;
  storeId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [offset, setOffset] = useState(0);
  const history = useTrpgMemberHistoryQuery({
    variables: { storeId: storeId || undefined, userId: member.id, offset },
    fetchPolicy: "network-only",
  });
  return (
    <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          {member.nickname} · {t("trpgOps.completedRecords")}
        </h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
      <ErrorMessage error={history.error?.message} />
      {history.loading ? (
        <p role="status">{t("common.loading")}</p>
      ) : (
        <>
          {!history.data?.trpgMemberHistory.items.length && (
            <p>{t("trpg.noHistory")}</p>
          )}
          {history.data?.trpgMemberHistory.items.map((s) => (
            <article key={s.id} className="rounded-lg bg-base-200 p-3">
              <h3 className="font-medium">{s.title}</h3>
              <p className="text-sm">
                {displayTime(s.startsAt)} · {s.hostName} · {s.gameSystem}
              </p>
            </article>
          ))}
        </>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-sm"
          disabled={!offset || history.loading}
          onClick={() => setOffset(offset - 30)}
        >
          {t("trpg.previous")}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={!history.data?.trpgMemberHistory.hasMore || history.loading}
          onClick={() => setOffset(offset + 30)}
        >
          {t("trpg.next")}
        </button>
      </div>
    </section>
  );
}

function HostSessions({
  member,
  storeId,
  onClose,
}: {
  member: Member;
  storeId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [offset, setOffset] = useState(0);
  const result = useTrpgDashboardQuery({
    variables: {
      filters: { storeId: storeId || undefined, hostId: member.id, offset },
    },
    fetchPolicy: "network-only",
  });
  return (
    <section className="space-y-3 rounded-box border border-base-300 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          {member.nickname} · {t("trpgOps.hostSessions")}
        </h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
      <ErrorMessage error={result.error?.message} />
      {result.loading ? (
        <p role="status">{t("common.loading")}</p>
      ) : (
        <>
          {!result.data?.trpgSessions.items.length && (
            <p>{t("trpg.noSessions")}</p>
          )}
          {result.data?.trpgSessions.items.map((s) => (
            <article key={s.id} className="rounded-lg bg-base-200 p-3">
              <h3 className="font-medium">{s.title}</h3>
              <p className="text-sm">
                {displayTime(s.startsAt) || t("trpg.pendingTime")} ·{" "}
                {s.tableName || "—"} · {t(`trpg.status.${s.status}`)}
              </p>
            </article>
          ))}
        </>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-sm"
          disabled={!offset || result.loading}
          onClick={() => setOffset(offset - 30)}
        >
          {t("trpg.previous")}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={!result.data?.trpgSessions.hasMore || result.loading}
          onClick={() => setOffset(offset + 30)}
        >
          {t("trpg.next")}
        </button>
      </div>
    </section>
  );
}

function TimeMembership({ member }: { member: Member }) {
  const { t } = useTranslation();
  const now = Date.now();
  const active = member.timePlans.find(
    (p) =>
      Date.parse(p.startsAt) <= now &&
      (!p.expiresAt || Date.parse(p.expiresAt) > now),
  );
  const upcoming = member.timePlans.find((p) => Date.parse(p.startsAt) > now);
  const expired = [...member.timePlans].sort(
    (a, b) =>
      Date.parse(b.expiresAt || b.startsAt) -
      Date.parse(a.expiresAt || a.startsAt),
  )[0];
  const plan = active || upcoming || expired;
  if (!plan) return <span className="text-base-content/50">—</span>;
  return (
    <div className="min-w-44 text-sm">
      <span
        className={
          active
            ? "text-success"
            : upcoming
              ? "text-info"
              : "text-base-content/50"
        }
      >
        {t(
          active
            ? "trpgOps.cardActive"
            : upcoming
              ? "trpgOps.cardUpcoming"
              : "trpgOps.cardExpired",
        )}
      </span>
      <div>{displayTime(plan.startsAt)} —</div>
      <div>
        {plan.expiresAt ? displayTime(plan.expiresAt) : t("trpgOps.noExpiry")}
      </div>
      {active && upcoming && (
        <div className="text-xs text-base-content/60">
          {t("trpgOps.hasRenewal")}
        </div>
      )}
    </div>
  );
}
