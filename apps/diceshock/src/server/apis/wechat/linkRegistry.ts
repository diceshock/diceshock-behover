import type { PageLink, SkillId } from "./types";

const BASE_URL = "https://diceshock.com";

export const SITE_LINKS = {
  inventory: () => `${BASE_URL}/inventory`,
  inventoryDetail: (id: string) => `${BASE_URL}/inventory/${id}`,
  actives: () => `${BASE_URL}/actives`,
  activeDetail: (id: string) => `${BASE_URL}/actives/${id}`,
  activeNew: () => `${BASE_URL}/actives/new`,
  riichi: () => `${BASE_URL}/riichi`,
  myRiichi: () => `${BASE_URL}/my-riichi`,
  matchDetail: (id: string) => `${BASE_URL}/my-riichi/${id}`,
  me: () => `${BASE_URL}/me`,
  table: (code: string) => `${BASE_URL}/t/${code}`,
  eventDetail: (id: string) => `${BASE_URL}/events/${id}`,
  contactUs: () => `${BASE_URL}/contact-us`,
};

export function getRelatedLinks(
  skillId: SkillId,
  context?: Record<string, string>,
): PageLink[] {
  const base: PageLink[] = [{ url: SITE_LINKS.contactUs(), title: "联系我们" }];

  switch (skillId) {
    case "boardgame":
      return [
        { url: SITE_LINKS.inventory(), title: "桌游库存" },
        ...(context?.id
          ? [
              {
                url: SITE_LINKS.inventoryDetail(context.id),
                title: "查看详情",
              },
            ]
          : []),
        ...base,
      ];
    case "active":
      return [
        { url: SITE_LINKS.actives(), title: "活动列表" },
        { url: SITE_LINKS.activeNew(), title: "发起新活动" },
        ...(context?.id
          ? [
              {
                url: SITE_LINKS.activeDetail(context.id),
                title: "活动详情",
              },
            ]
          : []),
        ...base,
      ];
    case "mahjong":
      return [
        { url: SITE_LINKS.riichi(), title: "日麻战绩" },
        { url: SITE_LINKS.myRiichi(), title: "我的对局" },
        ...(context?.id
          ? [
              {
                url: SITE_LINKS.matchDetail(context.id),
                title: "对局详情",
              },
            ]
          : []),
        ...base,
      ];
    case "event":
      return [
        ...(context?.id
          ? [
              {
                url: SITE_LINKS.eventDetail(context.id),
                title: "赛事详情",
              },
            ]
          : []),
        ...base,
      ];
    case "account":
      return [{ url: SITE_LINKS.me(), title: "个人中心" }, ...base];
    default:
      return [
        { url: SITE_LINKS.inventory(), title: "桌游库存" },
        { url: SITE_LINKS.actives(), title: "活动列表" },
        ...base,
      ];
  }
}
