export const ACCOUNT_INDEX = `[account] 会员状态、手机绑定、名片管理
对应表: userMembershipPlansTable, userInfoTable, userBusinessCardTable

[子词条]
- account.schema → 会员/用户资料/名片表字段定义
- account.mutate → 手机绑定/名片操作示例
- account.rules  → 账号业务规则

[快速查询] 查会员:
query({ graphql: "{ userMembershipPlansTable(where: {userId: {eq: \\"用户ID\\"}}) { id planType startDate endDate status } }" })

→ general (店铺信息)
`;

export const ACCOUNT_SCHEMA = `[account.schema] 账号相关表字段定义

表名: userMembershipPlansTable (会员计划)
| 字段 | 类型 | 说明 |
| id | text | 主键 |
| userId | text | 用户ID |
| planType | text | 方案类型 |
| startDate | text | 开始日期 |
| endDate | text | 结束日期 |
| status | text | 状态 |

表名: userInfoTable (用户资料)
| 字段 | 类型 | 说明 |
| id | text | 主键(=userId) |
| uid | text | 用户编号 |
| nickname | text | 昵称 |
| phone | text | 手机号 |
| createAt | timestamp | |

表名: userBusinessCardTable (名片)
| 字段 | 类型 | 说明 |
| id | text | 主键(=userId) |
| sharePhone | boolean | 分享手机号 |
| wechat | text | 微信号 |
| qq | text | QQ号 |
| customContent | text | 自定义内容 |

→ account.mutate (操作示例)
`;

export const ACCOUNT_MUTATE = `[account.mutate] 账号操作示例

[手机绑定流程: 分两步]
第一步 - 发送验证码:
mutate({ action: "send_sms_code", params: { phone: "13800138000" }, description: "发送验证码" })

第二步 - 验证手机(用户提供验证码后):
mutate({ action: "verify_phone", params: { phone: "13800138000", code: "123456" }, description: "验证手机号" })

[名片操作]
更新名片:
mutate({ action: "upsert_business_card", params: { nickname: "张三", wechatId: "wx123", bio: "桌游爱好者" }, description: "更新名片" })

[绑定公式站] (日麻相关)
mutate({ action: "bind_gsz", params: { gszId: "GSZ用户ID" }, description: "绑定公式站" })

→ account.schema (字段参考)
→ mahjong.rules (公式站说明)
`;

export const ACCOUNT_RULES = `[account.rules] 账号业务规则

- 用户问会员/余额/收费 → query userMembershipPlansTable
- 手机绑定流程: 问手机号 → send_sms_code → 等用户给验证码 → verify_phone
- 修改昵称/头像 → 引导去个人中心: https://diceshock.com/me
- 个人中心: https://diceshock.com/me

→ general (店铺联系方式)
`;
