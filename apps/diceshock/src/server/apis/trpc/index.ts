import actives from "./actives";
import activesManagement from "./activesManagement";
import auth from "./auth";
import { router } from "./baseTRPC";
import businessCard from "./businessCard";
import events from "./events";
import eventsManagement from "./eventsManagement";
import gsz from "./gsz";
import membershipPlans from "./membershipPlans";
import ordersManagement from "./ordersManagement";
import owned from "./owned";
import ownedManagement from "./ownedManagement";
import pricingPlansManagement from "./pricingPlansManagement";
import tables from "./tables";
import tablesManagement from "./tablesManagement";
import tempIdentity from "./tempIdentity";
import users from "./users";

export const appRouterDash = router({
  ownedManagement,
  activesManagement,
  eventsManagement,
  tablesManagement,
  ordersManagement,
  users,
  membershipPlans,
  pricingPlansManagement,
  gsz,
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
});
