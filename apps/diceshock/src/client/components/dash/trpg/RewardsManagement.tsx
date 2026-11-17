import { useState } from "react";
import {
  type TrpgRewardsAdminQuery,
  useConsumeTrpgVoucherMutation,
  useSaveTrpgRewardMutation,
  useTrpgRewardsAdminQuery,
} from "@/client/graphql/__generated__/trpg";
import { ErrorMessage, Field } from "./common";
import { ManagementNav } from "./ManagementNav";

type Reward = TrpgRewardsAdminQuery["trpgRewards"][number];
export function RewardsManagement() {
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<Reward | null>(null);
  const query = useTrpgRewardsAdminQuery({
    fetchPolicy: "network-only",
  });
  const [save] = useSaveTrpgRewardMutation(),
    [consume] = useConsumeTrpgVoucherMutation();
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
        <h1 className="text-2xl font-bold">积分商城</h1>
        <p className="text-sm opacity-70">
          两店共用商品和会员积分，核销按门店记录。
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
            {query.data.trpgProfile.admin && (
              <form
                key={editing?.id || "new"}
                className="card border border-base-300 p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void run(async () => {
                    await save({
                      variables: {
                        input: {
                          id: editing?.id || crypto.randomUUID(),
                          revision: editing?.revision || 0,
                          title: String(f.get("title")),
                          description: String(f.get("description")),
                          cover: String(f.get("cover")),
                          points: Number(f.get("points")),
                          stock: Number(f.get("stock")),
                          active: f.get("active") === "on",
                        },
                      },
                    });
                    setEditing(null);
                  });
                }}
              >
                <h2 className="text-lg font-bold">
                  {editing ? "编辑商品" : "添加兑换商品"}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="商品名称">
                    <input
                      name="title"
                      className="input w-full"
                      maxLength={80}
                      required
                      defaultValue={editing?.title}
                    />
                  </Field>
                  <Field label="所需积分">
                    <input
                      name="points"
                      className="input w-full"
                      type="number"
                      min={1}
                      max={1000000}
                      required
                      defaultValue={editing?.points || 100}
                    />
                  </Field>
                  <Field label="库存">
                    <input
                      name="stock"
                      className="input w-full"
                      type="number"
                      min={0}
                      max={100000}
                      required
                      defaultValue={editing?.stock ?? 0}
                    />
                  </Field>
                  <Field label="封面 HTTPS 地址（选填）">
                    <input
                      name="cover"
                      type="url"
                      className="input w-full"
                      defaultValue={editing?.cover}
                    />
                  </Field>
                </div>
                <Field label="使用说明">
                  <textarea
                    name="description"
                    className="textarea w-full"
                    maxLength={1000}
                    defaultValue={editing?.description}
                  />
                </Field>
                <label className="label justify-start gap-2">
                  <input
                    name="active"
                    type="checkbox"
                    className="checkbox"
                    defaultChecked={editing?.active}
                  />
                  上架
                </label>
                <div className="flex gap-2">
                  <button className="btn btn-primary" disabled={busy}>
                    保存商品
                  </button>
                  {editing && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setEditing(null)}
                    >
                      取消编辑
                    </button>
                  )}
                </div>
              </form>
            )}
            <section className="grid gap-3 sm:grid-cols-2">
              {query.data.trpgRewards.map((r) => (
                <article key={r.id} className="card border border-base-300 p-4">
                  <h2 className="font-bold">
                    {r.title} · {r.active ? "已上架" : "已下架"}
                  </h2>
                  <p>
                    {r.points} 积分 · 库存 {r.stock}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{r.description}</p>
                  {query.data?.trpgProfile.admin && (
                    <button
                      className="btn btn-sm mt-3"
                      onClick={() => setEditing(r)}
                    >
                      编辑商品
                    </button>
                  )}
                </article>
              ))}
            </section>
            <form
              className="card border border-base-300 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  !window.confirm("确认顾客已领取此福利？核销后不能再次使用。")
                )
                  return;
                void run(() =>
                  consume({
                    variables: {
                      id: String(f.get("id")).trim(),
                      storeId: String(f.get("storeId")),
                    },
                  }),
                );
              }}
            >
              <h2 className="text-lg font-bold">到店核销</h2>
              <Field label="完整兑换券号">
                <input
                  className="input w-full"
                  name="id"
                  required
                  autoComplete="off"
                />
              </Field>
              <Field label="核销门店">
                <select className="select w-full" name="storeId" required>
                  {query.data.trpgStores
                    .filter((s) => s.canReview)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </Field>
              <button className="btn btn-primary" disabled={busy}>
                确认核销
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
