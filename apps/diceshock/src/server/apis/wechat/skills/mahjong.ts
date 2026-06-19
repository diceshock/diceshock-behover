export const MAHJONG_INDEX = `[mahjong] 日麻数据、PP排行、战绩查询
对应表: leaderboardSnapshotsTable, mahjongMatchesTable, userBadgesTable
武汉正规日麻据点, 对接公式站(GSZ) API

[子词条]
- mahjong.schema → 排行榜/对局/徽章表字段定义
- mahjong.query  → 排行榜/战绩查询示例
- mahjong.rules  → 日麻业务规则(赛事类型/约麻流程)

[快速查询] 最新4人半庄排行:
query({ graphql: "{ leaderboardSnapshotsTable(where: {category: {eq: \\"store_4p_hanchan\\"}}, orderBy: {computedAt: DESC}, limit: 1) { id category period data computedAt } }" })

→ active.mutate (创建日麻约局)
→ account.mutate (绑定公式站)
`;

export const MAHJONG_SCHEMA = `[mahjong.schema] 日麻相关表字段定义

表名: leaderboardSnapshotsTable (排行榜快照)
| 字段 | 类型 | 说明 |
| id | text | 主键 |
| category | text | 赛事类型(见rules) |
| period | text | 时间范围: day/week/month |
| snapshotDate | text | 快照日期 |
| data | json | 排行数据数组(含nickname/pp/rank) |
| computedAt | timestamp | 计算时间 |
| createdAt | timestamp | 创建时间 |

表名: mahjongMatchesTable (对局记录)
| 字段 | 类型 | 说明 |
| id | text | 主键 |
| matchDate | text | 对局日期 |
| type | text | 对局类型 |
| players | json | 玩家信息 |
| scores | json | 分数 |
| createdAt | timestamp | |

表名: userBadgesTable (徽章)
| 字段 | 类型 | 说明 |
| id | text | 主键 |
| userId | text | 用户ID |
| badgeType | text | 徽章类型 |
| createdAt | timestamp | |

→ mahjong.query (查询示例)
→ mahjong.rules (赛事类型枚举)
`;

export const MAHJONG_QUERY = `[mahjong.query] 日麻查询示例

最新排行榜(4人半庄):
query({ graphql: "{ leaderboardSnapshotsTable(where: {category: {eq: \\"store_4p_hanchan\\"}}, orderBy: {computedAt: DESC}, limit: 1) { id category period data computedAt } }" })

月度排行:
query({ graphql: "{ leaderboardSnapshotsTable(where: {category: {eq: \\"store_4p_hanchan\\"}, period: {eq: \\"month\\"}}, orderBy: {computedAt: DESC}, limit: 1) { data } }" })

用户徽章:
query({ graphql: "{ userBadgesTable(where: {userId: {eq: \\"用户ID\\"}}) { id badgeType createdAt } }" })

[绑定公式站]
mutate({ action: "bind_gsz", params: { gszId: "GSZ用户ID" }, description: "绑定公式站" })

[链接] https://diceshock.com/my-riichi/{id}

→ mahjong.schema (字段参考)
→ mahjong.rules (赛事类型)
`;

export const MAHJONG_RULES = `[mahjong.rules] 日麻业务规则

[赛事类型 category 枚举值]
- tournament: 锦标赛
- store_4p_hanchan: 店内4人半庄
- store_4p_tonpuu: 店内4人东风
- store_3p_hanchan: 店内3人半庄
- store_3p_tonpuu: 店内3人东风

[时间范围 period 枚举值]
- day: 今日
- week: 本周
- month: 本月

[约麻流程]
- 约麻 = 创建约局, maxPlayers设3或4
- 约麻前确认: 哪家店/时间/3麻还是4麻
- 先查有无约局可加入

[链接]
- 对局: https://diceshock.com/my-riichi/{id}
- 约局: https://diceshock.com/actives/{id}

→ active.mutate (创建约局)
→ account.mutate (绑定公式站 bind_gsz)
`;
