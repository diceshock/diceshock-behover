import {
  HostStoresDocument,
  type HostStoresQuery,
  ManagedSessionDocument,
  type ManagedSessionFieldsFragment,
  ReviewDocument,
  RosterDocument,
  type RosterQuery,
  ScheduleDocument,
  TablesDocument,
  type TablesQuery,
  TransitionDocument,
} from "../../graphql/__generated__/operations";
import { graphql } from "../../services/client";
import { definePage, showModal } from "../../utils/page";
import { type SessionView, sessionView } from "../../utils/session";

const labels: Record<string, string> = {
  pending: "待审核",
  returned: "已退回",
  published: "已发布",
  cancelled: "已流团",
  completed: "已结团",
  confirmed: "已确认",
  interested: "意向登记",
  rejected: "已退回",
  withdrawn: "已取消",
};

type Action = "approve" | "return" | "cancel" | "complete";
const actionTitles: Record<Action, string> = {
  approve: "审核通过",
  return: "退回修改",
  cancel: "确认流团",
  complete: "确认结团",
};

type ManagedView = SessionView<ManagedSessionFieldsFragment> & {
  statusText: string;
};
type RosterItem = RosterQuery["trpgRoster"]["items"][number] & {
  statusText: string;
};

/** Resolves to the modal result only when confirmed. */
async function confirm(title: string, content: string, editable = false) {
  const result = await showModal({
    title,
    content,
    editable,
    placeholderText: editable ? "请填写原因" : "",
  });
  return result?.confirm ? result : null;
}

function revisionOf(session: ManagedView | null): number {
  if (session?.revision == null) throw new Error("场次版本缺失，请刷新后重试");
  return session.revision;
}

const rosterView = (items: RosterQuery["trpgRoster"]["items"]): RosterItem[] =>
  items.map((x) => ({ ...x, statusText: labels[x.status] ?? "" }));

type PickKey =
  | "storeIndex"
  | "tableIndex"
  | "date"
  | "time"
  | "cutoffDate"
  | "cutoffTime";

definePage({
  data: {
    session: null as ManagedView | null,
    items: [] as RosterItem[],
    hasMore: false,
    stores: [] as HostStoresQuery["trpgStores"],
    storeIndex: 0,
    tables: [] as TablesQuery["trpgTables"],
    tableIndex: 0,
    date: "",
    time: "19:00",
    cutoffDate: "",
    cutoffTime: "18:00",
  },
  sessionId: "",
  onLoad(options: Record<string, string | undefined>) {
    this.sessionId = options.id ?? "";
  },
  onShow() {
    this.reload();
  },
  reload() {
    return this.run(() => this.load());
  },
  async load() {
    const { trpgManagedSession: s } = await graphql(ManagedSessionDocument, {
      id: this.sessionId,
    });
    const { trpgRoster: r } = await graphql(RosterDocument, {
      id: this.sessionId,
      offset: 0,
    });
    const next: Partial<{
      session: ManagedView;
      items: RosterItem[];
      hasMore: boolean;
      stores: HostStoresQuery["trpgStores"];
      storeIndex: number;
      tables: TablesQuery["trpgTables"];
    }> = {
      session: { ...sessionView(s), statusText: labels[s.status] ?? "" },
      items: rosterView(r.items),
      hasMore: r.hasMore,
    };
    let storeId = s.storeId;
    if (!storeId) {
      const { trpgStores } = await graphql(HostStoresDocument);
      next.stores = trpgStores;
      next.storeIndex = 0;
      storeId = trpgStores[0]?.id ?? null;
    }
    if (
      (s.canReview || !s.storeId) &&
      !s.startsAt &&
      s.status === "published" &&
      storeId
    ) {
      const { trpgTables } = await graphql(TablesDocument, { storeId });
      next.tables = trpgTables;
    }
    if (!this.disposed) this.setData(next);
  },
  more() {
    this.run(async () => {
      const { trpgRoster } = await graphql(RosterDocument, {
        id: this.sessionId,
        offset: this.data.items.length,
      });
      if (!this.disposed)
        this.setData({
          items: [...this.data.items, ...rosterView(trpgRoster.items)],
          hasMore: trpgRoster.hasMore,
        });
    });
  },
  edit() {
    wx.navigateTo({
      url: `/pages/host-edit/index?id=${encodeURIComponent(this.sessionId)}`,
    });
  },
  action(e: WechatMiniprogram.TouchEvent<object, object, { action: Action }>) {
    const action = e.currentTarget.dataset.action;
    this.run(async () => {
      const needReason = action === "return" || action === "cancel";
      const result = await confirm(
        actionTitles[action],
        needReason ? "" : "确认执行此操作？",
        needReason,
      );
      if (!result) return;
      const reason = needReason ? (result.content || "").trim() : "";
      if (needReason && !reason) throw new Error("请填写原因");
      await graphql(TransitionDocument, {
        id: this.sessionId,
        revision: revisionOf(this.data.session),
        action,
        reason,
      });
      await this.load();
    });
  },
  review(
    e: WechatMiniprogram.TouchEvent<
      object,
      object,
      { id: string; decision: "approve" | "reject" }
    >,
  ) {
    const { id, decision } = e.currentTarget.dataset;
    this.run(async () => {
      const approve = decision === "approve";
      const result = await confirm(
        approve ? "确认报名" : "退回报名",
        approve ? "请确认已核实该玩家的定金或费用，再确认报名。" : "",
        !approve,
      );
      if (!result) return;
      const reason = approve ? "" : (result.content || "").trim();
      if (!approve && !reason) throw new Error("请填写退回原因");
      await graphql(ReviewDocument, {
        id: this.sessionId,
        registrationId: id,
        decision,
        depositConfirmed: approve,
        reason,
      });
      await this.load();
    });
  },
  pick(e: WechatMiniprogram.PickerChange<object, { key: PickKey }>) {
    const key = e.currentTarget.dataset.key;
    const isIndex = key === "tableIndex" || key === "storeIndex";
    const value = isIndex ? Number(e.detail.value) : e.detail.value;
    this.setData({ [key]: value });
    if (key === "storeIndex")
      this.run(async () => {
        const store = this.data.stores[Number(value)];
        if (!store) return;
        const { trpgTables } = await graphql(TablesDocument, {
          storeId: store.id,
        });
        if (!this.disposed) this.setData({ tables: trpgTables, tableIndex: 0 });
      });
  },
  schedule() {
    this.run(async () => {
      const d = this.data;
      const storeId = d.session?.storeId || d.stores[d.storeIndex]?.id;
      const table = d.tables[d.tableIndex];
      if (!storeId || !d.date || !d.cutoffDate || !table)
        throw new Error("请选择门店、开团日期、截止日期和包间");
      const revision = revisionOf(d.session);
      if (
        !(await confirm(
          "确定地点与排期",
          "确定后将开放正式报名，已有意向玩家会获得优先确认时间。",
        ))
      )
        return;
      await graphql(ScheduleDocument, {
        id: this.sessionId,
        revision,
        tableId: table.id,
        startsAt: `${d.date}T${d.time}:00+08:00`,
        deadline: `${d.cutoffDate}T${d.cutoffTime}:00+08:00`,
        storeId,
      });
      await this.load();
    });
  },
});
