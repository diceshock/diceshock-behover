const { graphql, token } = require("../../services/client");
const operations = require("../../services/operations");
const page = require("../../utils/page");
const { requestId } = require("../../utils/request-id");
Page({
  ...page,
  data: {
    busy: false,
    error: "",
    kind: "suggestion",
    message: "",
    sent: false,
    letters: [],
    hasMore: false,
  },
  onShow() {
    if (token()) this.refresh();
  },
  login() {
    wx.navigateTo({ url: "/pages/login/index" });
  },
  choose(e) {
    this.setData({ kind: e.currentTarget.dataset.kind });
  },
  input(e) {
    this.setData({ message: e.detail.value });
  },
  refresh() {
    return this.run(() => this.load(false));
  },
  more() {
    this.run(() => this.load(true));
  },
  async load(append) {
    const previous = append ? this.data.letters : [];
    const r = await graphql(operations.mail, { offset: previous.length });
    if (!this.disposed)
      this.setData({
        letters: [...previous, ...r.trpgMail],
        hasMore: r.trpgMail.length === 30,
      });
  },
  send() {
    if (!token()) return this.login();
    return this.run(async () => {
      const message = this.data.message.trim();
      if (message.length < 2) throw new Error("请填写至少两个字的来信");
      const payload = JSON.stringify([this.data.kind, message]);
      if (this.payload !== payload) {
        this.payload = payload;
        this.key = requestId();
      }
      await graphql(operations.sendMail, {
        kind: this.data.kind,
        message,
        requestId: this.key,
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
