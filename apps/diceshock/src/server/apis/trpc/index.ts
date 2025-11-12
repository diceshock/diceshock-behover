import active from "./active";
import activeTags from "./activeTags";
import { router } from "./baseTRPC";
import owned from "./owned";
import ownedManagement from "./ownedManagement";

export const appRouterDash = router({ active, activeTags, ownedManagement });

export const appRouterPublic = router({ owned });
