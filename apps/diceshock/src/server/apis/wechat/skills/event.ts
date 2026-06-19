export const EVENT_SKILL_CONTENT = `
[业务背景]
骰子奇兵定期发布活动资讯和公告，包括赛事通知、促销活动、新品上架等。用户可通过本 skill 了解最新动态。

[工具使用]
查询活动资讯使用 query 工具，查 eventsTable：
- 最新活动列表：query({ graphql: '{ eventsTable { id title summary publishDate coverImage } }' })
- 活动详情：query({ graphql: '{ eventsTable(where: {id: {eq: "活动ID"}}) { id title content publishDate coverImage } }' })

[行为规则]
- 用户问活动、新闻、公告、通知、最近动态、赛事时，直接用 query 查询
- 如果活动有封面图片，以图片类型返回封面链接
- 回复活动详情时附链接：https://diceshock.com/events/{id}
`;
