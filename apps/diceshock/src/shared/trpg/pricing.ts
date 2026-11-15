export const sessionTypes = ["commercial", "club", "test"] as const;
export type SessionType = (typeof sessionTypes)[number];
export const pricing = {
  commercial: {
    label: "商团",
    summary: "118 元 / 5 小时 / 人",
    detail: "每人 118 元，包含 5 小时。",
  },
  club: {
    label: "俱乐部团",
    summary: "当日桌游门票",
    detail: "每人按当日桌游门票收费：工作日 40 元，周末及法定节假日 60 元。",
  },
  test: {
    label: "测试团",
    summary: "会员免费 · 其他客人按门票收费",
    detail:
      "会员免费；其他客人按当日桌游门票收费：工作日 40 元，周末及法定节假日 60 元。",
  },
} as const;
export function sessionPricing(type: string) {
  return pricing[type as SessionType] ?? pricing.commercial;
}
