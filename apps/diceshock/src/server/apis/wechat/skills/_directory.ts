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
在架条件: removeDate eq "1970-01-01T00:00:00.000Z" (这是epoch零值,表示未下架)
推荐: 查 gstone_rating gte 6.5 的前30款在架游戏, 从结果中按 player_num/category 筛选
链接: https://diceshock.com/inventory/{id}`,
    children: ["boardgame.search", "boardgame.recommend", "boardgame.mechanism"],
  },

  "boardgame.search": {
    id: "boardgame.search",
    keywords: ["搜", "找", "查", "有没有"],
    description: "按名称/主题搜索桌游",
    content: () => `搜索策略:
- 具体游戏名 → ilike "%名字%"
- 搜不到缩短关键词或换同义词
- 先搜 sch_name, 再搜 eng_name
返回字段: id sch_name eng_name player_num best_player_num gstone_rating category
回复必须附链接: https://diceshock.com/inventory/{id}`,
  },

  "boardgame.recommend": {
    id: "boardgame.recommend",
    keywords: ["推荐", "适合", "好玩", "什么桌游", "策略"],
    description: "按人数/评分/类型/玩法推荐桌游",
    content:
      () => `执行步骤(严格按顺序,只需1次query):
1. 查询: { boardGamesTable(where: {removeDate: {eq: "1970-01-01T00:00:00.000Z"}, gstone_rating: {gte: 6}}, limit: 30) { id sch_name eng_name player_num best_player_num gstone_rating category } }
2. 从结果中筛选: 用你的桌游知识判断哪些符合用户要求的玩法/机制/人数
3. 推荐3-5款, 附评分+一句话玩法简介+链接

注意:
- category字段是JSON数组,值为 STRATEGY/PARTY/FAMILY/ABSTRACT/THEMATIC/COOPERATIVE/WARGAME
- 但category不包含细分机制(如引擎构筑/工人放置/卡牌驱动),需要用你的桌游知识从游戏名判断
- player_num是JSON数组如[2,3,4],不能WHERE过滤,从结果中人工筛
- 禁止逐个游戏名搜索! 一次query拿30款高分游戏,从中筛选
链接: https://diceshock.com/inventory/{id}`,
  },

  "boardgame.mechanism": {
    id: "boardgame.mechanism",
    keywords: [
      "引擎构筑", "滚雪球", "工人放置", "区域控制",
      "卡牌驱动", "成套收集", "轮抽", "甲板构建",
      "行动点", "网络建设", "拍卖", "手牌管理",
      "engine building", "snowball", "worker placement",
      "area control", "deck building", "drafting",
    ],
    description: "按桌游机制/玩法推荐(引擎构筑/工人放置/区域控制等)",
    content: () => `## 机制查询策略

数据库board_games_table没有mechanism字段！不要尝试 ilike "%引擎构筑%" 或类似写法。

### 正确查询方法
1. 先查高分在架游戏:
   { boardGamesTable(where: {removeDate: {eq: "1970-01-01T00:00:00.000Z"}, gstone_rating: {gte: 6.0}}, limit: 50) { id sch_name eng_name player_num best_player_num gstone_rating category } }
2. 从返回结果中，用你自己的桌游知识判断哪些属于用户要求的机制
3. 按用户的人数、难度等条件进一步筛选
4. 推荐3-5款并说明为什么它属于该机制

### player_num字段说明
player_num是JSON数组，索引0代表1人，索引1代表2人...以此类推。
例如 [0,1,2,3] 表示支持1-4人。筛选时注意换算。

### 常见机制关键词对照（辅助你从结果中筛选）
- 引擎构筑/滚雪球: 每回合产出递增，前期投资后期爆发
- 工人放置: 有限工人占据行动点位
- 区域控制: 占领地图区域争夺积分
- 卡牌驱动/甲板构建: 获取卡牌强化牌库
- 轮抽/成套收集: 从公共池选取组成收藏
- 合作: 多人一起对抗游戏机制
- 行动点: 每回合有限行动点分配
- 网络建设: 构建连接网络获益
- 拍卖: 竞价获取资源

### 回复格式
- 游戏名 — 评分X分, Y人, 为什么属于该机制（一句话）
- 附链接: https://diceshock.com/inventory/{id}
- 如果查询结果里没找到足够匹配的，也可以基于你的知识补充推荐并注明"根据桌游知识推荐，店内可能有货"`,
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
链接: https://diceshock.com/actives/{id}

查参与者名片: 调用 query_active_participants(active_id) 工具
- 仅发起者可调用
- 返回每人昵称+名片(微信/QQ/手机号等)
- 用户问"谁加入了"/"参与者联系方式" → 先query找到约局id, 再调此工具`,
    children: ["active.create", "active.join", "active.list"],
  },

  "active.create": {
    id: "active.create",
    keywords: ["创建", "发起", "新建", "约一个", "帮我约", "约个"],
    description: "创建新约局",
    content:
      () => `必填: title, date(YYYY-MM-DD), startTime(HH:mm), maxPlayers, location(光谷天地/街道口)
可选: gameId(先搜桌游拿id), description

判断用户是否给全信息(5项核心): 游戏名+日期+时间+人数+店铺
- 全部明确给出 → 搜游戏拿id后直接 mutate 创建, 不需要确认
- 有任何一项缺失需要你推断(如: 未说人数你用best_player_num, 未说店铺你用默认值) → 先输出方案等确认
- 搜游戏拿gameId 不算推断, 这是执行步骤

方案格式(仅缺信息时用):
"找到了1817(2020), 最佳3-4人。我建议:
时间: 明天(6/20) 14:00
人数: 4人
店铺: 光谷天地
没问题我直接创建, 有调整告诉我~"

搜桌游返回字段: id sch_name best_player_num player_num
创建: mutate action=create_active params={title,date,startTime,maxPlayers,location,gameId}`,
  },

  "active.join": {
    id: "active.join",
    keywords: [
      "加入",
      "参加",
      "报名",
      "观望",
      "退出",
      "删除",
      "删了",
      "谁加入",
      "参与者",
      "联系方式",
    ],
    description: "加入/观望/退出/删除约局 + 查参与者",
    content: () => `join_active: params={activeId}
watch_active: params={activeId}
leave_active: params={activeId} (创建者调用=删除整个约局)

直接调用 mutate 执行! 系统会自动弹出硬确认让用户回复"确认"。
你不需要在文本里问用户"确定吗", 直接调 leave_active 即可。

批量删除: 先查自己约局(creator_id eq userId), 逐个调 leave_active

查参与者名片: query_active_participants(active_id)
- 需要先知道约局id(用query查或从上下文获取)
- 仅发起者可查看`,
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
    keywords: [
      "会员",
      "手机",
      "绑定",
      "名片",
      "余额",
      "储值",
      "验证码",
      "昵称",
      "改名",
    ],
    description: "会员/手机绑定/名片/昵称管理",
    content:
      () => `${renderSchema(["userMembershipPlansTable", "userInfoTable", "userBusinessCardTable"])}

查会员: { userMembershipPlansTable(where: {user_id: {eq: "当前userId"}}) { id plan_type amount start_date end_date } }
查用户资料: { userInfoTable(where: {id: {eq: "当前userId"}}) { id uid nickname phone } }
查名片: { userBusinessCardTable(where: {id: {eq: "当前userId"}}) { id share_phone wechat qq custom_content } }

修改昵称: mutate action=update_profile params={nickname: "新昵称"}
创建/更新名片: mutate action=upsert_business_card params={wechat: "微信号", qq: "QQ号", custom_content: "简介", share_phone: false}
  - 参数全部可选，只传需要修改的字段
  - share_phone: true=公开手机号, false=不公开
手机绑定两步: send_sms_code params={phone: "手机号"} → (等用户给码) → verify_phone params={phone: "手机号", code: "验证码"}

重要: 查看名片/会员必须先调 query 查数据库,不要凭空编造内容
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
    keywords: [
      "跑团",
      "TRPG",
      "trpg",
      "DND",
      "COC",
      "法术",
      "职业",
      "怪物",
      "规则",
      "5e",
      "5E",
      "战斗",
      "施法",
      "技能检定",
      "先攻",
      "豁免",
      "攻击",
      "伤害",
    ],
    description: "TRPG跑团规则查询/预约",
    content: () => `跑团服务在光谷天地店, 需提前预约DM
预约方式: 加客服微信 DiceShock 或在约局系统发起
DM费用另计, 具体咨询客服

[规则查询]
用 search_rules 工具查询DND5E规则(职业、法术、怪物、物品、战斗等)
用户问规则相关问题 → 调 search_rules(query="关键词") → 用搜索结果简洁回答
回答时: 用自己的话总结,标注来源,不要复制大段原文`,
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

  settings: {
    id: "settings",
    keywords: [
      "设置",
      "语言",
      "language",
      "lang",
      "locale",
      "店铺",
      "切换",
      "switch",
      "English",
      "日本語",
      "japanese",
      "chinese",
      "Deutsch",
      "French",
      "Russian",
      "偏好",
    ],
    description: "语言/店铺偏好设置",
    content:
      () => `设置语言: mutate action=update_preferences params={locale: "CODE"}
设置店铺: mutate action=update_preferences params={store_id: "CODE"}
同时设置: mutate action=update_preferences params={locale: "CODE", store_id: "CODE"}

语言代码: zh_Hans(简体中文) zh_Hant(繁體中文) en(English) ja(日本語) ru(Русский) es(Español) pt(Português) fr(Français) de(Deutsch)
店铺代码: gg(光谷店) jdk(街道口店)

用户可能用自然语言表达:
- "switch to English" / "I want English" → locale: "en"
- "日本語でお願いします" → locale: "ja"
- "切换到街道口店" → store_id: "jdk"
- "change language to Japanese" → locale: "ja"

设置后用新语言确认: "Language set to English." / "言語を日本語に設定しました。"`,
  },

  preference: {
    id: "preference",
    keywords: [
      "偏好",
      "喜好",
      "设置",
      "提醒",
      "推荐",
      "通知",
      "我想玩",
      "帮我找",
    ],
    description: "偏好管理 - 添加/查看/删除/启停约局偏好",
    content: () => `用户约局偏好系统:
- 用户设置时间+类型偏好,系统自动匹配推荐约局
- 偏好格式: 自然语言描述 → 系统解析为: 时间段(rrule) + 类别(trpg/boardgame/mahjong) + 人数(可选)

操作:
- add_preference(raw_text): 添加偏好,系统自动解析时间和类别
- list_preferences(): 查看所有偏好
- delete_preference(preference_index): 删除指定偏好(按序号)
- toggle_preference(preference_index): 启用/停用偏好

示例:
- "每周三晚上想打麻将" → 解析为: 每周三 19:00-22:00 | 日麻
- "周末有空想玩桌游" → 解析为: 每周六、日 14:00-22:00 | 桌游
- "工作日晚上找跑团" → 解析为: 工作日 19:00-22:00 | 跑团

用户说"看看我的偏好"→ list_preferences
用户说"删掉第2个偏好"→ delete_preference(2)
用户说想玩xxx → 先判断是约局意图还是偏好意图:
- 约局意图: 有具体日期 → 走 active 技能
- 偏好意图: 描述 recurring 习惯 → 走 preference 技能`,
    children: ["preference.add", "preference.list", "preference.delete"],
  },

  "preference.add": {
    id: "preference.add",
    keywords: ["添加偏好", "设置偏好", "新建偏好", "想玩", "帮我约"],
    description: "添加新的约局偏好",
    content: () => `调用 add_preference(raw_text)
raw_text 为用户原始描述文本
系统自动解析出: rrule + categories + player_count
解析成功后直接保存,回复确认信息(含解析结果)
解析失败则告知用户重新描述`,
  },

  "preference.list": {
    id: "preference.list",
    keywords: ["我的偏好", "查看偏好", "看看偏好", "偏好列表"],
    description: "查看当前用户所有偏好",
    content: () => `调用 list_preferences()
返回编号列表格式:
1. [启用] 每周三 19:00-22:00 | 日麻 — "原文描述"
2. [停用] 每周六、日 14:00-22:00 | 桌游 — "原文描述"
无偏好时提示用户如何添加`,
  },

  "preference.delete": {
    id: "preference.delete",
    keywords: ["删除偏好", "删掉偏好", "移除偏好", "取消偏好"],
    description: "删除指定偏好",
    content: () => `调用 delete_preference(preference_index)
preference_index 为列表中的序号(从1开始)
用户说"删掉第2个" → delete_preference(2)
删除前不需要二次确认(系统层面不可恢复但不严重)`,
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
