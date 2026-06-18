import type { SkillDefinition } from "./index";

export const generalSkill: SkillDefinition = {
  id: "general",
  name: "通用助手",
  description: "通用对话和问候",
  systemPrompt: `当用户的问题不属于特定领域时，友好地回答或引导用户说明需求。可以介绍店铺基本信息、营业时间、地址和联系方式。

联系方式：
- 这里是服务号，咨询需要加官方微信
- DiceShock（光谷天地店）
- DiceShockJDK（街道口店）
- 请优先联系官方微信`,
  tools: [],
  keywords: [],
};
