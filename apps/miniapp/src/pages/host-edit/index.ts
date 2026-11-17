import {
  CreateSessionDocument,
  HostStoresDocument,
  type HostStoresQuery,
  ManagedSessionDocument,
  ResubmitSessionDocument,
  TablesDocument,
  type TablesQuery,
  type TrpgSessionInput,
} from "../../graphql/__generated__/operations";
import { graphql } from "../../services/client";
import { definePage } from "../../utils/page";
import type { SessionType } from "../../utils/pricing";

const sessionTypes: SessionType[] = ["commercial", "club", "test"];

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}

/** ISO instant → Beijing-time ["YYYY-MM-DD", "HH:mm"]. */
function dateParts(iso: string | null): [string, string] {
  if (!iso) return ["", ""];
  const [date = "", time = ""] = new Date(Date.parse(iso) + 28800000)
    .toISOString()
    .slice(0, 16)
    .split("T");
  return [date, time];
}

interface SessionForm {
  /** Set only when editing a returned session; WXML locks the store picker. */
  id?: string;
  title: string;
  moduleName: string;
  gameSystem: string;
  description: string;
  capacity: number | string;
  minimum: number | string;
  durationMinutes: number | string;
  timeHint: string;
  tags: string;
}

type PickKey =
  | "storeIndex"
  | "tableIndex"
  | "typeIndex"
  | "date"
  | "time"
  | "cutoffDate"
  | "cutoffTime";
const indexKeys: PickKey[] = ["storeIndex", "tableIndex", "typeIndex"];

