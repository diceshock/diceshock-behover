export const CONTACT_INFO = "微信: diceshock_admin";

export const STATUS_MESSAGES = {
  THINKING: "正在思考中...",
  QUERYING_INVENTORY: "正在查询桌游库存...",
  QUERYING_ACTIVE: "正在查询约局信息...",
  QUERYING_MAHJONG: "正在查询日麻数据...",
  QUERYING_MEMBERSHIP: "正在查询会员信息...",
  QUERYING_EVENT: "正在查询活动信息...",
  QUERYING_TABLE: "正在查询桌台信息...",
  GENERATING_TOTP: "正在生成验证码...",
} as const;

export const ERROR_MESSAGES = {
  SERVER_ERROR: `服务端错误，请联系管理员\n${CONTACT_INFO}`,
  BUSY: `当前服务繁忙，请稍后再试\n${CONTACT_INFO}`,
  RATE_LIMITED: `今日咨询次数已达上限，明天再来吧~\n如有紧急问题请联系: ${CONTACT_INFO}`,
  TEXT_ONLY: "目前只支持文字消息哦~ 请发送文字描述你的问题",
  AI_UNAVAILABLE: `AI 服务暂时不可用，请稍后再试\n如有紧急问题请联系: ${CONTACT_INFO}`,
  UNKNOWN_ERROR: `出了点问题，请稍后再试\n${CONTACT_INFO}`,
} as const;

const TOOL_STATUS_MAP: Record<string, string> = {
  query_board_game_inventory: STATUS_MESSAGES.QUERYING_INVENTORY,
  query_board_game_count: STATUS_MESSAGES.QUERYING_INVENTORY,
  query_board_game_detail: STATUS_MESSAGES.QUERYING_INVENTORY,
  query_board_game_filter: STATUS_MESSAGES.QUERYING_INVENTORY,
  query_membership_status: STATUS_MESSAGES.QUERYING_MEMBERSHIP,
  query_all_membership_plans: STATUS_MESSAGES.QUERYING_MEMBERSHIP,
  query_my_active_table: STATUS_MESSAGES.QUERYING_TABLE,
  get_user_profile: STATUS_MESSAGES.QUERYING_MEMBERSHIP,
  get_my_business_card: STATUS_MESSAGES.QUERYING_MEMBERSHIP,
  query_leaderboard: STATUS_MESSAGES.QUERYING_MAHJONG,
  query_my_rankings: STATUS_MESSAGES.QUERYING_MAHJONG,
  query_my_match_history: STATUS_MESSAGES.QUERYING_MAHJONG,
  query_my_pp_stats: STATUS_MESSAGES.QUERYING_MAHJONG,
  query_my_badges: STATUS_MESSAGES.QUERYING_MAHJONG,
  query_actives_list: STATUS_MESSAGES.QUERYING_ACTIVE,
  query_active_detail: STATUS_MESSAGES.QUERYING_ACTIVE,
  query_active_notifications: STATUS_MESSAGES.QUERYING_ACTIVE,
  query_events_list: STATUS_MESSAGES.QUERYING_EVENT,
  query_event_detail: STATUS_MESSAGES.QUERYING_EVENT,
  generate_totp: STATUS_MESSAGES.GENERATING_TOTP,
};

export function getToolStatusMessage(toolName: string): string {
  return TOOL_STATUS_MAP[toolName] ?? STATUS_MESSAGES.THINKING;
}
