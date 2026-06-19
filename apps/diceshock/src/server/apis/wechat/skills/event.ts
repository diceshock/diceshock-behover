export const EVENT_SKILL_CONTENT = `[event] 赛事活动公告查询

[eventsTable 字段]
id: text 主键
title: text 标题
content: text 正文内容
createAt: timestamp 发布时间

[查询示例]
最新活动:
query({ graphql: "{ eventsTable(orderBy: {createAt: DESC}, limit: 5) { id title content createAt } }" })

单条详情:
query({ graphql: "{ eventsTableSingle(where: {id: {eq: \\"活动ID\\"}}) { id title content createAt } }" })

[规则]
- 用户问活动/公告/赛事/动态 → 直接 query
- 回复附链接: https://diceshock.com/events/{id}
`;
