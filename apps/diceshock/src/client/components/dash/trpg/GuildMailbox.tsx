import { useState } from "react";
import {
  useTrpgMailboxAdminQuery,
  useReplyTrpgMailMutation,
} from "@/client/graphql/__generated__/trpg";
import { ManagementNav } from "./ManagementNav";
import { ErrorMessage, Field } from "./common";
export function GuildMailbox() {
  const [offset, setOffset] = useState(0),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const query = useTrpgMailboxAdminQuery({
    variables: { offset },
    fetchPolicy: "network-only",
  });
  const [reply] = useReplyTrpgMailMutation();
  async function run(task: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      await query.refetch();
      setMessage("已保存");
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
        <ManagementNav />
        <h1 className="text-2xl font-bold">公会信箱</h1>
        <p className="text-sm opacity-70">
          来信仅工作人员和本人可见。
        </p>
        <ErrorMessage error={error || query.error?.message} />
        {message && (
          <p role="status" className="alert alert-success">
            {message}
          </p>
        )}
        {query.loading && <p>正在加载…</p>}
        {query.data && (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-bold">公会信箱</h2>
              {query.data.trpgMail.length === 0 && <p>暂无来信</p>}
              {query.data.trpgMail.map((m) => (
                <form
                  key={m.id + String(m.reply)}
                  className="card border border-base-300 p-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void run(() =>
                      reply({
                        variables: { id: m.id, reply: String(f.get("reply")) },
                      }),
                    );
                  }}
                >
                  <h3 className="font-bold">
                    {m.kind === "wish" ? "许愿" : "建议"} · {m.nickname}
                  </h3>
                  <p className="whitespace-pre-wrap py-3">{m.message}</p>
                  <Field label="回复">
                    <textarea
                      className="textarea w-full"
                      name="reply"
                      required
                      maxLength={2000}
                      defaultValue={m.reply || ""}
                    />
                  </Field>
                  <button className="btn" disabled={busy}>
                    保存回复
                  </button>
                </form>
              ))}
              <div className="flex gap-3">
                <button
                  className="btn"
                  disabled={offset === 0 || busy}
                  onClick={() => setOffset(Math.max(0, offset - 30))}
                >
                  上一页
                </button>
                <button
                  className="btn"
                  disabled={query.data.trpgMail.length < 30 || busy}
                  onClick={() => setOffset(offset + 30)}
                >
                  下一页
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
