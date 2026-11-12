const { apiOrigin } = require("../../config");
const tokenKey = "diceshock-trpg-session";
const states = { interested: "已登记意向", pending: "待门店审核", confirmed: "已报名", rejected: "报名已退回", withdrawn: "已撤回" };
const token = () => wx.getStorageSync(tokenKey);
const query = (entries) => Object.entries(entries).filter(([, value]) => value !== "")
  .map(([key, value]) => key + "=" + encodeURIComponent(value)).join("&");
const local = (ms) => new Date(ms + 28_800_000).toISOString();

function request(path, data) {
  const access = token();
  return new Promise((resolve, reject) => wx.request({
    url: apiOrigin + "/api/trpg" + path,
    method: data === undefined ? "GET" : "POST",
    data,
    header: access ? { Authorization: "Bearer " + access } : {},
    timeout: 12_000,
    success(result) {
      if (result.statusCode >= 200 && result.statusCode < 300) resolve(result.data);
      else {
        if (result.statusCode === 401) wx.removeStorageSync(tokenKey);
        reject(new Error(result.data?.message || "请求失败，请重试"));
      }
    },
    fail: () => reject(new Error("无法连接服务器")),
  }));
}

function code() {
  return new Promise((resolve, reject) => wx.login({
    success: (result) => result.code ? resolve(result.code) : reject(new Error("微信登录失败")),
    fail: () => reject(new Error("微信登录失败")),
  }));
}

function visitGuide(name) {
  if (name.includes("街道口")) return { image: "/assets/jiedaokou.jpg", wechat: "DiceShockJDK" };
  if (name.includes("光谷")) return { image: "/assets/guanggutiandi.jpg", wechat: "DiceShock" };
  return null;
}

function view(row) {
  const scheduled = row.startsAt !== null;
  const start = scheduled ? local(row.startsAt) : "";
  const end = scheduled ? local(row.startsAt + row.durationMinutes * 60_000) : "";
  return {
    ...row,
    visit: visitGuide(row.storeName),
    day: scheduled ? start.slice(0, 10) : "时间待定",
    time: scheduled ? start.slice(11, 16) + "–" + (start.slice(0, 10) !== end.slice(0, 10) ? "次日 " : "") + end.slice(11, 16) : row.timeHint || "时间待定",
    deadlineText: row.deadline ? local(row.deadline).slice(0, 16).replace("T", " ") : "待定",
    progress: row.confirmedCount >= row.minimum ? "已成车" : `还差 ${row.minimum - row.confirmedCount} 人成车`,
    seats: row.remaining > 0 ? `余 ${row.remaining} 位` : row.pendingCount ? "席位暂满" : "已满车",
    fee: row.feeCents ? (row.feeCents / 100).toFixed(2) + " 元／人" : "免费",
    bookingLabel: row.status === "cancelled" ? "场次已取消" : row.status === "completed" && row.bookingStatus === "confirmed"
      ? "已结团" : states[row.bookingStatus] || "",
  };
}

