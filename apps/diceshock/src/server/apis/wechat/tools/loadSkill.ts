import {
  ACCOUNT_INDEX,
  ACCOUNT_MUTATE,
  ACCOUNT_RULES,
  ACCOUNT_SCHEMA,
} from "../skills/account";
import {
  ACTIVE_CREATE,
  ACTIVE_INDEX,
  ACTIVE_JOIN,
  ACTIVE_LIST,
  ACTIVE_MUTATE,
  ACTIVE_RULES,
  ACTIVE_SCHEMA,
  ACTIVE_UPDATE,
} from "../skills/active";
import {
  BOARDGAME_DETAIL,
  BOARDGAME_INDEX,
  BOARDGAME_QUERY,
  BOARDGAME_RECOMMEND,
  BOARDGAME_RULES,
  BOARDGAME_SCHEMA,
  BOARDGAME_SEARCH,
} from "../skills/boardgame";
import { CLOCKTOWER_SKILL_CONTENT } from "../skills/clocktower";
import { EVENT_SKILL_CONTENT } from "../skills/event";
import { GENERAL_SKILL_CONTENT } from "../skills/general";
import {
  MAHJONG_INDEX,
  MAHJONG_QUERY,
  MAHJONG_RULES,
  MAHJONG_SCHEMA,
} from "../skills/mahjong";
import { TRPG_SKILL_CONTENT } from "../skills/trpg";
import type { ToolContext } from "./totp";

const META_INDEX = `[_meta] 技能系统参考手册

本系统为你提供对数据库的只读查询(query)和受控写入(mutate)能力。
所有数据访问通过 GraphQL 查询语言进行。

本词条为索引。详细定义在子词条中：

[子词条]
- _meta.query   → query 工具完整语法（怎么写查询）
- _meta.ops     → where 过滤操作符精确定义（每个操作符是什么意思）
- _meta.types   → 字段数据类型定义（哪些能过滤、哪些不能、为什么）
- _meta.terms   → 业务领域术语表（每个概念的精确含义和对应数据表）
- _meta.result  → 查询结果格式说明（返回值长什么样、元数据含义）
- _meta.mutate  → mutate 工具完整语法（怎么执行写操作）

[技能树导航]
load_skill("板块名")       → 该业务领域的概述和子词条索引
load_skill("板块名.schema") → 该领域数据表的字段定义（类型、约束、可否过滤）
load_skill("板块名.query")  → 该领域的查询示例（可直接复制修改参数）
load_skill("板块名.mutate") → 该领域的写操作示例
load_skill("板块名.rules")  → 该领域的业务逻辑和回复规则

[交叉引用]
词条中 "→ xxx.yyy" 表示：该内容的详细定义在 xxx.yyy 词条中，用 load_skill("xxx.yyy") 加载。
`;

