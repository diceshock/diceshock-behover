import actives from "./actives";
import activesManagement from "./activesManagement";
import auth from "./auth";
import { router } from "./baseTRPC";
import businessCard from "./businessCard";
import crawlerManagement from "./crawlerManagement";
import events from "./events";
import eventsManagement from "./eventsManagement";
import gsz from "./gsz";
import gszManagement from "./gszManagement";
import leaderboard from "./leaderboard";
import mahjong from "./mahjong";
import mediaManagement from "./mediaManagement";
import membershipPlans from "./membershipPlans";
import ordersManagement from "./ordersManagement";
import owned from "./owned";
import ownedManagement from "./ownedManagement";
import pricingPlansManagement from "./pricingPlansManagement";
import rules from "./rules";
import settingsManagement from "./settingsManagement";
import shortlinkManagement from "./shortlinkManagement";
import tables from "./tables";
import tablesManagement from "./tablesManagement";
import tempIdentity from "./tempIdentity";
import users from "./users";
import { wechatTemplateAdmin } from "./wechatTemplateAdmin";

export const appRouterDash = router({
  ownedManagement,
  activesManagement,
  eventsManagement,
  tablesManagement,
  ordersManagement,
  mediaManagement,
  crawlerManagement,
  shortlinkManagement,
  users,
  membershipPlans,
  pricingPlansManagement,
  gsz,
  gszManagement,
  settingsManagement: {
    setCaptchaEnabled: settingsManagement.setCaptchaEnabled,
  },
  wechatTemplate: {
    addFromLibrary: wechatTemplateAdmin.addFromLibrary,
    listTemplates: wechatTemplateAdmin.listTemplates,
    listSlots: wechatTemplateAdmin.listSlots,
    assignSlot: wechatTemplateAdmin.assignSlot,
    removeTemplate: wechatTemplateAdmin.removeTemplate,
    sendTest: wechatTemplateAdmin.sendTest,
  },
});

export const appRouterPublic = router({
  owned,
  actives,
  events,
  auth: {
    smsCode: auth.smsCode,
    updateUserInfo: auth.updateUserInfo,
    getTotpSecret: auth.getTotpSecret,
  },
  users: {
    updatePreferences: users.updatePreferences,
  },
  businessCard: {
    getMyBusinessCard: businessCard.getMyBusinessCard,
    upsertBusinessCard: businessCard.upsertBusinessCard,
    getBusinessCardByUserId: businessCard.getBusinessCardByUserId,
    getParticipantsBusinessCards: businessCard.getParticipantsBusinessCards,
  },
  membershipPlans: {
    getMyPlans: membershipPlans.getMyPlans,
  },
  tables: {
    getByCode: tables.getByCode,
    occupy: tables.occupy,
    leave: tables.leave,
    pause: tables.pause,
    getMyActiveOccupancy: tables.getMyActiveOccupancy,
  },
  tempIdentity: {
    create: tempIdentity.create,
    validate: tempIdentity.validate,
    occupy: tempIdentity.occupy,
    leave: tempIdentity.leave,
    transfer: tempIdentity.transfer,
    getActiveOccupancy: tempIdentity.getActiveOccupancy,
  },
  pricing: {
    getPublished: pricingPlansManagement.getPublished,
  },
  settings: {
    getCaptchaEnabled: settingsManagement.getCaptchaEnabled,
    getWechatOpenConfig: settingsManagement.getWechatOpenConfig,
  },
  mahjong: {
    saveMatch: mahjong.saveMatch,
    getMyMatches: mahjong.getMyMatches,
    getMatchById: mahjong.getMatchById,
    checkRegistration: mahjong.checkRegistration,
    register: mahjong.register,
  },
  leaderboard: {
    getLeaderboard: leaderboard.getLeaderboard,
    getCategories: leaderboard.getCategories,
    getMyRankings: leaderboard.getMyRankings,
    getMyBadges: leaderboard.getMyBadges,
    getUserBadges: leaderboard.getUserBadges,
    getMyPPStats: leaderboard.getMyPPStats,
    getMatchHistory: leaderboard.getMatchHistory,
    getHeatmapData: leaderboard.getHeatmapData,
  },
  rules: {
    searchRules: rules.searchRules,
  },
});
