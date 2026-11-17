import { auth, saveToken } from "../../services/client";
import { definePage } from "../../utils/page";

// Executor form: Promise.withResolvers is ES2024, beyond the WeChat baseline.
const code = () =>
  new Promise<string>((resolve, reject) =>
    wx.login({
      success: (r) =>
        r.code ? resolve(r.code) : reject(new Error("微信登录失败")),
      fail: () => reject(new Error("微信登录失败")),
    }),
  );

const requirePrivacy = () =>
  new Promise<void>((resolve, reject) =>
    wx.requirePrivacyAuthorize({
      success: () => resolve(),
      fail: () => reject(new Error("需同意隐私保护指引才能登录")),
    }),
  );

definePage({
  data: {
    phoneNeeded: false,
    nickname: "",
    privacyNeeded: false,
  },
  resolvePrivacy: null as WechatMiniprogram.PrivacyResolve | null,
  privacyListener:
    null as WechatMiniprogram.NeedPrivacyAuthorizationListener | null,
  onLoad() {
    const listener: WechatMiniprogram.NeedPrivacyAuthorizationListener = (
      resolve,
    ) => {
      this.resolvePrivacy = resolve;
      this.setData({ privacyNeeded: true });
    };
    this.privacyListener = listener;
    wx.onNeedPrivacyAuthorization(listener);
  },
  onUnload() {
    if (this.privacyListener)
      wx.offNeedPrivacyAuthorization?.(this.privacyListener);
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
  login() {
    this.run(async () => {
      await requirePrivacy();
      const result = await auth("login", { code: await code() });
      if (this.disposed) return;
      if (!result.accessToken) this.setData({ phoneNeeded: true });
      else this.finish(result.accessToken);
    });
  },
  nickname(e: WechatMiniprogram.Input) {
    this.setData({ nickname: e.detail.value });
  },
  verify(e: WechatMiniprogram.ButtonGetPhoneNumber) {
    const phoneCode = e.detail.code;
    if (!phoneCode) return this.setData({ error: "未获得手机号授权，请重试" });
    const nickname = this.data.nickname.trim();
    if (!nickname) return this.setData({ error: "请先填写昵称" });
    this.run(async () => {
      const result = await auth("verify", {
        code: await code(),
        phoneCode,
        nickname,
      });
      if (this.disposed) return;
      if (!result.accessToken) throw new Error("登录失败，请重试");
      this.finish(result.accessToken);
    });
  },
  finish(accessToken: string) {
    saveToken(accessToken);
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: "/pages/account/index" }),
    });
  },
});
