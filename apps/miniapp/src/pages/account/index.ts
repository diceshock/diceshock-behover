import {
  ProfileDocument,
  type ProfileQuery,
  RecordsDocument,
} from "../../graphql/__generated__/operations";
import { auth, clearToken, graphql, token } from "../../services/client";
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
