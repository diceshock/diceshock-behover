const { graphql } = require("../../services/client");
const op = require("../../services/operations");
const page = require("../../utils/page");
const { sessionView } = require("../../utils/session");
const labels = {
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
const confirm = (title, content, editable = false) =>
  new Promise((resolve) =>
    wx.showModal({
      title,
      content,
      editable,
      placeholderText: editable ? "请填写原因" : "",
      success: (r) => resolve(r.confirm ? r : null),
      fail: () => resolve(null),
    }),
  );
Page({
  ...page,
  data: {
    busy: false,
    error: "",
    session: null,
    items: [],
    hasMore: false,
    stores: [],
    storeIndex: 0,
    tables: [],
    tableIndex: 0,
    date: "",
    time: "19:00",
    cutoffDate: "",
    cutoffTime: "18:00",
  },
  onLoad(o) {
    this.id = o.id;
  },
  onShow() {
    this.reload();
  },
  reload() {
    return this.run(() => this.load());
  },
  async load() {
    const { trpgManagedSession: s } = await graphql(op.managedSession, {
      id: this.id,
    });
    const { trpgRoster: r } = await graphql(op.roster, {
      id: this.id,
      offset: 0,
    });
    const next = {
      session: { ...sessionView(s), statusText: labels[s.status] },
      items: r.items.map((x) => ({ ...x, statusText: labels[x.status] })),
      hasMore: r.hasMore,
    };
    let storeId = s.storeId;
    if (!storeId) {
      const st = await graphql(op.hostStores);
      next.stores = st.trpgStores;
      next.storeIndex = 0;
      storeId = st.trpgStores[0]?.id;
    }
    if (
      (s.canReview || !s.storeId) &&
      !s.startsAt &&
      s.status === "published" &&
      storeId
    ) {
      const t = await graphql(op.tables, { storeId });
      next.tables = t.trpgTables;
    }
    if (!this.disposed) this.setData(next);
  },
  more() {
    this.run(async () => {
      const r = await graphql(op.roster, {
        id: this.id,
        offset: this.data.items.length,
      });
      if (!this.disposed)
        this.setData({
          items: [
            ...this.data.items,
            ...r.trpgRoster.items.map((x) => ({
              ...x,
              statusText: labels[x.status],
            })),
          ],
          hasMore: r.trpgRoster.hasMore,
        });
    });
  },
  edit() {
    wx.navigateTo({
      url: `/pages/host-edit/index?id=${encodeURIComponent(this.id)}`,
    });
  },
  action(e) {
    const action = e.currentTarget.dataset.action;
    this.run(async () => {
      const needReason = ["return", "cancel"].includes(action);
      const result = await confirm(
        {
          approve: "审核通过",
          return: "退回修改",
          cancel: "确认流团",
          complete: "确认结团",
        }[action],
        needReason ? "" : "确认执行此操作？",
        needReason,
      );
      if (!result) return;
      const reason = needReason ? (result.content || "").trim() : "";
      if (needReason && !reason) throw new Error("请填写原因");
      await graphql(op.transition, {
        id: this.id,
        revision: this.data.session.revision,
        action,
        reason,
      });
      await this.load();
    });
  },
  review(e) {
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
      await graphql(op.review, {
        id: this.id,
        registrationId: id,
        decision,
        depositConfirmed: approve,
        reason,
      });
      await this.load();
    });
  },
  pick(e) {
    const key = e.currentTarget.dataset.key;
    const value =
      key === "tableIndex" || key === "storeIndex"
        ? Number(e.detail.value)
        : e.detail.value;
    this.setData({ [key]: value });
    if (key === "storeIndex")
      this.run(async () => {
        const store = this.data.stores[value];
        if (!store) return;
        const t = await graphql(op.tables, { storeId: store.id });
        if (!this.disposed)
          this.setData({ tables: t.trpgTables, tableIndex: 0 });
      });
  },
  schedule() {
    this.run(async () => {
      const d = this.data,
        storeId = d.session.storeId || d.stores[d.storeIndex]?.id;
      if (!storeId || !d.date || !d.cutoffDate || !d.tables[d.tableIndex])
        throw new Error("请选择门店、开团日期、截止日期和包间");
      if (
        !(await confirm(
          "确定地点与排期",
          "确定后将开放正式报名，已有意向玩家会获得优先确认时间。",
        ))
      )
        return;
      await graphql(op.schedule, {
        id: this.id,
        revision: d.session.revision,
        tableId: d.tables[d.tableIndex].id,
        startsAt: `${d.date}T${d.time}:00+08:00`,
        deadline: `${d.cutoffDate}T${d.cutoffTime}:00+08:00`,
        storeId,
      });
      await this.load();
    });
  },
});
