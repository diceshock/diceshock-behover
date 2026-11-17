import { storeMedia } from "../../config";
import {
  StoresDocument,
  type StoresQuery,
} from "../../graphql/__generated__/operations";
import { graphql } from "../../services/client";
import type { StoreMedia } from "../../types/store-media";
import { definePage } from "../../utils/page";

definePage({
  data: {
    store: null as StoresQuery["trpgStores"][number] | null,
    media: {} as StoreMedia,
  },
  storeId: "",
  onLoad(options: Record<string, string | undefined>) {
    this.storeId = options.id ?? "";
    this.refresh();
  },
  refresh() {
    this.run(async () => {
      const { trpgStores } = await graphql(StoresDocument);
      const store = trpgStores.find((s) => s.id === this.storeId);
      if (!store) throw new Error("门店不存在或已暂停营业");
      if (!this.disposed)
        this.setData({ store, media: storeMedia[store.id] || {} });
    });
  },
  copy() {
    const address = this.data.store?.address;
    if (address) wx.setClipboardData({ data: address });
  },
  call() {
    const { phone } = this.data.media;
    if (phone) wx.makePhoneCall({ phoneNumber: phone });
  },
  wechat() {
    const { wechat } = this.data.media;
    if (wechat) wx.setClipboardData({ data: wechat });
  },
  preview() {
    const { image } = this.data.media;
    if (image) wx.previewImage({ urls: [image] });
  },
  imageError() {
    this.setData({ "media.image": "" });
  },
});
