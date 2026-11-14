const { graphql, auth, token, clearToken } = require("../../services/client");
const operations = require("../../services/operations");
const { sessionView } = require("../../utils/session");
const page = require("../../utils/page");
Page({
  ...page,
  data: {
    busy: false,
    error: "",
    profile: null,
    loggedIn: false,
    archive: false,
    records: [],
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
      const data = await graphql(operations.profile);
      if (!this.disposed)
        this.setData({
          profile: {
            ...data.trpgProfile,
            balanceText: (data.trpgProfile.balanceCents / 100).toFixed(2),
          },
        });
      await this.loadRecords(false);
    });
  },
  async loadRecords(append) {
    const previous = append ? this.data.records : [];
    const result = await graphql(operations.records, {
      archive: this.data.archive,
      offset: previous.length,
    });
    if (!this.disposed)
      this.setData({
        records: [...previous, ...result.trpgMyRecords.items.map(sessionView)],
        hasMore: result.trpgMyRecords.hasMore,
      });
  },
  changeMode(e) {
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
