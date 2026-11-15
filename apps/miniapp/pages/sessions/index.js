const { graphql } = require("../../services/client");
const operations = require("../../services/operations");
const { storeMedia = {} } = require("../../config");
const { recruitmentBoard } = require("../../utils/board");
const page = require("../../utils/page");
Page({
  ...page,
  data: {
    busy: false,
    error: "",
    branches: [],
    branch: "",
    date: "",
    rule: "",
    tag: "",
    available: false,
    queryDate: "",
    queryRule: "",
    queryTag: "",
    queryAvailable: false,
    filtersOpen: false,
    sessions: [],
    board: [],
    hasMore: false,
  },
  onShow() {
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
      const d = this.data;
      const result = await graphql(operations.sessions, {
        filters: {
          storeId: d.branch || undefined,
          date: d.queryDate || undefined,
          rule: d.queryRule || undefined,
          tag: d.queryTag || undefined,
          available: d.queryAvailable,
          offset: append ? d.sessions.length : 0,
        },
      });
      const sessions = [
        ...(append ? d.sessions : []),
        ...result.trpgSessions.items,
      ];
      if (!this.disposed)
        this.setData({
          sessions,
          board: recruitmentBoard(sessions),
          hasMore: result.trpgSessions.hasMore,
          branches: result.trpgStores.map((s) => ({
            ...s,
            art:
              storeMedia[s.id]?.art ||
              (s.name.includes("街道口")
                ? "jiedaokou"
                : s.name.includes("光谷")
                  ? "guangguli"
                  : ""),
            cover: storeMedia[s.id]?.cover || "",
          })),
        });
    });
  },
  refresh() {
    return this.load(false);
  },
  more() {
    return this.load(true);
  },
  toggleFilters() {
    this.setData({ filtersOpen: !this.data.filtersOpen });
  },
  selectDate(e) {
    this.setData({ date: e.detail.value });
  },
  inputRule(e) {
    this.setData({ rule: e.detail.value });
  },
  inputTag(e) {
    this.setData({ tag: e.detail.value });
  },
  toggleAvailable() {
    this.setData({ available: !this.data.available });
  },
  selectBranch(e) {
    if (this.data.busy) return;
    this.setData({
      branch: e.currentTarget.dataset.branch || "",
      sessions: [],
      board: [],
    });
    this.load(false);
  },
  search() {
    if (this.data.busy) return;
    this.setData({
      queryDate: this.data.date,
      queryRule: this.data.rule.trim(),
      queryTag: this.data.tag.trim(),
      queryAvailable: this.data.available,
      filtersOpen: false,
    });
    this.load(false);
  },
  clearFilters() {
    if (this.data.busy) return;
    this.setData({ date: "", rule: "", tag: "", available: false });
    this.search();
  },
  open(e) {
    wx.navigateTo({
      url:
        "/pages/session/index?id=" +
        encodeURIComponent(e.currentTarget.dataset.id),
    });
  },
  onShareAppMessage() {
    return { title: "骰子奇兵 · 跑团场次", path: "/pages/sessions/index" };
  },
});
