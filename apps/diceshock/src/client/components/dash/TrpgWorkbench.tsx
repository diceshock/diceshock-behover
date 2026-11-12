import { type FormEvent, useEffect, useRef, useState } from "react";

type Store = { id: string; name: string };
type Table = { id: string; name: string; capacity: number };
type Session = {
  id: string; title: string; description: string; moduleName: string; gameSystem: string;
  storeId: string; storeName: string; canReview?: boolean; tableId: string | null; tableName: string | null; hostName: string; status: keyof typeof sessionLabels;
  startsAt: number | null; deadline: number | null; minimum: number; capacity: number; remaining: number;
  durationMinutes: number; feeCents: number; confirmedCount: number; pendingCount: number;
  timeHint: string; tags: string[]; revision: number; reason: string | null;
  changedBy?: string | null; changedAt?: number | null;
};
type Member = { id: string; uid: string; nickname: string };
type Attendee = { id: string; nickname: string; status: keyof typeof bookingLabels; phone?: string; reason?: string };
const sessionLabels = { pending: "待审核", returned: "已退回", published: "已发布", cancelled: "已流团", completed: "已结团" };
const bookingLabels = { interested: "已登记意向", pending: "待审核", confirmed: "已确认", rejected: "已退回", withdrawn: "已取消" };
const dateTime = (time: number | null) => time === null ? "" : new Date(time + 28_800_000).toISOString().slice(0, 16);
const beijingTime = (input: FormDataEntryValue | null) => input ? `${input}:00+08:00` : null;

