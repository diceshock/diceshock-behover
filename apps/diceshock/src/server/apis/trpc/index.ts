import active from "./active";
import activeRegistrations from "./activeRegistrations";
import activeTags from "./activeTags";
import auth from "./auth";
import { router } from "./baseTRPC";
import businessCard from "./businessCard";
import dashboard from "./dashboard";
import owned from "./owned";
import ownedManagement from "./ownedManagement";
import users from "./users";

export const appRouterDash = router({
  active,
  activeTags: {
    get: activeTags.get,
    insert: activeTags.insert,
    update: activeTags.update,
    getGameTags: activeTags.getGameTags,
    createGameTag: activeTags.createGameTag,
    delete: activeTags.delete,
    importTags: activeTags.importTags,
  },
  activeRegistrations: {
    ...activeRegistrations,
    getUserDetails: activeRegistrations.getUserDetailsDash, // dash 使用包含手机号的版本
  },
  dashboard,
  ownedManagement,
  users,
});

// Public API 暴露活动相关的查询接口
export const appRouterPublic = router({
  owned,
  active: {
    get: active.get,
    getById: active.getById,
    boardGames: active.boardGames,
    createGame: active.createGame, // 约局创建需要登录，但使用 public router（内部使用 protectedProcedure）
    updateGame: active.updateGame, // 编辑约局（需要登录，只有发起者可以编辑）
    delete: active.delete, // 删除活动（需要权限检查）
  },
  activeTags: {
    get: activeTags.get,
    getGameTags: activeTags.getGameTags,
  },
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
  businessCard: {
    getMyBusinessCard: businessCard.getMyBusinessCard,
    upsertBusinessCard: businessCard.upsertBusinessCard,
    getBusinessCardByUserId: businessCard.getBusinessCardByUserId,
    getParticipantsBusinessCards: businessCard.getParticipantsBusinessCards,
  },
});
