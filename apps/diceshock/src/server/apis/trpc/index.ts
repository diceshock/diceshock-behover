import actives from "./actives";
import activesManagement from "./activesManagement";
import auth from "./auth";
import { router } from "./baseTRPC";
import businessCard from "./businessCard";
import owned from "./owned";
import ownedManagement from "./ownedManagement";
import users from "./users";

export const appRouterDash = router({
  ownedManagement,
  activesManagement,
  users,
});

export const appRouterPublic = router({
  owned,
  actives,
  auth: { smsCode: auth.smsCode, updateUserInfo: auth.updateUserInfo },
  businessCard: {
    getMyBusinessCard: businessCard.getMyBusinessCard,
    upsertBusinessCard: businessCard.upsertBusinessCard,
    getBusinessCardByUserId: businessCard.getBusinessCardByUserId,
    getParticipantsBusinessCards: businessCard.getParticipantsBusinessCards,
  },
});
