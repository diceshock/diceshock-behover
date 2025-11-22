import active from "./active";
import activeTags from "./activeTags";
import { router } from "./baseTRPC";
import owned from "./owned";
import ownedManagement from "./ownedManagement";

export const appRouterDash = router({ active, activeTags, ownedManagement });

// Public API 只暴露 getById，用于预览页面
export const appRouterPublic = router({
  owned,
  active: { getById: active.getById },
});
