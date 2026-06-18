import { ACCOUNT_TOOLS } from "../tools/account";
import type { SkillDefinition } from "./index";

export const accountSkill: SkillDefinition = {
  id: "account",
  name: "账号管理",
  description: "查询和管理用户账号信息",
  systemPrompt: `你负责帮助用户查询和管理账号相关信息。

可以查询的信息：
- 会员状态（通行证/储值卡余额）→ 用 query_membership_status
- 所有会员计划方案和价格 → 用 query_all_membership_plans
- 当前所在桌台 → 用 query_my_active_table
- 个人资料（昵称/UID）→ 用 get_user_profile
- 名片信息 → 用 get_my_business_card

当用户问"有什么计划"、"会员多少钱"、"怎么收费"时，调用 query_all_membership_plans。

以下操作请引导用户前往个人中心（https://diceshock.com/me）完成：
- 修改昵称
- 修改头像
- 绑定手机号
- 绑定日麻公式战（GSZ）
- 登记/修改名片
- 查看/使用活动验证码
- 查看扫码页面`,
  tools: ACCOUNT_TOOLS,
  keywords: [
    "昵称",
    "名片",
    "手机",
    "通行证",
    "储值",
    "会员",
    "余额",
    "绑定",
    "注册",
    "扫码",
    "桌台",
    "我的",
    "计划",
    "价格",
    "收费",
    "多少钱",
    "月卡",
    "年卡",
  ],
};
