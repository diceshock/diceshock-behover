import active from "./active";
import activeRegistrations from "./activeRegistrations";
import activeTags from "./activeTags";
import auth from "./auth";
import { router } from "./baseTRPC";
import owned from "./owned";
import ownedManagement from "./ownedManagement";
import users from "./users";

export const appRouterDash = router({
  active,
  activeTags,
  activeRegistrations,
  ownedManagement,
  users,
});

// Public API 暴露活动相关的查询接口
export const appRouterPublic = router({
  owned,
  active: { get: active.get, getById: active.getById },
  activeTags: { get: activeTags.get },
  activeRegistrations: {
    teams: { get: activeRegistrations.teams.get },
    registrations: {
      get: activeRegistrations.registrations.get,
      create: activeRegistrations.registrations.create,
      delete: activeRegistrations.registrations.delete,
    },
    getUserDetails: activeRegistrations.getUserDetails,
  },
  auth: { smsCode: auth.smsCode, updateUserInfo: auth.updateUserInfo },
});
