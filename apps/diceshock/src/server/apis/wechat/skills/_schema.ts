export interface TableField {
  name: string;
  type: string;
  note?: string;
}

export interface TableSchema {
  table: string;
  description: string;
  fields: TableField[];
}

export const SCHEMAS: Record<string, TableSchema> = {
  boardGamesTable: {
    table: "boardGamesTable",
    description: "桌游库存 (~200款在架)",
    fields: [
      { name: "id", type: "text", note: "主键" },
      { name: "sch_name", type: "text", note: "中文名" },
      { name: "eng_name", type: "text", note: "英文名" },
      { name: "gstone_rating", type: "real", note: "BGG评分" },
      {
        name: "player_num",
        type: "json",
        note: "适用人数数组 (不可WHERE过滤)",
      },
      {
        name: "best_player_num",
        type: "json",
        note: "最佳人数数组 (不可WHERE过滤)",
      },
      { name: "category", type: "json", note: "类型数组 (不可WHERE过滤)" },
      { name: "removeDate", type: "timestamp", note: "下架时间, 0=在架" },
    ],
  },
  activesTable: {
    table: "activesTable",
    description: "约局",
    fields: [
      { name: "id", type: "text", note: "主键" },
      { name: "creator_id", type: "text", note: "创建者userId" },
      { name: "title", type: "text" },
      { name: "board_game_id", type: "text", note: "关联桌游id" },
      { name: "date", type: "text", note: "YYYY-MM-DD" },
      { name: "time", type: "text", note: "HH:mm" },
      { name: "max_players", type: "int" },
      { name: "content", type: "text" },
      { name: "create_at", type: "timestamp" },
    ],
  },
  activeRegistrationsTable: {
    table: "activeRegistrationsTable",
    description: "约局报名",
    fields: [
      { name: "id", type: "text", note: "主键" },
      { name: "active_id", type: "text", note: "约局id" },
      { name: "user_id", type: "text" },
      { name: "is_watching", type: "boolean", note: "true=观望 false=参加" },
      { name: "create_at", type: "timestamp" },
    ],
  },
  leaderboardSnapshotsTable: {
    table: "leaderboardSnapshotsTable",
    description: "日麻排行榜快照",
    fields: [
      { name: "id", type: "text" },
      {
        name: "category",
        type: "text",
        note: "store_4p_hanchan/store_4p_tonpuu/store_3p_hanchan/tournament",
      },
      { name: "period", type: "text", note: "day/week/month" },
      { name: "data", type: "json", note: "数组 [{nickname,pp,rank}]" },
      { name: "computedAt", type: "timestamp" },
    ],
  },
  mahjongMatchesTable: {
    table: "mahjongMatchesTable",
    description: "日麻对局记录",
    fields: [
      { name: "id", type: "text" },
      { name: "matchDate", type: "text" },
      { name: "type", type: "text" },
      { name: "players", type: "json" },
      { name: "scores", type: "json" },
    ],
  },
  userMembershipPlansTable: {
    table: "userMembershipPlansTable",
    description: "会员计划",
    fields: [
      { name: "id", type: "text" },
      { name: "user_id", type: "text" },
      {
        name: "plan_type",
        type: "text",
        note: "monthly/monthly_cc/yearly/stored_value",
      },
      { name: "amount", type: "int", note: "储值金额" },
      { name: "start_date", type: "timestamp" },
      { name: "end_date", type: "timestamp" },
    ],
  },
  userInfoTable: {
    table: "userInfoTable",
    description: "用户资料",
    fields: [
      { name: "id", type: "text", note: "=userId" },
      { name: "uid", type: "text", note: "用户编号" },
      { name: "nickname", type: "text" },
      { name: "phone", type: "text" },
    ],
  },
  userBusinessCardTable: {
    table: "userBusinessCardTable",
    description: "名片",
    fields: [
      { name: "id", type: "text", note: "=userId" },
      { name: "share_phone", type: "boolean" },
      { name: "wechat", type: "text" },
      { name: "qq", type: "text" },
      { name: "custom_content", type: "text" },
    ],
  },
};

export function renderSchema(tableNames: string[]): string {
  return tableNames
    .map((name) => {
      const s = SCHEMAS[name];
      if (!s) return "";
      const fields = s.fields
        .map((f) => `  ${f.name}: ${f.type}${f.note ? ` (${f.note})` : ""}`)
        .join("\n");
      return `${s.table} - ${s.description}\n${fields}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
