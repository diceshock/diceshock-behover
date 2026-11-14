const { auth, saveToken } = require("../../services/client");
const page = require("../../utils/page");
const code = () =>
  new Promise((resolve, reject) =>
    wx.login({
      success: (r) =>
        r.code ? resolve(r.code) : reject(new Error("微信登录失败")),
      fail: () => reject(new Error("微信登录失败")),
    }),
  );
Page({
  ...page,
  data: {
    busy: false,
    error: "",
    phoneNeeded: false,
    nickname: "",
    privacyNeeded: false,
  },
  onLoad() {
    this.privacyListener = (resolve) => {
      this.resolvePrivacy = resolve;
      this.setData({ privacyNeeded: true });
    };
    wx.onNeedPrivacyAuthorization(this.privacyListener);
  },
  onUnload() {
    this.disposed = true;
    wx.offNeedPrivacyAuthorization(this.privacyListener);
    this.resolvePrivacy?.({ event: "disagree" });
    this.resolvePrivacy = null;
  },
  openPrivacy() {
    wx.openPrivacyContract({
      fail: () => this.setData({ error: "无法打开隐私保护指引，请稍后重试" }),
    });
  },
  agree() {
    this.resolvePrivacy?.({ buttonId: "agree-privacy", event: "agree" });
    this.resolvePrivacy = null;
    this.setData({ privacyNeeded: false });
  },
  decline() {
    this.resolvePrivacy?.({ event: "disagree" });
    this.resolvePrivacy = null;
    this.setData({ privacyNeeded: false });
  },
  async privacy() {
    return new Promise((resolve, reject) =>
      wx.requirePrivacyAuthorize({
        success: resolve,
        fail: () => reject(new Error("需同意隐私保护指引才能登录")),
      }),
    );
  },
  login() {
    this.run(async () => {
      await this.privacy();
      const result = await auth("login", { code: await code() });
      if (this.disposed) return;
      if (!result.accessToken) this.setData({ phoneNeeded: true });
      else this.finish(result.accessToken);
    });
  },
  nickname(e) {
    this.setData({ nickname: e.detail.value });
  },
  verify(e) {
    if (!e.detail.code)
      return this.setData({ error: "未获得手机号授权，请重试" });
    const nickname = this.data.nickname.trim();
    if (!nickname) return this.setData({ error: "请先填写昵称" });
    this.run(async () => {
      const result = await auth("verify", {
        code: await code(),
        phoneCode: e.detail.code,
        nickname,
      });
      if (!this.disposed) this.finish(result.accessToken);
    });
  },
  finish(token) {
    saveToken(token);
    wx.navigateBack({
      fail: () => wx.switchTab({ url: "/pages/account/index" }),
    });
  },
});
