import active from "./active";
import activeTags from "./activeTags";
import auth from "./auth";
import { router } from "./baseTRPC";
import owned from "./owned";
import ownedManagement from "./ownedManagement";

export const appRouterDash = router({ active, activeTags, ownedManagement });

// Public API 暴露活动相关的查询接口
export const appRouterPublic = router({
  owned,
  active: { get: active.get, getById: active.getById },
  activeTags: { get: activeTags.get },
  auth: { smsCode: auth.smsCode, updateUserInfo: auth.updateUserInfo },
});
