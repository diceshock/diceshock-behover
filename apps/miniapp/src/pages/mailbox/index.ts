import {
  MailDocument,
  type MailQuery,
  SendMailDocument,
} from "../../graphql/__generated__/operations";
import { graphql, token } from "../../services/client";
import { definePage } from "../../utils/page";
import { requestId } from "../../utils/request-id";

definePage({
  data: {
    kind: "suggestion",
    message: "",
    sent: false,
    letters: [] as MailQuery["trpgMail"],
    hasMore: false,
  },
  /** Idempotency key reused while the same payload is retried. */
  key: null as string | null,
  payload: null as string | null,
  onShow() {
    if (token()) this.refresh();
  },
  login() {
    wx.navigateTo({ url: "/pages/login/index" });
  },
  choose(e: WechatMiniprogram.TouchEvent<object, object, { kind: string }>) {
    this.setData({ kind: e.currentTarget.dataset.kind });
  },
  input(e: WechatMiniprogram.Input) {
    this.setData({ message: e.detail.value });
  },
  refresh() {
    return this.run(() => this.load(false));
  },
  more() {
    this.run(() => this.load(true));
  },
  async load(append: boolean) {
    const previous = append ? this.data.letters : [];
    const { trpgMail } = await graphql(MailDocument, {
      offset: previous.length,
    });
    if (!this.disposed)
      this.setData({
        letters: [...previous, ...trpgMail],
        hasMore: trpgMail.length === 30,
      });
  },
  send() {
    if (!token()) return this.login();
    return this.run(async () => {
      const message = this.data.message.trim();
      if (message.length < 2) throw new Error("请填写至少两个字的来信");
      const payload = JSON.stringify([this.data.kind, message]);
      let key = this.key;
      if (this.payload !== payload || !key) {
        key = requestId();
        this.payload = payload;
        this.key = key;
      }
      await graphql(SendMailDocument, {
        kind: this.data.kind,
        message,
        requestId: key,
      });
      this.key = null;
      this.payload = null;
      if (!this.disposed) this.setData({ sent: true, message: "" });
      await this.load(false);
    });
  },
  again() {
    this.setData({ sent: false });
  },
});
