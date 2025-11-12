import active from "./active";
import activeTags from "./activeTags";
import { router } from "./baseTRPC";
import owned from "./owned";

export const appRouterDash = router({ active, activeTags });

export const appRouterPublic = router({ owned });
