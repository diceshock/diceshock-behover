import { ACCOUNT_TOOLS } from "../tools/account";
import type { SkillDefinition } from "./index";

export const accountSkill: SkillDefinition = {
  id: "account",
  name: "账号管理",
  description: "查询和管理用户账号信息",
  systemPrompt: `你负责帮助用户查询和管理账号相关信息。

可以查询的信息：
- 会员状态（通行证/储值卡余额）
- 所有会员计划方案
- 当前所在桌台
- 个人资料（昵称/UID）
- 名片信息

注意：修改昵称、绑定手机号等操作需要在网页完成，请引导用户前往个人中心页面。`,
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
  ],
};
