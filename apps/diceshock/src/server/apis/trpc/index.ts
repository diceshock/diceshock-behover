import { router } from "./baseTRPC";

import active from "./active";
import owned from "./owned";
import activeTags from "./activeTags";

export const appRouterDash = router({ active, activeTags });

export const appRouterPublic = router({ owned });