Page({
  data: {
    screen: "home", stores: [], days: [], more: false, count: 0, store: "", date: "", rule: "", tag: "", available: false,
    privacyNeeded: false, session: null, booking: null, roster: [], account: null, authStep: "", nickname: "", busy: false, error: "",
    records: [], recordMode: "registrations", recordMore: false, selectedId: "",
  },
  onLoad(options) {
    wx.onNeedPrivacyAuthorization?.((resolve) => {
      this.privacyAuthorization = resolve;
      this.setData({ privacyNeeded: true });
    });
    if (options.id) this.showDetail(options.id);
    else this.home();
  },
  respondPrivacy(event) {
    const agree = event.currentTarget.dataset.agree === "yes";
    this.privacyAuthorization?.(agree ? { buttonId: "privacy-agree", event: "agree" } : { event: "disagree" });
    this.privacyAuthorization = null;
    this.setData({ privacyNeeded: false });
  },
  openPrivacy() {
    wx.openPrivacyContract?.({ fail: () => this.setData({ error: "暂时无法打开隐私保护指引" }) });
  },
  previewGuide() {
    const image = this.data.session?.visit?.image;
    if (image) wx.previewImage({ urls: [image] });
  },
  callStore() { wx.makePhoneCall({ phoneNumber: "18972316713" }); },
  copyWechat() {
    const wechat = this.data.session?.visit?.wechat;
    if (wechat) wx.setClipboardData({ data: wechat });
  },
  copyAddress() {
    const address = this.data.session?.address;
    if (address) wx.setClipboardData({ data: address });
  },
  clearFilters() {
    if (this.data.busy) return;
    this.setData({ date: "", rule: "", tag: "", available: false });
    this.filter();
  },
  async perform(task) {
    if (this.data.busy) return;
    this.setData({ busy: true, error: "" });
    try { await task(); }
    catch (error) {
      this.setData({ error: error.message });
      if (!token()) this.setData({ account: null, booking: null, roster: [] });
    } finally { this.setData({ busy: false }); }
  },
  home() {
    if (this.data.busy) return;
    this.setData({ screen: "home", selectedId: "", authStep: "" });
    this.perform(async () => {
      this.setData({ stores: await request("/stores") });
      await this.loadSessions(false);
    });
  },
  async loadSessions(append) {
    const { store, date, rule, tag, available, count } = this.data;
    const rows = await request("/sessions?" + query({ store, date, rule: rule.trim(), tag: tag.trim(), available: available ? "1" : "", offset: append ? count : 0 }));
    const days = append ? this.data.days.slice() : [];
    for (const row of rows.map(view)) {
      const previous = days[days.length - 1];
      if (previous?.date === row.day) previous.items.push(row);
      else days.push({ date: row.day, items: [row] });
    }
    this.setData({ days, count: (append ? count : 0) + rows.length, more: rows.length === 30 });
  },
  pickStore(event) {
    if (this.data.busy) return;
    this.setData({ store: event.currentTarget.dataset.id });
    this.filter();
  },
  input(event) { this.setData({ [event.currentTarget.dataset.field]: event.detail.value }); },
  availability(event) { this.setData({ available: event.detail.value }); },
  filter() { this.perform(() => this.loadSessions(false)); },
  more() { this.perform(() => this.loadSessions(true)); },
  open(event) { this.showDetail(event.currentTarget.dataset.id); },
  showDetail(id) {
    if (this.data.busy) return;
    this.setData({ screen: "detail", selectedId: id, session: null, booking: null, roster: [], authStep: "" });
    this.perform(() => this.loadDetail());
  },
  async loadDetail() {
    const id = encodeURIComponent(this.data.selectedId);
    const session = view(await request("/sessions/" + id));
    this.setData({ session });
    if (!token()) return;
    const { booking, roster } = await request("/me/sessions/" + id);
    const own = booking && {
      ...booking,
      label: booking.status === "interested" && session.startsAt !== null
        ? (session.priorityUntil > Date.now() ? "请提交正式报名" : "优先确认已结束")
        : booking.status === "pending" && session.startsAt <= Date.now() ? "报名未确认" : states[booking.status],
    };
    this.setData({ booking: own, roster });
  },
  login() {
    this.perform(async () => {
      const result = await request("/login", { code: await code() });
      if (!result.accessToken) return this.setData({ authStep: "phone" });
      wx.setStorageSync(tokenKey, result.accessToken);
      await this.afterLogin();
    });
  },
  verifyPhone(event) {
    const phoneCode = event.detail.code;
    if (!phoneCode || !this.data.nickname.trim()) {
      return this.setData({ error: phoneCode ? "请填写称呼后重试" : "请授权手机号后重试" });
    }
    this.perform(async () => {
      const result = await request("/verify", { code: await code(), phoneCode, nickname: this.data.nickname.trim() });
      wx.setStorageSync(tokenKey, result.accessToken);
      await this.afterLogin();
    });
  },
  async afterLogin() {
    this.setData({ authStep: "" });
    if (this.data.screen === "detail") await this.loadDetail();
    else await this.loadAccount();
  },
  registration(event) {
    const action = event.currentTarget.dataset.action;
    if (!token()) return this.login();
    this.perform(async () => {
      await request("/me/sessions/" + encodeURIComponent(this.data.selectedId) + "/" + action, {});
      await this.loadDetail();
    });
  },
  account() {
    if (this.data.busy) return;
    this.setData({ screen: "account", authStep: "", selectedId: "", records: [], recordMode: "registrations" });
    if (token()) this.perform(() => this.loadAccount());
  },
  async loadAccount() {
    this.setData({ account: await request("/me") });
    await this.loadRecords(false);
  },
  changeRecords(event) {
    if (this.data.busy) return;
    this.setData({ recordMode: event.currentTarget.dataset.mode, records: [], recordMore: false });
    this.perform(() => this.loadRecords(false));
  },
  async loadRecords(append) {
    const previous = append ? this.data.records : [];
    const rows = await request("/me/" + this.data.recordMode + "?offset=" + previous.length);
    this.setData({ records: [...previous, ...rows.map(view)], recordMore: rows.length === 30 });
  },
  moreRecords() { this.perform(() => this.loadRecords(true)); },
  logout() {
    this.perform(async () => {
      try { await request("/me/logout", {}); }
      finally { wx.removeStorageSync(tokenKey); this.setData({ account: null, records: [] }); }
    });
  },
  onShareAppMessage() {
    const { session, selectedId } = this.data;
    return { title: session?.title || "骰子奇兵 · 跑团约局", path: "/pages/trpg/index" + (selectedId ? "?id=" + encodeURIComponent(selectedId) : "") };
  },
});