const META_QUERY = `[_meta.query] query 工具语法参考

[签名]
query(args: { graphql: string, variables?: object }) → string

[描述]
对数据库执行只读 GraphQL 查询。接受一个 GraphQL 查询字符串，返回 JSON 格式的查询结果。
不能执行写操作（INSERT/UPDATE/DELETE），写操作使用 mutate 工具。

[查询字符串格式]
"{ 表名(参数) { 返回字段 } }"

其中：
- 表名：要查询的数据库表。查多条用表名原名（如 boardGamesTable），查单条用表名+Single（如 boardGamesTableSingle）。
- 参数：可选，控制过滤、排序、分页。全部参数见下方。
- 返回字段：想要获取的列名，用空格分隔。只写需要的字段，不要写全部字段。

[参数详解]

where（过滤）
  作用：只返回满足条件的行。
  语法：where: { 字段名: { 操作符: 值 } }
  多条件：where: { 字段A: { op: val }, 字段B: { op: val } }，多个条件为 AND（同时满足）关系。
  操作符的完整列表和含义 → _meta.ops
  重要限制：json 类型的字段不能用 where 过滤。哪些字段是 json 类型 → 各板块 .schema 词条。

limit（限制数量）
  作用：最多返回几条结果。
  语法：limit: 整数
  约束：禁止超过 30。如果需要更多数据，应该收窄 where 条件，而不是加大 limit。
  默认：如果不写，系统会自动设为 50（但你应该主动设一个合理值）。

offset（偏移/翻页）
  作用：跳过前 N 条结果。
  语法：offset: 整数
  用法：第一页 offset:0，第二页 offset:limit值。
  注意：尽量不要翻页。优先通过更精确的 where 条件获取目标数据。

orderBy（排序）
  作用：按指定字段排序结果。
  语法：orderBy: { 字段名: DESC } 或 orderBy: { 字段名: ASC }
  DESC = 降序（大的在前，如评分从高到低）
  ASC = 升序（小的在前）

[完整示例]

示例1 - 按名称搜索桌游:
query({ graphql: "{ boardGamesTable(where: {sch_name: {ilike: \\"%卡坦%\\"}}, limit: 10) { id sch_name eng_name player_num gstone_rating } }" })
解读：从 boardGamesTable 中，找 sch_name 字段包含"卡坦"的行（不区分大小写），最多返回10条，返回 id、中文名、英文名、支持人数、评分。

示例2 - 组合条件 + 排序:
query({ graphql: "{ boardGamesTable(where: {gstone_rating: {gte: 7.0}, removeDate: {eq: 0}}, orderBy: {gstone_rating: DESC}, limit: 15) { id sch_name gstone_rating player_num category } }" })
解读：找评分>=7.0 且在架（removeDate=0）的桌游，按评分从高到低排，最多15条。

示例3 - 查单条详情:
query({ graphql: "{ boardGamesTableSingle(where: {id: {eq: \\"clxyz123\\"}}) { id sch_name eng_name gstone_rating player_num best_player_num category mode } }" })
解读：根据 id 查一条桌游的完整信息。用 boardGamesTableSingle 表示只返回一个对象（不是数组）。

[错误情况]
- 字段名拼写错误 → 返回 "查询错误: Cannot query field xxx"
- 对 json 字段用 where → 可能返回空结果或报错
- 用了 mutation 语法 → 返回 "请使用 mutate 工具执行修改操作"
- 超过 4000 字符 → 结果被截断，末尾有提示

[另见]
→ _meta.ops（操作符详解）
→ _meta.types（字段类型，哪些能过滤）
→ _meta.result（返回值格式）
`;

