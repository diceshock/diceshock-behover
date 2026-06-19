import { renderSchema } from "./_schema";
import { MUTATE_SYNTAX, QUERY_SYNTAX } from "./_syntax";

export interface SkillNode {
  id: string;
  keywords: string[];
  description: string;
  content: () => string;
  children?: string[];
}

const STORE_INFO = `光谷天地店: 武汉市洪山区高新二路光谷总部国际2栋203, 35元/人, 微信DiceShock
街道口店: 武汉市洪山区珞南街道阜华大厦C座2103, 微信DiceShockJDK`;

const NODES: Record<string, SkillNode> = {
  boardgame: {
    id: "boardgame",
    keywords: ["桌游", "游戏", "库存", "推荐", "评分"],
    description: "桌游库存查询/搜索/推荐",
    content: () => `${renderSchema(["boardGamesTable"])}

搜索: ilike "%关键词%" (sch_name 或 eng_name)
在架条件: removeDate eq 0
推荐: 查 gstone_rating gte 6.5 的前20款, 从结果中按 player_num/category 筛选
链接: https://diceshock.com/inventory/{id}`,
    children: ["boardgame.search", "boardgame.recommend"],
  },

  "boardgame.search": {
    id: "boardgame.search",
    keywords: ["搜", "找", "查", "有没有"],
    description: "按名称/主题搜索桌游",
    content: () => `搜索策略:
- 具体名 → ilike "%名字%"
- 主题/类型 → 用桌游知识联想经典游戏名逐个搜
- 先搜 sch_name, 再搜 eng_name
- 搜不到缩短关键词或换同义词
返回字段: id sch_name eng_name player_num best_player_num gstone_rating category`,
  },

  "boardgame.recommend": {
    id: "boardgame.recommend",
    keywords: ["推荐", "适合", "好玩", "什么桌游"],
    description: "按人数/评分/类型推荐桌游",
    content:
      () => `查询: gstone_rating gte 6.5, removeDate eq 0, orderBy gstone_rating DESC, limit 20
从结果中筛: player_num 包含目标人数 / category 包含目标类型
类型值: STRATEGY / PARTY / FAMILY / ABSTRACT / THEMATIC / COOPERATIVE / WARGAME
推荐3-5款, 附评分和一句简介`,
  },

  active: {
    id: "active",
    keywords: ["约局", "约", "开局", "组局"],
    description: "约局查询/创建/加入/退出",
    content:
      () => `${renderSchema(["activesTable", "activeRegistrationsTable"])}

查我的约局: creator_id eq "当前userId"
没有 delete_active, 删除 = 创建者 leave_active (触发硬确认)
两家店: 光谷天地 / 街道口, 创建时必须确认
链接: https://diceshock.com/actives/{id}`,
    children: ["active.create", "active.join", "active.list"],
  },

  "active.create": {
    id: "active.create",
    keywords: ["创建", "发起", "新建", "约一个", "帮我约", "约个"],
    description: "创建新约局",
    content:
      () => `必填: title, date(YYYY-MM-DD), startTime(HH:mm), maxPlayers, location(光谷天地/街道口)
可选: gameId(先搜桌游拿id), description

智能补全流程:
1. 搜桌游 → 拿 best_player_num 推断人数
2. 从消息推断时间("明天下午"=明天14:00, "晚上"=19:00)
3. 缺信息时一次性输出完整方案: 时间/人数/店铺, 让用户一句话确认
4. 用户已给全部信息 → 直接创建不确认

搜桌游返回字段: id sch_name best_player_num player_num
创建: mutate action=create_active params={title,date,startTime,maxPlayers,location,gameId}`,
  },

  "active.join": {
    id: "active.join",
    keywords: ["加入", "参加", "报名", "观望", "退出", "删除", "删了"],
    description: "加入/观望/退出/删除约局",
    content: () => `join_active: params={activeId}
watch_active: params={activeId}
leave_active: params={activeId} (创建者调用=删除整个约局, 触发硬确认)

批量删除: 先查自己约局(creator_id eq userId), 列出让用户选, 逐个 leave_active`,
  },

  "active.list": {
    id: "active.list",
    keywords: ["查", "看", "有什么", "最近", "列表"],
    description: "查看约局列表",
    content: () => `所有最近: orderBy create_at DESC, limit 10
某天: where date eq "YYYY-MM-DD"
某约局报名: activeRegistrationsTable where active_id eq "ID"
返回字段: id title date time maxPlayers creator_id board_game_id`,
  },

  mahjong: {
    id: "mahjong",
    keywords: ["日麻", "麻将", "战绩", "PP", "段位", "排行", "公式站"],
    description: "日麻排行/战绩/绑定公式站",
    content:
      () => `${renderSchema(["leaderboardSnapshotsTable", "mahjongMatchesTable"])}

排行: category eq "store_4p_hanchan", orderBy computedAt DESC, limit 1
类型: store_4p_hanchan / store_4p_tonpuu / store_3p_hanchan / tournament
周期: day / week / month
绑定: mutate action=bind_gsz
链接: https://diceshock.com/my-riichi/{id}`,
  },

  account: {
    id: "account",
    keywords: ["会员", "手机", "绑定", "名片", "余额", "储值", "验证码"],
    description: "会员/手机绑定/名片管理",
    content:
      () => `${renderSchema(["userMembershipPlansTable", "userInfoTable", "userBusinessCardTable"])}

手机绑定两步: send_sms_code → (等用户给码) → verify_phone
名片: mutate action=upsert_business_card
个人中心: https://diceshock.com/me`,
  },

  general: {
    id: "general",
    keywords: [
      "地址",
      "在哪",
      "营业",
      "价格",
      "多少钱",
      "怎么去",
      "联系",
      "几点",
    ],
    description: "店铺信息/地址/价格",
    content: () => STORE_INFO,
  },

  trpg: {
    id: "trpg",
    keywords: ["跑团", "TRPG", "trpg", "DND", "COC"],
    description: "TRPG跑团信息",
    content: () => `跑团服务在光谷天地店, 需提前预约DM
预约方式: 加客服微信 DiceShock 或在约局系统发起
DM费用另计, 具体咨询客服`,
  },

  clocktower: {
    id: "clocktower",
    keywords: ["血染", "钟楼", "说书人", "clocktower"],
    description: "血染钟楼",
    content: () => `血染钟楼在光谷天地店, 需预约说书人
预约方式: 加客服微信 DiceShock 或约局系统发起
至少5人开局, 说书人费用另计`,
  },

  event: {
    id: "event",
    keywords: ["赛事", "比赛", "公告", "活动公告"],
    description: "赛事/活动公告",
    content:
      () => `查最新活动: eventsTable where is_published eq true, orderBy create_at DESC, limit 5
返回: id title description create_at
链接: https://diceshock.com/events/{id}`,
  },
};

