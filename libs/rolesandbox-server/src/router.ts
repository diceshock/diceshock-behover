import { Hono } from "hono";

export interface RoleSandboxEnv {
  VOXEL_SYNC: DurableObjectNamespace;
}

/**
 * Hono middleware/router for RoleSandbox.
 * Mount this on a path like `/sandbox` and it will proxy
 * WebSocket and HTTP requests to the VoxelSyncDO.
 *
 * Usage:
 *   import { roleSandboxRouter } from "rolesandbox-server";
 *   app.route("/sandbox", roleSandboxRouter);
 */
export function createRoleSandboxRouter<
  E extends { Bindings: RoleSandboxEnv },
>() {
  const router = new Hono<E>();

  // WebSocket upgrade — route to DO
  router.get("/ws/:roomId", async (c) => {
    const roomId = c.req.param("roomId");
    const id = c.env.VOXEL_SYNC.idFromName(roomId);
    const stub = c.env.VOXEL_SYNC.get(id);

    const url = new URL(c.req.url);
    url.pathname = "/ws";

    const req = new Request(url.toString(), {
      headers: c.req.raw.headers,
    });
    return stub.fetch(req);
  });

  // Snapshot endpoint
  router.get("/snapshot/:roomId", async (c) => {
    const roomId = c.req.param("roomId");
    const id = c.env.VOXEL_SYNC.idFromName(roomId);
    const stub = c.env.VOXEL_SYNC.get(id);

    const url = new URL(c.req.url);
    url.pathname = "/snapshot";

    return stub.fetch(new Request(url.toString()));
  });

  return router;
}