const META_OPS = `[_meta.ops] where 过滤操作符参考

[概述]
操作符用于 where 子句中，对某个字段施加过滤条件。
语法：{ 字段名: { 操作符: 值 } }

[比较操作符]

eq（等于）
  语法：{field: {eq: value}}
  示例：{id: {eq: "abc123"}}  → id 精确匹配

ne（不等于）
  语法：{field: {ne: value}}
  示例：{status: {ne: "expired"}}  → 排除某个值

lt / lte / gt / gte（数值范围）
  语法：{field: {gte: 7.0, lte: 9.0}}  → 7.0 <= field <= 9.0
  多个操作符在同一字段上 = AND（如同时 gte 和 lte 实现区间）
  示例：{gstone_rating: {gte: 7.0}}  → 评分>=7.0

[文本匹配操作符]

like（模式匹配，区分大小写）
ilike（模式匹配，不区分大小写）—— 推荐用 ilike

  % 通配符含义：
  - "%关键词%" = 包含（contains）
  - "关键词%" = 以此开头（startsWith）
  - "%关键词" = 以此结尾（endsWith）

  示例 - 包含：{sch_name: {ilike: "%铁路%"}}  → 名字里有"铁路"
  示例 - 开头：{sch_name: {ilike: "卡%"}}  → 名字以"卡"开头
  示例 - 结尾：{sch_name: {ilike: "%岛"}}  → 名字以"岛"结尾

notLike / notIlike（排除模式）
  示例：{sch_name: {notIlike: "%测试%"}}  → 排除名字含"测试"的

[集合操作符]

inArray（值在列表中）
  语法：{field: {inArray: [值1, 值2, 值3]}}
  示例：{id: {inArray: ["bg001","bg002","bg003"]}}  → id 是这三个之一

notInArray（值不在列表中）
  示例：{category: {notInArray: ["WARGAME"]}}  → 排除战棋类

[空值操作符]

isNull / isNotNull
  示例：{phone: {isNull: true}}  → 手机号为空的
  示例：{board_game_id: {isNotNull: true}}  → 关联了桌游的约局

[组合操作 - AND]

隐式 AND：同一 where 里写多个字段条件，自动用 AND 连接。
示例：where: {gstone_rating: {gte: 7.0}, removeDate: {eq: 0}}
含义：评分>=7.0 AND 在架

同一字段多操作符也是 AND：
示例：where: {gstone_rating: {gte: 6.0, lte: 8.0}}
含义：6.0 <= 评分 <= 8.0

[组合操作 - OR]

表级 OR：用 OR 数组包裹多个条件对象，条件之间为"或"关系。
注意：OR 不能和其他字段混用在同一层，必须单独使用。

示例 - 名字含"铁路"或含"火车"：
where: {OR: [{sch_name: {ilike: "%铁路%"}}, {sch_name: {ilike: "%火车%"}}]}

示例 - 评分>8 或 类别是PARTY：
where: {OR: [{gstone_rating: {gt: 8.0}}, {category: {ilike: "%PARTY%"}}]}

列级 OR：同一字段内的多个条件取"或"。
示例：{sch_name: {OR: [{ilike: "%铁路%"}, {ilike: "%蒸汽%"}, {ilike: "%火车%"}]}}
含义：名字含"铁路"或"蒸汽"或"火车"

[完整复杂查询示例]

搜索铁路主题桌游（多关键词 OR + 在架 AND + 高分）：
query({ graphql: "{ boardGamesTable(where: {OR: [{sch_name: {ilike: \\"%铁路%\\"}}, {sch_name: {ilike: \\"%蒸汽%\\"}}, {eng_name: {ilike: \\"%18%\\"}}, {eng_name: {ilike: \\"%train%\\"}}]}, limit: 15) { id sch_name eng_name player_num gstone_rating } }" })

搜索名字含"卡"且评分>=7.0的在架桌游（AND）：
query({ graphql: "{ boardGamesTable(where: {sch_name: {ilike: \\"%卡%\\"}, gstone_rating: {gte: 7.0}, removeDate: {eq: 0}}, limit: 10) { id sch_name gstone_rating } }" })

搜索评分在6.5到8.0之间的桌游（区间）：
query({ graphql: "{ boardGamesTable(where: {gstone_rating: {gte: 6.5, lte: 8.0}, removeDate: {eq: 0}}, limit: 20) { id sch_name gstone_rating } }" })
`;

