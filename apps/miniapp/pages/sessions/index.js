const { graphql } = require("../../services/client");
const operations = require("../../services/operations");
const { sessionView } = require("../../utils/session");
const page = require("../../utils/page");
Page({
  ...page,
  data: {
    busy: false,
    error: "",
    stores: [],
    storeIndex: 0,
    date: "",
    rule: "",
    tag: "",
    available: false,
    sessions: [],
    hasMore: false,
  },
  onLoad() {
    this.load(false);
  },
  onPullDownRefresh() {
    this.load(false).finally(() => wx.stopPullDownRefresh());
  },
  onReachBottom() {
    if (this.data.hasMore) this.load(true);
  },
  load(append) {
    return this.run(async () => {
      const { stores, storeIndex, date, rule, tag, available, sessions } =
        this.data;
      const result = await graphql(operations.sessions, {
        filters: {
          storeId: stores[storeIndex]?.id || undefined,
          date: date || undefined,
          rule: rule.trim() || undefined,
          tag: tag.trim() || undefined,
          available,
          offset: append ? sessions.length : 0,
        },
      });
      if (!this.disposed)
        this.setData({
          stores: [{ id: "", name: "全部门店" }, ...result.trpgStores],
          sessions: [
            ...(append ? sessions : []),
            ...result.trpgSessions.items.map(sessionView),
          ],
          hasMore: result.trpgSessions.hasMore,
        });
    });
  },
  pickStore(e) {
    if (this.data.busy) return;
    this.setData({ storeIndex: Number(e.detail.value) });
    this.load(false);
  },
  pickDate(e) {
    this.setData({ date: e.detail.value });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },
  available(e) {
    this.setData({ available: e.detail.value });
  },
  search() {
    this.load(false);
  },
  clear() {
    if (this.data.busy) return;
    this.setData({
      date: "",
      rule: "",
      tag: "",
      available: false,
      storeIndex: 0,
    });
    this.load(false);
  },
  more() {
    this.load(true);
  },
  onShareAppMessage() {
    return { title: "骰子奇兵 · 找一场好团", path: "/pages/sessions/index" };
  },
});
