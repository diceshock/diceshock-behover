import {
  type ManagedSessionFieldsFragment,
  WorkbenchDocument,
  type WorkbenchQuery,
} from "../../graphql/__generated__/operations";
import { graphql } from "../../services/client";
import { definePage } from "../../utils/page";
import { type SessionView, sessionView } from "../../utils/session";

const labels: Record<string, string> = {
  pending: "待审核",
  returned: "已退回",
  published: "已发布",
  cancelled: "已流团",
  completed: "已结团",
};
const statusFilters = [
  "",
  "pending",
  "returned",
  "published",
  "cancelled",
  "completed",
];

type StoreOption = Pick<WorkbenchQuery["trpgStores"][number], "id" | "name">;
type WorkbenchItem = SessionView<ManagedSessionFieldsFragment> & {
  statusText: string;
};

definePage({
  data: {
    profile: null as WorkbenchQuery["trpgProfile"] | null,
    items: [] as WorkbenchItem[],
    hasMore: false,
    stores: [] as StoreOption[],
    storeIndex: 0,
    statusIndex: 0,
    statuses: ["全部状态", "待审核", "已退回", "已发布", "已流团", "已结团"],
  },
  onShow() {
    this.reload();
  },
  reload() {
    return this.load(false);
  },
  more() {
    return this.load(true);
  },
  load(append: boolean) {
    return this.run(async () => {
      const offset = append ? this.data.items.length : 0;
      const result = await graphql(WorkbenchDocument, {
        filters: {
          offset,
          storeId: this.data.stores[this.data.storeIndex]?.id || undefined,
          status: statusFilters[this.data.statusIndex] || undefined,
        },
      });
      if (!result.trpgProfile.canHost)
        throw new Error("当前账号没有主持或管理权限");
      if (!this.disposed)
        this.setData({
          profile: result.trpgProfile,
          stores: [{ id: "", name: "全部门店" }, ...result.trpgStores],
          items: [
            ...(append ? this.data.items : []),
            ...result.trpgSessions.items.map((s) => ({
              ...sessionView(s),
              statusText: labels[s.status] ?? "",
            })),
          ],
          hasMore: result.trpgSessions.hasMore,
        });
    });
  },
  filter(
    e: WechatMiniprogram.PickerChange<
      object,
      { key: "storeIndex" | "statusIndex" }
    >,
  ) {
    if (this.data.busy) return;
    this.setData({ [e.currentTarget.dataset.key]: Number(e.detail.value) });
    this.reload();
  },
  create() {
    wx.navigateTo({ url: "/pages/host-edit/index" });
  },
  open(e: WechatMiniprogram.TouchEvent<object, object, { id: string }>) {
    wx.navigateTo({
      url: `/pages/manage-session/index?id=${encodeURIComponent(e.currentTarget.dataset.id)}`,
    });
  },
});
