export const BOARDGAME_INDEX = `[boardgame] 桌游库存查询、推荐、详情
对应表: boardGamesTable (约200款在架)

[场景词条] 按需加载一个即可完成任务:
- boardgame.search   → 按名称/主题搜索桌游
- boardgame.recommend → 按人数/评分/类型推荐桌游
- boardgame.detail   → 查单个桌游完整信息

[快速查询] 搜索桌游（把 KEYWORD 替换为关键词）:
query({ graphql: "{ boardGamesTable(where: {sch_name: {ilike: \\"%KEYWORD%\\"}}, limit: 10) { id sch_name eng_name player_num gstone_rating category } }" })

[批量搜索] 搜主题时，同一轮内并行发多个 query 覆盖所有可能的关键词:
例如搜"铁路桌游"，一轮内同时发:
- query: sch_name ilike "%铁路%"
- query: sch_name ilike "%蒸汽%"
- query: eng_name ilike "%18%"
- query: eng_name ilike "%train%"
合并所有结果后一次性回复。这只算1轮调用。
`;

export const BOARDGAME_SEARCH = `[boardgame.search] 按名称/主题搜索桌游

[何时使用] 用户说了桌游名、主题、关键词

[执行] 把 KEYWORD 替换为用户说的关键词:
query({ graphql: "{ boardGamesTable(where: {sch_name: {ilike: \\"%KEYWORD%\\"}}, limit: 10) { id sch_name eng_name player_num gstone_rating category } }" })

[搜索策略 - 充分利用你的桌游知识]
- 用户说具体名字 → 直接搜
- 用户说主题/类型 → 用你对桌游的了解，想出该主题下的经典桌游名，逐个搜
  例: "铁路桌游" → 你知道有 Ticket to Ride(铁路环游)、18XX系列、蒸汽时代、铁路大亨等
  例: "太空桌游" → 你知道有 星球大战、银河竞逐、太空堡垒等
  例: "合作桌游" → 你知道有 瘟疫危机、禁闭岛、鬼故事等
- 先用中文主题词搜 sch_name，搜不到用你知道的该主题经典桌游名搜
- 也可搜 eng_name（如 ilike "%18%"、ilike "%ticket%"）

[示例]

搜具体名:
query({ graphql: "{ boardGamesTable(where: {sch_name: {ilike: \\"%卡坦%\\"}}, limit: 10) { id sch_name eng_name player_num gstone_rating category } }" })

搜主题（铁路相关，先搜中文再搜英文）:
query({ graphql: "{ boardGamesTable(where: {sch_name: {ilike: \\"%铁路%\\"}}, limit: 10) { id sch_name eng_name player_num gstone_rating category } }" })
如果结果少，继续搜你知道的铁路桌游:
query({ graphql: "{ boardGamesTable(where: {eng_name: {ilike: \\"%18%\\"}}, limit: 10) { id sch_name eng_name player_num gstone_rating category } }" })

搜英文名:
query({ graphql: "{ boardGamesTable(where: {eng_name: {ilike: \\"%ticket%\\"}}, limit: 10) { id sch_name eng_name player_num gstone_rating category } }" })

[搜不到时]
- 缩短关键词
- 换同义词（"火车" → "铁路"、"列车"）
- 用你的桌游知识想出该主题的经典游戏名再搜
- 试英文名
- 确实没有就如实告知

[回复模板]
找到了! XXX（英文名），评分X.X，适合X-X人
详情: https://diceshock.com/inventory/{id}
`;

export const BOARDGAME_RECOMMEND = `[boardgame.recommend] 按条件推荐桌游

[何时使用] 用户问推荐/适合X人/什么类型好玩

[执行] 一步完成:
query({ graphql: "{ boardGamesTable(where: {gstone_rating: {gte: 6.5}, removeDate: {eq: 0}}, orderBy: {gstone_rating: DESC}, limit: 20) { id sch_name player_num gstone_rating category } }" })

[拿到结果后]
- 用户要X人 → 从结果中找 player_num 数组包含X的条目
- 用户要某类型 → 从结果中找 category 数组包含该类型的条目
- 类型值: STRATEGY / PARTY / FAMILY / ABSTRACT / THEMATIC / COOPERATIVE / WARGAME

[回复模板] 推荐3-5款:
推荐几款适合X人的桌游:
1. 名称（评分X.X）- 一句话简介
2. ...
链接: https://diceshock.com/inventory/{id}

[注意]
- player_num/category 是 JSON 数组，不能用 where 过滤，只能查出来后在结果中筛
- gstone_rating gte 6.5 + removeDate eq 0 确保只拿在架的高分游戏
- limit 20 足够筛选，不要加大
`;

export const BOARDGAME_DETAIL = `[boardgame.detail] 查单个桌游完整信息

[何时使用] 已知桌游 id，需要详细信息

[执行] 把 ID 替换为实际 id:
query({ graphql: "{ boardGamesTableSingle(where: {id: {eq: \\"ID\\"}}) { id sch_name eng_name gstone_rating player_num best_player_num category } }" })

[回复模板]
名称（英文名）
评分: X.X
适合人数: X-X人（最佳X人）
类型: XXX
详情: https://diceshock.com/inventory/{id}
`;

export const BOARDGAME_SCHEMA = BOARDGAME_INDEX;
export const BOARDGAME_QUERY = BOARDGAME_INDEX;
export const BOARDGAME_RULES = BOARDGAME_INDEX;
