import { storeMedia } from "../../config";
import {
  JoinDocument,
  SessionDocument,
  WithdrawDocument,
} from "../../graphql/__generated__/operations";
import { graphql, token } from "../../services/client";
import type { StoreMedia } from "../../types/store-media";
import { definePage, showModal } from "../../utils/page";
import { type SessionView, sessionView } from "../../utils/session";

definePage({
  data: {
    session: null as SessionView | null,
    media: null as StoreMedia | null,
  },
  sessionId: "",
  onLoad(options: Record<string, string | undefined>) {
    this.sessionId = options.id ?? "";
  },
  onShow() {
    if (this.sessionId) this.reload();
    else this.setData({ error: "场次链接无效" });
  },
  reload() {
    return this.run(() => this.load());
  },
  async load() {
    const { trpgSession } = await graphql(SessionDocument, {
      id: this.sessionId,
    });
    if (!this.disposed)
      this.setData({
        session: sessionView(trpgSession),
        media: (trpgSession.storeId && storeMedia[trpgSession.storeId]) || null,
      });
  },
  join() {
    if (!token()) return wx.navigateTo({ url: "/pages/login/index" });
    this.run(async () => {
      await graphql(JoinDocument, { id: this.sessionId });
      await this.load();
    });
  },
  async withdraw() {
    const result = await showModal({
      title: "取消报名",
      content: "取消后席位会释放，确定继续吗？",
    });
    if (result?.confirm)
      this.run(async () => {
        await graphql(WithdrawDocument, { id: this.sessionId });
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
    const phone = this.data.media?.phone;
    if (phone) wx.makePhoneCall({ phoneNumber: phone });
  },
  copyWechat() {
    const wechat = this.data.media?.wechat;
    if (wechat) wx.setClipboardData({ data: wechat });
  },
  copyAddress() {
    const address = this.data.session?.address;
    if (address) wx.setClipboardData({ data: address });
  },
  onShareAppMessage() {
    return {
      title: this.data.session?.title || "骰子奇兵跑团",
      path: `/pages/session/index?id=${encodeURIComponent(this.sessionId)}`,
    };
  },
});
