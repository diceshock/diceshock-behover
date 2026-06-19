export const ACTIVE_INDEX = `[active] 约局查询/创建/加入/退出
对应表: activesTable + activeRegistrationsTable

[创建约局] 用户说"约一个XX局"时:
1. 先搜桌游: query({ graphql: "{ boardGamesTable(where: {sch_name: {ilike: \\"%桌游名%\\"}}, limit: 5) { id sch_name best_player_num player_num } }" })
2. 用 best_player_num 推断人数，一次性输出方案让用户确认（含店铺建议）
3. 创建: mutate({ action: "create_active", params: { title: "标题", date: "YYYY-MM-DD", startTime: "HH:mm", maxPlayers: N, gameId: "搜到的id", location: "光谷天地" }, description: "创建约局" })

[查约局]
query({ graphql: "{ activesTable(orderBy: {create_at: DESC}, limit: 10) { id title date time maxPlayers creator_id board_game_id } }" })

[查我的约局] 用当前用户的 userId:
query({ graphql: "{ activesTable(where: {creator_id: {eq: \\"USER_ID\\"}}, limit: 10) { id title date time } }" })

[加入/退出]
mutate({ action: "join_active", params: { activeId: "ID" }, description: "加入约局" })
mutate({ action: "leave_active", params: { activeId: "ID" }, description: "退出/删除约局" })

[注意]
- 搜桌游用 ilike "%名字%"（模糊匹配），不要用 eq
- 没有 delete_active，删除约局 = 创建者 leave_active（会触发硬确认）
- 删除/修改约局会要求用户回复"确认"，agent 只需调用 mutate，系统自动处理确认流程
- 骰子奇兵有两家店: 光谷天地 / 街道口，创建约局时必须确认店铺
- 链接: https://diceshock.com/actives/{id}
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
- location: 店铺名（必填，光谷天地 或 街道口）
- gameId: 关联桌游id（可选，先搜桌游获取id）
- description: 描述（可选）

[智能补全] 不要逐个追问！先搜桌游拿到 best_player_num，然后一次性提出方案:
1. 搜桌游 → 拿到 best_player_num
2. 从用户消息推断时间（"明天下午" = 明天14:00）
3. 缺的信息用合理默认值填充，一次性输出方案让用户确认:
   "找到了XX，最佳N人。建议：时间M月D日 HH:mm / N人局 / 光谷天地店。没问题我直接创建，有调整请告诉我~"
4. 如果用户说了同行人数（如"我们这边有2个"），maxPlayers = best_player_num 或用户指定值

[店铺必问] 骰子奇兵有两家店，用户未指定时必须在方案中带上建议店铺（默认光谷天地）。

[执行]
mutate({ action: "create_active", params: { title: "TITLE", date: "DATE", startTime: "TIME", maxPlayers: NUM, location: "LOCATION" }, description: "创建约局" })

[联合场景: 搜桌游+创建约局]
用户说了桌游名时，先用 ilike 搜出 id 和 best_player_num 再提方案:
第1轮: query({ graphql: "{ boardGamesTable(where: {sch_name: {ilike: \\"%桌游名%\\"}}, limit: 5) { id sch_name best_player_num player_num } }" })
第2轮: 输出完整方案等用户确认（或用户已给全信息则直接创建）
第3轮: mutate({ action: "create_active", params: {...}, description: "创建约局" })

[搜桌游注意]
- 搜名字必须用 ilike + %通配符（如 ilike "%1817%"），不要用 eq 精确匹配
- 桌游名可能带后缀（如 "1817 (2020)"），所以搜 "%1817%" 而非 eq "1817"
- 搜不到也可以直接创建约局（gameId 是可选参数，不填也行）

[用户已给全部信息时]
如果用户消息包含了时间+人数+店铺，直接创建，不需要再确认。
`;

export const ACTIVE_JOIN = `[active.join] 加入/观望/退出/删除约局

[删除约局] 系统没有 delete_active 操作。删除约局的方式是创建者调用 leave_active。
系统会自动要求用户回复"确认"才执行删除，agent 只需调用 mutate 即可。
mutate({ action: "leave_active", params: { activeId: "AID" }, description: "删除约局" })

[加入约局]
mutate({ action: "join_active", params: { activeId: "AID" }, description: "加入约局" })

[观望约局]
mutate({ action: "watch_active", params: { activeId: "AID" }, description: "观望约局" })

[退出约局]
mutate({ action: "leave_active", params: { activeId: "AID" }, description: "退出约局" })

[查自己创建的约局再删除] 需要2轮:
第1轮: query({ graphql: "{ activesTable(where: {creator_id: {eq: \\"USER_ID\\"}}, limit: 10) { id title date } }" })
第2轮: 对每个约局调用 mutate leave_active（系统会逐个要求确认）

[查约局再加入] 需要2轮:
第1轮: query({ graphql: "{ activesTable(orderBy: {create_at: DESC}, limit: 10) { id title date time maxPlayers } }" })
第2轮: mutate({ action: "join_active", params: { activeId: "选中的ID" }, description: "加入约局" })

[批量删除] 如果用户要删除多个约局:
先查出所有自己的约局，列出给用户看，问用户要删哪些（或全部），然后逐个调用 leave_active。
系统会对第一个触发确认。
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
