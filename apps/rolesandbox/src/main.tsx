import { createRoleSandboxRouter } from "@lib/rolesandbox-server";
import { Hono } from "hono";

export { VoxelSyncDO } from "@lib/rolesandbox-server";

interface Env {
  Bindings: {
    VOXEL_SYNC: DurableObjectNamespace;
  };
}

export const app = new Hono<Env>();

// Mount the sandbox WebSocket/API router
const sandboxRouter = createRoleSandboxRouter<Env>();
app.route("/sandbox", sandboxRouter);

export default app;