const META_TYPES = `[_meta.types] 字段数据类型参考

[概述]
每个数据库表的每个字段有固定类型。类型决定了：
1. 存储什么样的值
2. 能用哪些 where 操作符过滤
3. 能否排序

[类型定义]

text（文本）
  存储：字符串，如 "卡坦岛"、"clxyz123"
  可用操作符：eq, ne, like, ilike, inArray, isNull
  可排序：是（按字母序）
  示例字段：id, sch_name, eng_name, title, date, time, nickname

int（整数）
  存储：不带小数的数字，如 0, 4, 1705123456000
  可用操作符：eq, ne, gt, gte, lt, lte, inArray, isNull
  可排序：是
  示例字段：gstone_id, maxPlayers, removeDate

real（浮点数/小数）
  存储：带小数的数字，如 7.5, 8.23
  可用操作符：eq, ne, gt, gte, lt, lte, isNull
  可排序：是
  示例字段：gstone_rating

boolean（布尔值）
  存储：true 或 false
  可用操作符：eq, isNull
  可排序：否
  示例字段：isGame, isWatching, sharePhone

timestamp（时间戳）
  存储：毫秒级 Unix 时间戳（整数），如 1705123456000
  可用操作符：eq, gt, gte, lt, lte, isNull
  可排序：是（用于按时间倒序 DESC）
  示例字段：createAt, computedAt, createdAt

json（JSON 数据）- 特殊类型
  存储：JSON 数组或对象，如 [2,3,4] 或 ["STRATEGY","PARTY"] 或 {complex: "data"}
  可用操作符：无。不能用 where 过滤。
  可排序：否
  处理方式：查询时 select 该字段，在返回结果中用程序逻辑判断值。
  示例字段：player_num, best_player_num, category, mode, data, players, scores

[关键规则]
1. 想过滤 → 检查该字段类型 → json 不能过滤
2. 想排序 → 检查该字段类型 → json 和 boolean 不能排序
3. 文本搜索 → 用 ilike + %通配符
4. 数值范围 → 用 gte/lte 组合
5. 精确匹配 → 用 eq

[另见]
→ _meta.ops（操作符详解）
→ 各板块 .schema 词条（具体字段列表和类型）
`;

const META_TERMS = `[_meta.terms] 业务术语表

[概述]
以下术语在本系统中有精确含义。回复用户时应使用这些术语，不要用同义词替换。

[术语定义]

桌游
  定义：店内库存中可供顾客游玩的一款实体桌面游戏产品。
  存储于：boardGamesTable
  标识：id 字段
  展示名：sch_name（中文名）
  链接：https://diceshock.com/inventory/{id}

约局
  定义：一个用户发起的、约定了日期时间地点的线下聚会活动。可以是桌游局、日麻局、跑团局等。
  存储于：activesTable
  标识：id 字段
  关联：boardGameId 可选关联某款桌游
  链接：https://diceshock.com/actives/{id}

报名
  定义：一条记录，表示某用户以"参加"或"观望"身份加入了某个约局。
  存储于：activeRegistrationsTable
  关联：activeId 指向约局，userId 指向用户
  区分：isWatching=false 为参加，isWatching=true 为观望

对局
  定义：一次已完成的日麻比赛的记录，包含参与者和分数。
  存储于：mahjongMatchesTable
  链接：https://diceshock.com/my-riichi/{id}

排行榜
  定义：某个赛事类型在某个时间段内的 PP 值/段位排名快照。是一个时间点的统计结果。
  存储于：leaderboardSnapshotsTable
  分类维度：category（赛事类型）+ period（时间范围）

会员
  定义：用户购买的消费计划，如通行证（按次）或储值卡（充值余额）。
  存储于：userMembershipPlansTable

用户资料
  定义：用户的基础账号信息：昵称、手机号、注册时间等。
  存储于：userInfoTable
  链接：https://diceshock.com/me

名片
  定义：用户自定义的社交展示卡片，包含微信号、QQ、自我介绍等。
  存储于：userBusinessCardTable

赛事
  定义：官方发布的活动/比赛/促销公告。
  存储于：eventsTable
  链接：https://diceshock.com/events/{id}

徽章
  定义：用户因达成某项成就而获得的标记。
  存储于：userBadgesTable

[店铺]
系统覆盖两家店铺：
- 光谷天地店：客服微信 DiceShock，地址 武汉市洪山区关东街道高新二路光谷总部国际2栋203
- 街道口店：客服微信 DiceShockJDK，地址 武汉市洪山区珞南街道阜华大厦C座2103

[另见]
→ 各板块词条（具体业务逻辑）
`;

