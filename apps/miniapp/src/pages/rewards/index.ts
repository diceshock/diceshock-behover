import {
  ProfileDocument,
  RedeemDocument,
  RewardsDocument,
  type RewardsQuery,
  VouchersDocument,
  type VouchersQuery,
} from "../../graphql/__generated__/operations";
import { graphql, token } from "../../services/client";
import { definePage, showModal } from "../../utils/page";
import { requestId } from "../../utils/request-id";
import { localTime } from "../../utils/session";

type Voucher = VouchersQuery["trpgVouchers"][number] & { usedLabel: string };

definePage({
  data: {
    offers: [] as RewardsQuery["trpgRewards"],
    vouchers: [] as Voucher[],
    points: null as number | null,
    loggedIn: false,
    hasMore: false,
  },
  /** Idempotency key reused while the same reward redemption is retried. */
  key: null as string | null,
  rewardId: null as string | null,
  onShow() {
    this.refresh();
  },
  login() {
    wx.navigateTo({ url: "/pages/login/index" });
  },
  refresh() {
    return this.run(async () => {
      const { trpgRewards } = await graphql(RewardsDocument);
      if (!this.disposed)
        this.setData({
          offers: trpgRewards,
          loggedIn: !!token(),
          points: null,
          vouchers: [],
        });
      if (token()) await this.load(false);
    });
  },
  async load(append: boolean) {
    const previous = append ? this.data.vouchers : [];
    const [p, v] = await Promise.all([
      graphql(ProfileDocument),
      graphql(VouchersDocument, { offset: previous.length }),
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
  async redeem(
    e: WechatMiniprogram.TouchEvent<object, object, { id: string }>,
  ) {
    if (this.data.busy) return;
    const offer = this.data.offers.find(
      (r) => r.id === e.currentTarget.dataset.id,
    );
    if (!offer) return;
    const yes = await showModal({
      title: "确认兑换",
      content: `使用 ${offer.points} 积分兑换「${offer.title}」？`,
    });
    if (!yes?.confirm) return;
    this.run(async () => {
      let key = this.key;
      if (this.rewardId !== offer.id || !key) {
        key = requestId();
        this.rewardId = offer.id;
        this.key = key;
      }
      await graphql(RedeemDocument, { id: offer.id, requestId: key });
      this.key = null;
      this.rewardId = null;
      await this.load(false);
      const { trpgRewards } = await graphql(RewardsDocument);
      if (!this.disposed) this.setData({ offers: trpgRewards });
      wx.showToast({ title: "兑换成功" });
    });
  },
  copy(e: WechatMiniprogram.TouchEvent<object, object, { id: string }>) {
    wx.setClipboardData({ data: e.currentTarget.dataset.id });
  },
});