async function request<T>(path: string, body?: object): Promise<T> {
  const response = await fetch("/api/trpg" + path, body === undefined ? undefined : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json<T & { message?: string }>();
  if (!response.ok) throw new Error(result.message || "操作失败，请重试");
  return result;
}

export function TrpgWorkbench() {
  const [stores, setStores] = useState<Store[]>([]);
  const [store, setStore] = useState("");
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [roster, setRoster] = useState<Attendee[]>([]);
  const [editing, setEditing] = useState(false);
  const [timePending, setTimePending] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const draftRequest = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [memberHistory, setMemberHistory] = useState<Session[] | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hostIds, setHostIds] = useState<{ id: string; nickname: string }[]>([]);
  const storeQuery = "?store=" + encodeURIComponent(store);
  const scheduleQuery = store ? storeQuery : "";
  const [page, setPage] = useState(0);

  useEffect(() => {
    let current = true;
    request<{ stores: Store[]; admin: boolean }>("/manage/stores").then((result) => {
      if (!current) return;
      setStores(result.stores);
      setIsAdmin(result.admin);

    }).catch((e: Error) => { if (current) setError(e.message); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    const requestUrl = "/manage/sessions?" + (store ? "store=" + encodeURIComponent(store) + "&" : "") + "offset=" + page * 30;
    Promise.all([
      request<Session[]>(requestUrl),
      store ? request<Table[]>("/manage/tables" + storeQuery) : Promise.resolve([]),
      store ? request<{ canReview: boolean; hosts: { id: string; nickname: string }[] }>("/manage/permissions" + storeQuery)
        : Promise.resolve({ canReview: false, hosts: [] }),
    ]).then(([rows, resources, permissions]) => {
      if (!current) return;
      setSessions(rows);
      setTables(resources);
      setCanReview(permissions.canReview);
      setHostIds(permissions.hosts);
    }).catch((e: Error) => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [store, storeQuery, page]);

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await task(); }
    catch (e) { setError(e instanceof Error ? e.message : "操作失败"); }
    finally { setBusy(false); }
  }

  async function show(item: Session) {
    const [entries, resources] = await Promise.all([
      request<Attendee[]>("/manage/sessions/" + item.id + "/roster"),
      request<Table[]>("/manage/tables?store=" + encodeURIComponent(item.storeId)),
    ]);
    setRoster(entries);
    setTables(resources);
    setSelected(item);
    setEditing(false);
    setSchedule(false);
  }

  async function refresh(id?: string) {
    const rows = await request<Session[]>("/manage/sessions?" +
      (scheduleQuery ? scheduleQuery.slice(1) + "&" : "") + "offset=" + page * 30);
    setSessions(rows);
    const next = rows.find((item) => item.id === id);
    if (next) await show(next);
    else setSelected(null);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    draftRequest.current ??= crypto.randomUUID();
    const input = {
      requestId: draftRequest.current, storeId: selected?.storeId || store, tableId: timePending ? null : String(values.get("table")),
      startsAt: timePending ? null : beijingTime(values.get("startsAt")),
      deadline: timePending ? null : beijingTime(values.get("deadline")),
      title: String(values.get("title")), moduleName: String(values.get("moduleName")),
      gameSystem: String(values.get("gameSystem")), description: String(values.get("description")),
      minimum: Number(values.get("minimum")), capacity: Number(values.get("capacity")),
      durationMinutes: Number(values.get("duration")), feeCents: Math.round(Number(values.get("fee")) * 100),
      timeHint: String(values.get("timeHint") || ""), tags: String(values.get("tags")).split(/[,，、]/).map((tag) => tag.trim()).filter(Boolean),
      hostId: String(values.get("hostId") || "") || undefined,
    };
    void run(async () => {
      if (selected) {
        await request("/manage/sessions/" + selected.id + "/resubmit", { revision: selected.revision, session: input });
        await refresh(selected.id);
      } else {
        const created = await request<Session>("/manage/sessions", input);
        await refresh(created.id);
      }
      setEditing(false);
    });
  }

  function act(action: "approve" | "return" | "cancel" | "complete") {
    if (!selected) return;
    const reason = action === "return" || action === "cancel" ? window.prompt("填写原因")?.trim() : "";
    if ((action === "return" || action === "cancel") && !reason) return;
    void run(async () => {
      await request("/manage/sessions/" + selected.id + "/transition", { revision: selected.revision, action, reason });
      await refresh(selected.id);
    });
  }

  function review(attendee: Attendee, decision: "approve" | "reject" | "withdraw") {
    if (!selected) return;
    const reason = decision === "approve" ? "" : window.prompt("填写原因")?.trim();
    if (decision !== "approve" && !reason) return;
    const depositConfirmed = decision === "approve" && selected.feeCents > 0;
    if (depositConfirmed && !window.confirm("已在微信群确认该玩家的定金到账？")) return;
    void run(async () => {
      await request(`/manage/sessions/${selected.id}/roster/${attendee.id}`, { decision, reason, depositConfirmed });
      await refresh(selected.id);
    });
  }

  const tableOptions = tables.map((table) => <option key={table.id} value={table.id}>{table.name} · {table.capacity} 席</option>);
  return <div className="mx-auto w-full max-w-5xl space-y-5 overflow-y-auto p-4">
    <h1 className="text-2xl font-bold">跑团工作台</h1>
    <div className="flex flex-wrap gap-2">
      <select className="select" aria-label="门店" value={store} disabled={busy} onChange={(e) => {
        setStore(e.target.value); setPage(0); setSelected(null); setSessions([]); setEditing(false); setSchedule(false); setMemberHistory(null); setMembers(null); setError("");
      }}><option value="">所有授权门店</option>{stores.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <button type="button" className="btn btn-primary" disabled={busy || !store} onClick={() => {
        void run(async () => {
          setTables(await request<Table[]>("/manage/tables" + storeQuery));
          draftRequest.current = null;
          setSelected(null); setTimePending(false); setEditing(true); setSchedule(false);
        });
      }}>新建场次</button>
      <button type="button" className="btn" disabled={busy} onClick={() => void run(() => refresh(selected?.id))}>刷新</button>
    </div>
    {error && <p role="alert" className="alert alert-error">{error}</p>}
    {editing && <form key={selected?.id || store} onSubmit={save} className="grid gap-3 rounded-box border border-base-300 p-4 md:grid-cols-2">
      <label>团名<input className="input w-full" name="title" required maxLength={100} defaultValue={selected?.title}/></label>
      <label>规则<input className="input w-full" name="gameSystem" required maxLength={40} defaultValue={selected?.gameSystem}/></label>
      <label>模组<input className="input w-full" name="moduleName" maxLength={100} defaultValue={selected?.moduleName} placeholder="模组待定"/></label>
      {canReview && !selected && <label>主持人<select className="select w-full" name="hostId">
        <option value="">由我主持</option>{hostIds.map((host) => <option key={host.id} value={host.id}>{host.nickname}</option>)}
      </select></label>}
      <label>标签<input className="input w-full" name="tags" defaultValue={selected?.tags.join("，")} placeholder="例如 新手友好、长团"/></label>
      <label>成车人数<input className="input w-full" type="number" name="minimum" min="1" max="6" required defaultValue={selected?.minimum ?? 4}/></label>
      <label>满车人数<input className="input w-full" type="number" name="capacity" min="1" max="6" required defaultValue={selected?.capacity ?? 6}/></label>
      <label>每人费用<input className="input w-full" type="number" name="fee" min="0" step="0.01" required defaultValue={selected ? selected.feeCents / 100 : 118}/></label>
      <label>时长（分钟）<input className="input w-full" type="number" name="duration" min="1" max="1440" required defaultValue={selected?.durationMinutes ?? 300}/></label>
      <label className="md:col-span-2"><input className="checkbox checkbox-sm" type="checkbox" checked={timePending}
        onChange={(e) => setTimePending(e.target.checked)}/> 时间待定，先登记意向</label>
      {timePending ? <label>预计时段<input className="input w-full" name="timeHint" maxLength={40} defaultValue={selected?.timeHint}/></label> :
        <><label>桌位<select className="select w-full" name="table" required defaultValue={selected?.tableId ?? ""}><option value="">请选择桌位</option>{tableOptions}</select></label>
          <label>开团时间（北京时间）<input className="input w-full" type="datetime-local" name="startsAt" required defaultValue={dateTime(selected?.startsAt ?? null)}/></label>
          <label>报名截止（北京时间）<input className="input w-full" type="datetime-local" name="deadline" required defaultValue={dateTime(selected?.deadline ?? null)}/></label></>}
      <label className="md:col-span-2">简介<textarea className="textarea w-full" name="description" required maxLength={1000} defaultValue={selected?.description}/></label>
      <div className="flex gap-2"><button className="btn btn-primary" disabled={busy}>{canReview && !selected ? "发布场次" : "提交审核"}</button>
        <button type="button" className="btn" onClick={() => setEditing(false)}>关闭表单</button></div>
    </form>}
    {!editing && selected && <section className="space-y-3 rounded-box border border-base-300 p-4">
      <div className="flex flex-wrap justify-between gap-2"><h2 className="text-lg font-bold">{selected.title}</h2>
        <button className="btn btn-sm" onClick={() => { setSelected(null); setSchedule(false); }}>关闭详情</button></div>
      <p>{selected.minimum} 人成车 · {selected.capacity} 人满车 · 已确认 {selected.confirmedCount} 人</p>
      {selected.reason && <p className="text-error">{selected.reason}</p>}
      {selected.changedBy && <p className="text-sm opacity-70">最近操作：{selected.changedBy} · {dateTime(selected.changedAt ?? null).replace("T", " ")}</p>}
      {selected.feeCents > 0 && selected.startsAt && selected.confirmedCount < selected.minimum &&
        selected.pendingCount + selected.confirmedCount >= selected.minimum && <p>报名已达成车人数，可以拉群确认定金。</p>}
      <div className="flex flex-wrap gap-2">
        {selected.canReview && selected.status === "pending" && <><button className="btn btn-primary" onClick={() => act("approve")} disabled={busy}>审核发布</button>
          <button className="btn" onClick={() => act("return")} disabled={busy}>退回场次</button></>}
        {selected.status === "returned" && <button className="btn" onClick={() => { setTimePending(!selected.startsAt); setEditing(true); }}>修改再提交</button>}
        {selected.canReview && selected.status === "published" && <>
          {!selected.startsAt && <button className="btn" onClick={() => setSchedule(!schedule)}>确定开团时间</button>}
          {selected.startsAt && selected.startsAt <= Date.now() && <button className="btn btn-primary" onClick={() => act("complete")} disabled={busy}>结团</button>}
          <button className="btn" onClick={() => act("cancel")} disabled={busy}>流团</button>
        </>}
      </div>
      {schedule && <form className="flex flex-wrap gap-2" onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        void run(async () => {
          await request("/manage/sessions/" + selected.id + "/schedule", { revision: selected.revision,
            tableId: String(values.get("table")), startsAt: beijingTime(values.get("startsAt")), deadline: beijingTime(values.get("deadline")) });
          await refresh(selected.id);
        });
      }}>
        <select className="select" name="table" required aria-label="桌位"><option value="">请选择桌位</option>{tableOptions}</select>
        <label>开团<input className="input" type="datetime-local" name="startsAt" required/></label>
        <label>截止<input className="input" type="datetime-local" name="deadline" required/></label>
        <button className="btn btn-primary" disabled={busy}>保存时间</button>
      </form>}
      <h3 className="font-semibold">报名名单</h3>
      {!roster.length && <p>暂无报名。</p>}
      {roster.map((entry) => <div key={entry.id} className="flex flex-wrap items-center gap-2 border-t border-base-300 py-2">
        <span>{entry.nickname} · {bookingLabels[entry.status]} {entry.phone || ""} {entry.reason || ""}</span>
        {selected.canReview && selected.status === "published" && selected.startsAt && selected.startsAt > Date.now() && entry.status === "pending" &&
          <><button className="btn btn-sm btn-primary" onClick={() => review(entry, "approve")} disabled={busy}>通过</button>
            <button className="btn btn-sm" onClick={() => review(entry, "reject")} disabled={busy}>退回</button></>}
        {selected.canReview && selected.status === "published" && ["confirmed", "interested", "pending"].includes(entry.status) &&
          <button className="btn btn-sm" onClick={() => review(entry, "withdraw")} disabled={busy}>代取消</button>}
      </div>)}
    </section>}
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{store ? "门店场次" : "所有门店排期"}</h2>
      {!sessions.length && <p>暂无场次。</p>}
      {sessions.map((item) => <button key={item.id} type="button" className="btn btn-ghost block h-auto w-full border border-base-300 p-3 text-left"
        onClick={() => void run(() => show(item))} disabled={busy}>
        <strong>{item.title}</strong><br/>{dateTime(item.startsAt).replace("T", " ") || "时间待定"} · {item.storeName}{item.tableName ? ` · ${item.tableName}` : ""} · {sessionLabels[item.status]}
        {item.pendingCount > 0 && ` · ${item.pendingCount} 人待审核`}
      </button>)}
      <div className="flex gap-2">
        {page > 0 && <button className="btn btn-sm" onClick={() => setPage(page - 1)}>上一页</button>}
        {sessions.length === 30 && <button className="btn btn-sm" onClick={() => setPage(page + 1)}>下一页</button>}
      </div>
    </section>
    {canReview && <details className="rounded-box border border-base-300 p-4"><summary>会员跑团记录</summary>
      <form className="flex flex-wrap gap-2 py-2" onSubmit={(event) => {
        event.preventDefault();
        const q = String(new FormData(event.currentTarget).get("q")).trim();
        setMemberHistory(null);
        void run(async () => setMembers(await request<Member[]>("/manage/members" + storeQuery + "&q=" + encodeURIComponent(q))));
      }}><input className="input" name="q" placeholder="昵称、会员编号或完整手机号" minLength={2} required/><button className="btn" disabled={busy}>搜索会员</button></form>
      {members?.length === 0 && <p>没有找到会员。</p>}
      {members?.map((member) => <button className="btn btn-sm mr-2" key={member.id} disabled={busy}
        onClick={() => void run(async () => setMemberHistory(await request<Session[]>("/manage/members/" + encodeURIComponent(member.id) + "/history" + storeQuery)))}>
        {member.nickname} · {member.uid}
      </button>)}
      {memberHistory?.length === 0 && <p>暂无已结团记录。</p>}
      {memberHistory?.map((item) => <p key={item.id}>{item.title} · {item.storeName} · {dateTime(item.startsAt).replace("T", " ")} · {item.hostName}</p>)}
    </details>}
    {isAdmin && store && <details className="rounded-box border border-base-300 p-4"><summary>跑团门店授权</summary>
      <form className="flex flex-wrap gap-2 py-2" onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        void run(async () => {
          await request("/manage/access", { id: String(values.get("id")).trim(), store,
            staff: values.has("staff"), host: values.has("host") });
          setError("");
        });
      }}><input className="input" name="id" placeholder="会员账号编号" required/>
        <label><input className="checkbox" type="checkbox" name="staff"/> 此店店员</label>
        <label><input className="checkbox" type="checkbox" name="host"/> 此店主持人</label>
        <button className="btn" disabled={busy}>保存此店权限</button></form>
    </details>}
  </div>;
}