export function getNode(id: string): SkillNode | undefined {
  return NODES[id];
}

export function getAllNodes(): SkillNode[] {
  return Object.values(NODES);
}

export function getTopLevelNodes(): SkillNode[] {
  return Object.values(NODES).filter((n) => !n.id.includes("."));
}

export function renderDirectory(): string {
  return getTopLevelNodes()
    .map((n) => `- ${n.id}: ${n.description}`)
    .join("\n");
}

export function resolveSkillContent(nodeId: string): string {
  const node = NODES[nodeId];
  if (!node) return "";
  return node.content();
}

export function matchNodes(text: string): string[] {
  const hits: string[] = [];

  for (const node of Object.values(NODES)) {
    if (node.keywords.some((kw) => text.includes(kw))) {
      hits.push(node.id);
    }
  }

  if (hits.length === 0) return [];

  const deepest = selectDeepest(hits);
  return deepest.slice(0, 2);
}

function selectDeepest(ids: string[]): string[] {
  const result: string[] = [];

  const sorted = ids.sort((a, b) => b.split(".").length - a.split(".").length);

  const coveredParents = new Set<string>();
  for (const id of sorted) {
    const parent = id.split(".").slice(0, -1).join(".");
    if (parent && coveredParents.has(id)) continue;

    result.push(id);
    if (parent) coveredParents.add(parent);
  }

  return result;
}

export function buildSkillInjection(text: string): string {
  const nodeIds = matchNodes(text);
  if (nodeIds.length === 0) return "";

  return nodeIds
    .map((id) => `[${id}]\n${resolveSkillContent(id)}`)
    .join("\n\n");
}