const META_RESULT = `[_meta.result] 查询结果格式参考

[返回值结构]

query 工具返回一个字符串，内容是 JSON。

查多条（findMany）时：
  格式：{"表名": [{对象1}, {对象2}, ...]}
  示例：{"boardGamesTable": [{"id":"abc","sch_name":"卡坦岛","gstone_rating":7.2}, ...]}

查单条（findFirst / Single）时：
  格式：{"表名Single": {对象} }  或  {"表名Single": null}（未找到时）
  示例：{"boardGamesTableSingle": {"id":"abc","sch_name":"卡坦岛",...}}

[元数据标记]

结果末尾会附加一行元数据：
[_meta: 本次返回N条]

含义：
- N 等于你设的 limit 值 → 表中可能还有更多匹配数据。你应该收窄 where 条件（更精确的过滤），而不是翻页。
- N 小于 limit 值 → 已返回全部匹配结果，不需要再查了。
- N = 0 → 没有匹配。换关键词、放宽条件、或检查字段名是否正确。

[结果截断]

当结果字符数超过 4000 时，会被截断：
- 末尾显示：[结果已截断, 共N条记录]
- 处理方式：减少 select 的字段数（只查需要的字段），或减小 limit。

[错误返回]

不是 JSON，而是纯文本错误信息：
- "查询错误: Cannot query field xxx..." → 字段名拼写错误。检查 .schema 词条中的正确字段名。
- "查询错误: GraphQL 执行错误: 不允许访问受保护的数据表: xxx" → 该表被禁止访问。
- "请使用 mutate 工具执行修改操作" → 你写了 mutation 语法，query 只能读不能写。
- "GraphQL 语法错误: ..." → 查询字符串格式不对，检查括号、引号是否匹配。

[另见]
→ _meta.query（怎么写查询）
→ _meta.ops（操作符含义）
`;

const META_MUTATE = `[_meta.mutate] mutate 工具语法参考

[签名]
mutate(args: { action: string, params: object, description: string }) → string

[描述]
对数据库执行写操作。每次调用指定一个动作类型（action），传入该动作所需的参数（params），
并提供一段中文描述（description）说明本次操作意图（给用户看）。

[参数详解]

action（动作类型）
  必填。字符串，必须是以下枚举值之一：
  - "create_active" → 创建约局
  - "join_active" → 加入约局（以参加者身份）
  - "watch_active" → 观望约局
  - "leave_active" → 退出/删除约局
  - "update_active" → 修改约局信息（仅创建者可操作）
  - "send_sms_code" → 发送手机验证码
  - "verify_phone" → 验证手机号并绑定
  - "bind_gsz" → 绑定日麻公式站账号
  - "upsert_business_card" → 创建或更新用户名片

params（参数对象）
  必填。不同 action 需要不同字段，详见各板块 .mutate 词条。

description（描述）
  必填。一句中文描述本次操作的意图。
  示例："为用户创建周五晚的卡坦岛约局"
  此字段不影响执行逻辑，仅用于记录和向用户展示。

[返回值]
成功：中文描述操作结果的字符串（如 "约局已创建，标题: 周五卡坦岛"）
失败：中文错误信息（如 "缺少必填参数: date"）

[错误情况]
- action 不在枚举列表中 → 返回有效 action 列表
- params 缺少必填字段 → 返回具体缺少哪个字段
- 权限不足（如修改非自己创建的约局） → 返回权限错误

[另见]
→ active.mutate（约局操作的具体参数）
→ account.mutate（手机绑定/名片操作的参数）
`;

