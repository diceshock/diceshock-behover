import { MUTATE_ACTIONS } from "../graphql/mutateActions";

export const QUERY_SYNTAX = `{ 表名(where: {字段: {操作符: 值}}, orderBy: {字段: DESC}, limit: N) { 返回字段 } }
操作符: eq ne gt gte lt lte like notLike inArray notInArray isNull isNotNull
like "%词%" = 包含, "词%" = 开头, "%词" = 结尾 (大小写不敏感)
json类型字段(player_num/category/data)不能用where过滤,查出后在结果中筛`;

export const MUTATE_SYNTAX = `mutate({ action: "动作", params: {参数}, description: "描述" })
动作枚举: ${MUTATE_ACTIONS.join(" / ")}
破坏性操作(leave_active/update_active)会触发硬确认,用户需回复"确认"
没有delete操作,删除约局 = 创建者调 leave_active`;

export const QUERY_TOOL_DESCRIPTION = `读数据库。${QUERY_SYNTAX}`;

export const MUTATE_TOOL_DESCRIPTION = `写数据库。${MUTATE_SYNTAX}`;
