import actives from "./actives";
import activesManagement from "./activesManagement";
import auth from "./auth";
import { router } from "./baseTRPC";
import businessCard from "./businessCard";
import events from "./events";
import eventsManagement from "./eventsManagement";
import membershipPlans from "./membershipPlans";
import ordersManagement from "./ordersManagement";
import owned from "./owned";
import ownedManagement from "./ownedManagement";
import pricingPlansManagement from "./pricingPlansManagement";
import tables from "./tables";
import tablesManagement from "./tablesManagement";
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
  },
});
