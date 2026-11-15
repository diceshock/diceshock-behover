const { graphql } = require("../../services/client");
const operations = require("../../services/operations");
const { storeMedia = {} } = require("../../config");
const page = require("../../utils/page");
Page({
  ...page,
  data: { busy: false, error: "", store: null, media: {} },
  onLoad(o) {
    this.id = o.id;
    this.refresh();
  },
  refresh() {
    this.run(async () => {
      const r = await graphql(operations.stores);
      const store = r.trpgStores.find((s) => s.id === this.id);
      if (!store) throw new Error("门店不存在或已暂停营业");
      if (!this.disposed)
        this.setData({ store, media: storeMedia[store.id] || {} });
    });
  },
  copy() {
    if (this.data.store.address)
      wx.setClipboardData({ data: this.data.store.address });
  },
  call() {
    if (this.data.media.phone)
      wx.makePhoneCall({ phoneNumber: this.data.media.phone });
  },
  wechat() {
    if (this.data.media.wechat)
      wx.setClipboardData({ data: this.data.media.wechat });
  },
  preview() {
    if (this.data.media.image)
      wx.previewImage({ urls: [this.data.media.image] });
  },
  imageError() {
    this.setData({ "media.image": "" });
  },
});
