const { graphql, token } = require("../../services/client");
const operations = require("../../services/operations");
const page = require("../../utils/page");
const { requestId } = require("../../utils/request-id");
const { localTime } = require("../../utils/session");
Page({
  ...page,
  data: {
    busy: false,
    error: "",
    offers: [],
    vouchers: [],
    points: null,
    loggedIn: false,
    hasMore: false,
  },
  onShow() {
    this.refresh();
  },
  login() {
    wx.navigateTo({ url: "/pages/login/index" });
  },
  refresh() {
    return this.run(async () => {
      const r = await graphql(operations.rewards);
      if (!this.disposed)
        this.setData({
          offers: r.trpgRewards,
          loggedIn: !!token(),
          points: null,
          vouchers: [],
        });
      if (token()) await this.load(false);
    });
  },
  async load(append) {
    const previous = append ? this.data.vouchers : [];
    const [p, v] = await Promise.all([
      graphql(operations.profile),
      graphql(operations.vouchers, { offset: previous.length }),
    ]);
    if (!this.disposed)
      this.setData({
        points: p.trpgProfile.points,
        vouchers: [
          ...previous,
          ...v.trpgVouchers.map((row) => ({
            ...row,
            usedLabel: row.usedAt
              ? localTime(new Date(Number(row.usedAt)).toISOString())
              : "",
          })),
        ],
        hasMore: v.trpgVouchers.length === 30,
      });
  },
  more() {
    this.run(() => this.load(true));
  },
  async redeem(e) {
    if (this.data.busy) return;
    const offer = this.data.offers.find(
      (r) => r.id === e.currentTarget.dataset.id,
    );
    if (!offer) return;
    const yes = await new Promise((resolve) =>
      wx.showModal({
        title: "确认兑换",
        content: `使用 ${offer.points} 积分兑换「${offer.title}」？`,
        success: resolve,
      }),
    );
    if (!yes.confirm) return;
    this.run(async () => {
      if (this.rewardId !== offer.id) {
        this.rewardId = offer.id;
        this.key = requestId();
      }
      await graphql(operations.redeem, { id: offer.id, requestId: this.key });
      this.key = null;
      this.rewardId = null;
      await this.load(false);
      const r = await graphql(operations.rewards);
      if (!this.disposed) this.setData({ offers: r.trpgRewards });
      wx.showToast({ title: "兑换成功" });
    });
  },
  copy(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.id });
  },
});
