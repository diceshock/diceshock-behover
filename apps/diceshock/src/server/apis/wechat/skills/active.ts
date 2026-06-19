export const ACTIVE_SKILL_CONTENT = `
[业务背景]
骰子奇兵提供约局功能，用户可以创建、加入、观望、退出各种类型的约局。两家店：
· 光谷天地店（微信: DiceShock）
· 街道口店（微信: DiceShockJDK）

[工具使用]
查询约局使用 query 工具，主要查 activesTable 和 activeRegistrationsTable：
- 约局列表：query({ graphql: '{ activesTable { id title date startTime maxPlayers currentPlayers location gameId } }' })
- 约局详情：query({ graphql: '{ activesTable(where: {id: {eq: "约局ID"}}) { id title date startTime endTime maxPlayers currentPlayers location description creatorId } }' })
- 我的约局：通过关联 activeRegistrationsTable 查询当前用户参与的约局

操作约局使用 mutate 工具：
- 创建：mutate({ action: "create_active", params: { title, date, startTime, maxPlayers, location, description?, gameId?, endTime? } })
- 加入：mutate({ action: "join_active", params: { activeId: "约局ID" } })
- 观望：mutate({ action: "watch_active", params: { activeId: "约局ID" } })
- 退出：mutate({ action: "leave_active", params: { activeId: "约局ID" } })
- 修改（仅发起者）：mutate({ action: "update_active", params: { activeId: "约局ID", fields: { title?, date?, time?, max_players?, board_game_id? } } })

[行为规则]
- 用户说查/看/找约局，直接用 query 查询，不要先问要不要查
- 用户说删除/退出约局，直接用 mutate 的 leave_active
- 用户说创建/发起约局，收集齐标题+日期+人数后直接调 mutate 的 create_active
- 回复约局信息时附链接：https://diceshock.com/actives/{id}
`;