const SKILL_TREE: Record<string, string> = {
  _meta: META_INDEX,
  "_meta.query": META_QUERY,
  "_meta.ops": META_OPS,
  "_meta.types": META_TYPES,
  "_meta.terms": META_TERMS,
  "_meta.result": META_RESULT,
  "_meta.mutate": META_MUTATE,
  boardgame: BOARDGAME_INDEX,
  "boardgame.search": BOARDGAME_SEARCH,
  "boardgame.recommend": BOARDGAME_RECOMMEND,
  "boardgame.detail": BOARDGAME_DETAIL,
  "boardgame.schema": BOARDGAME_SCHEMA,
  "boardgame.query": BOARDGAME_QUERY,
  "boardgame.rules": BOARDGAME_RULES,
  active: ACTIVE_INDEX,
  "active.list": ACTIVE_LIST,
  "active.create": ACTIVE_CREATE,
  "active.join": ACTIVE_JOIN,
  "active.update": ACTIVE_UPDATE,
  "active.schema": ACTIVE_SCHEMA,
  "active.mutate": ACTIVE_MUTATE,
  "active.rules": ACTIVE_RULES,
  mahjong: MAHJONG_INDEX,
  "mahjong.schema": MAHJONG_SCHEMA,
  "mahjong.query": MAHJONG_QUERY,
  "mahjong.rules": MAHJONG_RULES,
  account: ACCOUNT_INDEX,
  "account.schema": ACCOUNT_SCHEMA,
  "account.mutate": ACCOUNT_MUTATE,
  "account.rules": ACCOUNT_RULES,
  general: GENERAL_SKILL_CONTENT,
  event: EVENT_SKILL_CONTENT,
  trpg: TRPG_SKILL_CONTENT,
  clocktower: CLOCKTOWER_SKILL_CONTENT,
};

export const SKILL_DIRECTORY = [
  {
    id: "boardgame",
    keywords: ["桌游", "游戏", "库存", "搜索", "推荐"],
    description: "桌游库存 (子词条: .schema/.query/.rules)",
  },
  {
    id: "active",
    keywords: ["约局", "活动", "参加", "创建", "退出"],
    description: "约局管理 (子词条: .schema/.mutate/.rules)",
  },
  {
    id: "mahjong",
    keywords: ["日麻", "战绩", "PP", "段位", "排行", "公式站"],
    description: "日麻数据 (子词条: .schema/.query/.rules)",
  },
  {
    id: "account",
    keywords: ["会员", "手机", "绑定", "名片", "余额"],
    description: "账号管理 (子词条: .schema/.mutate/.rules)",
  },
  {
    id: "event",
    keywords: ["赛事", "比赛", "公告", "活动通知"],
    description: "赛事活动(原子词条, 含schema)",
  },
  {
    id: "general",
    keywords: ["营业", "地址", "价格", "服务", "微信"],
    description: "店铺信息(原子词条)",
  },
  {
    id: "trpg",
    keywords: ["TRPG", "跑团", "DM", "GM", "角色扮演"],
    description: "跑团服务(原子词条)",
  },
  {
    id: "clocktower",
    keywords: ["血染", "钟楼", "说书人"],
    description: "血染钟楼(原子词条)",
  },
  {
    id: "_meta",
    keywords: ["帮助", "怎么用", "skill", "技能系统"],
    description: "skill系统自身说明",
  },
] as const;

const ALL_SKILL_IDS = Object.keys(SKILL_TREE);

export async function executeLoadSkillTool(
  args: { skill: string },
  _context: ToolContext,
): Promise<string> {
  const content = SKILL_TREE[args.skill];
  if (content) return content;

  const parts = args.skill.split(".");
  const parent = SKILL_TREE[parts[0]];
  if (parent) {
    const available = ALL_SKILL_IDS.filter((k) => k.startsWith(parts[0] + "."));
    return `未找到 "${args.skill}"。\n\n${parts[0]} 的可用子词条: ${available.join(", ") || "无"}\n\n板块内容:\n${parent}`;
  }

  return `无效的技能ID: "${args.skill}"。\n可用: ${ALL_SKILL_IDS.join(", ")}`;
}

export const LOAD_SKILL_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "load_skill",
    description:
      "加载技能词条。支持板块(如boardgame)和子词条(如boardgame.schema)。先加载板块查看子词条列表。",
    parameters: {
      type: "object",
      properties: {
        skill: {
          type: "string",
          enum: ALL_SKILL_IDS,
          description: "技能路径: 板块名 或 板块名.子词条",
        },
      },
      required: ["skill"],
    },
  },
};
