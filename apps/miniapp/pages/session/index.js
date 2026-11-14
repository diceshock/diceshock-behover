const { graphql, token } = require("../../services/client");
const operations = require("../../services/operations");
const { sessionView } = require("../../utils/session");
const { storeMedia } = require("../../config");
const page = require("../../utils/page");
Page({
  ...page,
  data: { busy: false, error: "", session: null, media: null },
  onLoad(options) {
    this.sessionId = options.id;
  },
  onShow() {
    if (this.sessionId) this.reload();
    else this.setData({ error: "场次链接无效" });
  },
  reload() {
    return this.run(() => this.load());
  },
  async load() {
    const result = await graphql(operations.session, { id: this.sessionId });
    if (!this.disposed)
      this.setData({
        session: sessionView(result.trpgSession),
        media: storeMedia[result.trpgSession.storeId] || null,
      });
  },
  join() {
    if (!token()) return wx.navigateTo({ url: "/pages/login/index" });
    this.run(async () => {
      await graphql(operations.join, { id: this.sessionId });
      await this.load();
    });
  },
  async withdraw() {
    const result = await new Promise((resolve) =>
      wx.showModal({
        title: "取消报名",
        content: "取消后席位会释放，确定继续吗？",
        success: resolve,
      }),
    );
    if (result.confirm)
      this.run(async () => {
        await graphql(operations.withdraw, { id: this.sessionId });
        await this.load();
      });
  },
  login() {
    wx.navigateTo({ url: "/pages/login/index" });
  },
  preview() {
    const url = this.data.media?.image;
    if (url) wx.previewImage({ urls: [url] });
  },
  imageError() {
    this.setData({ "media.image": "" });
  },
  call() {
    if (this.data.media?.phone)
      wx.makePhoneCall({ phoneNumber: this.data.media.phone });
  },
  copyWechat() {
    if (this.data.media?.wechat)
      wx.setClipboardData({ data: this.data.media.wechat });
  },
  copyAddress() {
    if (this.data.session?.address)
      wx.setClipboardData({ data: this.data.session.address });
  },
  onShareAppMessage() {
    return {
      title: this.data.session?.title || "骰子奇兵跑团",
      path: `/pages/session/index?id=${encodeURIComponent(this.sessionId || "")}`,
    };
  },
});