definePage({
  data: {
    ready: false,
    stores: [] as HostStoresQuery["trpgStores"],
    storeIndex: 0,
    tables: [] as TablesQuery["trpgTables"],
    tableIndex: 0,
    typeIndex: 0,
    types: [
      "商团 · 118 元 / 5 小时",
      "俱乐部团 · 当日门票",
      "测试团 · 会员免费",
    ],
    scheduled: false,
    date: "",
    time: "19:00",
    cutoffDate: "",
    cutoffTime: "18:00",
    form: {
      title: "",
      moduleName: "",
      gameSystem: "",
      description: "",
      capacity: 6,
      minimum: 4,
      durationMinutes: 300,
      timeHint: "",
      tags: "",
    } as SessionForm,
  },
  sessionId: "",
  requestId: "",
  revision: 0,
  tableId: null as string | null,
  lastPayload: "",
  onLoad(options: Record<string, string | undefined>) {
    this.sessionId = options.id ?? "";
    this.requestId = uuid();
    this.reload();
  },
  reload() {
    return this.run(async () => {
      const { trpgStores } = await graphql(HostStoresDocument);
      if (!trpgStores.length) throw new Error("当前账号没有发团权限");
      const stores = [
        {
          id: "",
          name: "地点待定",
          canReview: trpgStores.some((x) => x.canReview),
        },
        ...trpgStores,
      ];
      if (!this.sessionId) {
        if (this.disposed) return;
        this.setData({ stores, ready: true });
        await this.loadTables();
        return;
      }
      const { trpgManagedSession: s } = await graphql(ManagedSessionDocument, {
        id: this.sessionId,
      });
      if (!s.canEdit) throw new Error("只有被退回的场次可以修改重提");
      if (s.revision == null) throw new Error("场次版本缺失，请刷新后重试");
      this.revision = s.revision;
      this.tableId = s.tableId;
      const start = dateParts(s.startsAt);
      const end = dateParts(s.deadline);
      if (this.disposed) return;
      this.setData({
        stores,
        ready: true,
        storeIndex: s.storeId ? stores.findIndex((x) => x.id === s.storeId) : 0,
        typeIndex: sessionTypes.indexOf(s.sessionType as SessionType),
        scheduled: !!s.startsAt,
        date: start[0],
        time: start[1] || "19:00",
        cutoffDate: end[0],
        cutoffTime: end[1] || "18:00",
        form: {
          id: s.id,
          title: s.title,
          moduleName: s.moduleName,
          gameSystem: s.gameSystem,
          description: s.description,
          capacity: s.capacity,
          minimum: s.minimum,
          durationMinutes: s.durationMinutes,
          timeHint: s.timeHint ?? "",
          tags: s.tags.join("，"),
        },
      });
      await this.loadTables();
    });
  },
  async loadTables() {
    const store = this.data.stores[this.data.storeIndex];
    if (!store?.id) {
      if (!this.disposed) this.setData({ tables: [], tableIndex: 0 });
      return;
    }
    const { trpgTables } = await graphql(TablesDocument, {
      storeId: store.id,
    });
    if (!this.disposed)
      this.setData({
        tables: trpgTables,
        tableIndex: Math.max(
          0,
          trpgTables.findIndex((t) => t.id === this.tableId),
        ),
      });
  },
  field(
    e: WechatMiniprogram.Input<object, { key: keyof SessionForm }> &
      WechatMiniprogram.TextareaInput<object, { key: keyof SessionForm }>,
  ) {
    this.setData({ [`form.${e.currentTarget.dataset.key}`]: e.detail.value });
  },
  pick(e: WechatMiniprogram.PickerChange<object, { key: PickKey }>) {
    if (this.data.busy) return;
    const key = e.currentTarget.dataset.key;
    this.setData({
      [key]: indexKeys.includes(key) ? Number(e.detail.value) : e.detail.value,
    });
    if (key === "storeIndex") this.run(() => this.loadTables());
  },
  toggle(e: WechatMiniprogram.SwitchChange) {
    const store = this.data.stores[this.data.storeIndex];
    this.setData({ scheduled: !!store?.id && e.detail.value });
  },
  submit() {
    this.run(async () => {
      const d = this.data;
      const f = d.form;
      const store = d.stores[d.storeIndex];
      const tbd = !store?.id;
      const scheduled = !tbd && d.scheduled;
      const input: TrpgSessionInput = {
        requestId: this.requestId,
        storeId: tbd ? null : store.id,
        tableId: scheduled ? d.tables[d.tableIndex]?.id : null,
        title: f.title.trim(),
        description: f.description.trim(),
        moduleName: f.moduleName.trim(),
        gameSystem: f.gameSystem.trim(),
        startsAt: scheduled ? `${d.date}T${d.time}:00+08:00` : null,
        deadline: scheduled ? `${d.cutoffDate}T${d.cutoffTime}:00+08:00` : null,
        timeHint: f.timeHint.trim(),
        tags: f.tags
          .split(/[,，]/)
          .map((x) => x.trim())
          .filter(Boolean),
        capacity: Number(f.capacity),
        minimum: Number(f.minimum),
        durationMinutes: Number(f.durationMinutes),
        sessionType: sessionTypes[d.typeIndex],
      };
      if (!input.title || !input.description || !input.gameSystem)
        throw new Error("请填写标题、规则系统和介绍");
      if (scheduled && (!d.date || !d.cutoffDate || !input.tableId))
        throw new Error("请选择包间、开团日期和截止日期");
      if (input.minimum > input.capacity)
        throw new Error("成团人数不能大于席位数");
      // A changed payload must not reuse the previous idempotency key.
      const fingerprint = JSON.stringify({ ...input, requestId: "" });
      if (this.lastPayload && this.lastPayload !== fingerprint) {
        this.requestId = uuid();
        input.requestId = this.requestId;
      }
      this.lastPayload = fingerprint;
      let id = this.sessionId;
      if (id)
        await graphql(ResubmitSessionDocument, {
          id,
          revision: this.revision,
          input,
        });
      else
        id = (await graphql(CreateSessionDocument, { input })).createTrpgSession
          .id;
      wx.redirectTo({
        url: `/pages/manage-session/index?id=${encodeURIComponent(id)}`,
      });
    });
  },
});
