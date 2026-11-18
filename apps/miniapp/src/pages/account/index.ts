import {
  ProfileDocument,
  type ProfileQuery,
  RecordsDocument,
} from "../../graphql/__generated__/operations";
import {
  auth,
  clearToken,
  graphql,
  qrConfirm,
  token,
} from "../../services/client";
import { definePage } from "../../utils/page";
import { type SessionView, sessionView } from "../../utils/session";

type Profile = ProfileQuery["trpgProfile"] & { balanceText: string };

definePage({
  data: {
    profile: null as Profile | null,
    loggedIn: false,
    archive: false,
    records: [] as SessionView[],
    hasMore: false,
  },
  onShow() {
    const loggedIn = !!token();
    this.setData({ loggedIn, profile: null, records: [], hasMore: false });
    if (loggedIn) this.reload();
  },
  login() {
    wx.navigateTo({ url: "/pages/login/index" });
  },
  reload() {
    return this.run(async () => {
      const { trpgProfile } = await graphql(ProfileDocument);
      if (!this.disposed)
        this.setData({
          profile: {
            ...trpgProfile,
            balanceText: (trpgProfile.balanceCents / 100).toFixed(2),
          },
        });
      await this.loadRecords(false);
    });
  },
  async loadRecords(append: boolean) {
    const previous = append ? this.data.records : [];
    const { trpgMyRecords } = await graphql(RecordsDocument, {
      archive: this.data.archive,
      offset: previous.length,
    });
    if (!this.disposed)
      this.setData({
        records: [...previous, ...trpgMyRecords.items.map(sessionView)],
        hasMore: trpgMyRecords.hasMore,
      });
  },
  changeMode(
    e: WechatMiniprogram.TouchEvent<object, object, { archive?: string }>,
  ) {
    if (this.data.busy) return;
    this.setData({
      archive: e.currentTarget.dataset.archive === "yes",
      records: [],
    });
    this.run(() => this.loadRecords(false));
  },
  more() {
    this.run(() => this.loadRecords(true));
  },
  scanLogin() {
    wx.scanCode({
      success: (res) => {
        const text = res.result ?? "";
        const prefix = "ds-login:";
        if (!text.startsWith(prefix)) {
          wx.showToast({ title: "不是后台登录二维码", icon: "none" });
          return;
        }
        const qrId = text.slice(prefix.length);
        this.run(async () => {
          await qrConfirm(qrId);
          wx.showModal({
            title: "登录成功",
            content: "电脑上的后台页面会自动进入，这里可以关掉了。",
            showCancel: false,
          });
        });
      },
      fail: () => wx.showToast({ title: "未完成扫码", icon: "none" }),
    });
  },
  logout() {
    this.run(async () => {
      try {
        await auth("logout");
      } finally {
        clearToken();
        if (!this.disposed)
          this.setData({
            loggedIn: false,
            profile: null,
            records: [],
            hasMore: false,
          });
      }
    });
  },
});
