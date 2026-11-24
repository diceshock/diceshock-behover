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
    ruleLabels: ["全部规则"] as string[],
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
      // 规则下拉：从已加载场次里去重，按名称排序（"全部规则" 固定第一项）
      const ruleLabels = ["全部规则"];
      for (const s of sessions) {
        const value = s.gameSystem.trim();
        if (value && !ruleLabels.includes(value)) ruleLabels.push(value);
      }
      ruleLabels.sort((a, b) => {
        if (a === "全部规则") return -1;
        if (b === "全部规则") return 1;
        return a.localeCompare(b, "zh-Hans-CN");
      });
      if (!this.disposed)
        this.setData({
          sessions,
          ruleLabels,
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
  selectRule(e: WechatMiniprogram.PickerChange) {
    const index = Number(e.detail.value);
    const label = this.data.ruleLabels[index] ?? "全部规则";
    this.setData({ rule: label === "全部规则" ? "" : label });
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
