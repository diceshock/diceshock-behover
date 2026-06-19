export const ACTIVE_INDEX = `[active] 约局查询/创建/加入/退出
对应表: activesTable + activeRegistrationsTable

[场景词条] 按需加载:
- active.list     → 查看约局列表
- active.create   → 创建新约局
- active.join     → 加入/观望/退出约局
- active.update   → 修改约局信息

[快速执行] 查最近约局:
query({ graphql: "{ activesTable(orderBy: {create_at: DESC}, limit: 10) { id title date time maxPlayers creator_id board_game_id } }" })
`;

export const ACTIVE_LIST = `[active.list] 查看约局列表

[场景A] 查所有最近约局:
query({ graphql: "{ activesTable(orderBy: {create_at: DESC}, limit: 10) { id title date time maxPlayers creator_id board_game_id } }" })

[场景B] 查某天的约局（把 DATE 替换为 YYYY-MM-DD）:
query({ graphql: "{ activesTable(where: {date: {eq: \\"DATE\\"}}, limit: 10) { id title date time maxPlayers creator_id } }" })

[场景C] 查某约局的报名情况（把 AID 替换为约局id）:
query({ graphql: "{ activeRegistrationsTable(where: {active_id: {eq: \\"AID\\"}}) { id user_id is_watching create_at } }" })

[回复模板]
最近有X个约局:
1. 标题 - 日期 时间，X人局
...
详情: https://diceshock.com/actives/{id}
`;

export const ACTIVE_CREATE = `[active.create] 创建新约局

[所需信息] 创建前必须收集齐:
- title: 约局标题（必填）
- date: 日期 YYYY-MM-DD（必填）
- startTime: 开始时间 HH:mm（必填）
- maxPlayers: 最大人数（必填）
- location: 店铺名（可选，光谷天地 或 街道口）
- gameId: 关联桌游id（可选，先搜桌游获取id）
- description: 描述（可选）

[执行]
mutate({ action: "create_active", params: { title: "TITLE", date: "DATE", startTime: "TIME", maxPlayers: NUM, location: "LOCATION" }, description: "创建约局" })

[联合场景: 搜桌游+创建约局]
用户说了桌游名时，先用 ilike 搜出 id 再创建:
第1轮: query({ graphql: "{ boardGamesTable(where: {sch_name: {ilike: \\"%桌游名%\\"}}, limit: 5) { id sch_name } }" })
第2轮: mutate({ action: "create_active", params: { title: "桌游名约局", date: "...", startTime: "...", maxPlayers: N, gameId: "搜到的id" }, description: "创建约局" })

[搜桌游注意]
- 搜名字必须用 ilike + %通配符（如 ilike "%1817%"），不要用 eq 精确匹配
- 桌游名可能带后缀（如 "1817 (2020)"），所以搜 "%1817%" 而非 eq "1817"
- 搜不到也可以直接创建约局（gameId 是可选参数，不填也行）

[信息不全时]
- 缺日期/时间/人数 → 追问用户
- 有桌游名但搜不到 → 直接创建（不关联桌游），告知用户游戏不在系统中但约局已建
`;

export const ACTIVE_JOIN = `[active.join] 加入/观望/退出/删除约局

[删除约局] 系统没有 delete_active 操作。删除约局的方式是创建者调用 leave_active。
mutate({ action: "leave_active", params: { activeId: "AID" }, description: "删除约局" })

[加入约局]
mutate({ action: "join_active", params: { activeId: "AID" }, description: "加入约局" })

[观望约局]
mutate({ action: "watch_active", params: { activeId: "AID" }, description: "观望约局" })

[退出约局]
mutate({ action: "leave_active", params: { activeId: "AID" }, description: "退出约局" })

[查自己创建的约局再删除] 需要2轮:
第1轮: query({ graphql: "{ activesTable(where: {creator_id: {eq: \\"USER_ID\\"}}, limit: 10) { id title date } }" })
第2轮: mutate({ action: "leave_active", params: { activeId: "查到的ID" }, description: "删除约局" })

[查约局再加入] 需要2轮:
第1轮: query({ graphql: "{ activesTable(orderBy: {create_at: DESC}, limit: 10) { id title date time maxPlayers } }" })
第2轮: mutate({ action: "join_active", params: { activeId: "选中的ID" }, description: "加入约局" })
`;

export const ACTIVE_UPDATE = `[active.update] 修改约局信息（仅创建者）

[执行] 把 AID 和需要改的字段替换:
mutate({ action: "update_active", params: { activeId: "AID", fields: { title: "新标题" } }, description: "修改约局标题" })

[可修改字段]
- title: 标题
- date: 日期
- time: 时间
- max_players: 人数上限
- board_game_id: 关联桌游

[修改多个字段]
mutate({ action: "update_active", params: { activeId: "AID", fields: { title: "新标题", date: "2025-01-25", max_players: 6 } }, description: "修改约局" })

[注意] 只有创建者能修改，非创建者会返回权限错误
`;

export const ACTIVE_SCHEMA = ACTIVE_INDEX;
export const ACTIVE_MUTATE = ACTIVE_INDEX;
export const ACTIVE_RULES = ACTIVE_INDEX;
