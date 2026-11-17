import { storeMedia } from "../../config";
import {
  type SessionFieldsFragment,
  SessionsDocument,
  type SessionsQuery,
} from "../../graphql/__generated__/operations";
import { graphql } from "../../services/client";
import { type BoardGroup, recruitmentBoard } from "../../utils/board";
import { definePage } from "../../utils/page";

type Branch = SessionsQuery["trpgStores"][number] & {
  art: string;
  cover: string;
};

definePage({
  data: {
    branches: [] as Branch[],
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
    sessions: [] as SessionFieldsFragment[],
    board: [] as BoardGroup[],
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
  load(append: boolean) {
    return this.run(async () => {
      const d = this.data;
      const result = await graphql(SessionsDocument, {
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
  selectDate(e: WechatMiniprogram.PickerChange) {
    this.setData({ date: String(e.detail.value) });
  },
  inputRule(e: WechatMiniprogram.Input) {
    this.setData({ rule: e.detail.value });
  },
  inputTag(e: WechatMiniprogram.Input) {
    this.setData({ tag: e.detail.value });
  },
  toggleAvailable() {
    this.setData({ available: !this.data.available });
  },
  selectBranch(
    e: WechatMiniprogram.TouchEvent<object, object, { branch?: string }>,
  ) {
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
  open(e: WechatMiniprogram.TouchEvent<object, object, { id: string }>) {
    wx.navigateTo({
      url: `/pages/session/index?id=${encodeURIComponent(e.currentTarget.dataset.id)}`,
    });
  },
  onShareAppMessage() {
    return { title: "骰子奇兵 · 跑团场次", path: "/pages/sessions/index" };
  },
});
