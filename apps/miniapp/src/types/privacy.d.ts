// Corrects miniprogram-api-typings 5.3.1, which types the listener argument
// as GeneralCallbackResult. Signature per
// https://developers.weixin.qq.com/miniprogram/dev/api/open-api/privacy/wx.onNeedPrivacyAuthorization.html
declare namespace WechatMiniprogram {
  interface PrivacyResolveOption {
    event: "exposureAuthorization" | "agree" | "disagree";
    /** Required when `event` is `agree`. */
    buttonId?: string;
  }
  type PrivacyResolve = (option: PrivacyResolveOption) => void;
  type NeedPrivacyAuthorizationListener = (
    resolve: PrivacyResolve,
    eventInfo: { referrer: string },
  ) => void;

  interface Wx {
    onNeedPrivacyAuthorization(
      listener: NeedPrivacyAuthorizationListener,
    ): void;
    /** Undocumented; registration is override-style, so absence is harmless. */
    offNeedPrivacyAuthorization?: (
      listener: NeedPrivacyAuthorizationListener,
    ) => void;
  }
}
