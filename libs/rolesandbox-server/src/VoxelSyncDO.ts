import { DurableObject } from "cloudflare:workers";
import * as Y from "yjs";
import {
  applyUpdate,
  encodeStateAsUpdate,
  encodeStateVector,
} from "yjs";

/**
 * VoxelSyncDO — Cloudflare Durable Object that holds a Yjs document
 * representing a voxel world. Clients connect via WebSocket and sync
 * using the Yjs binary protocol (awareness + doc updates).
 *
 * Wire protocol (binary frames):
 *   [0, ...update]        — doc update
 *   [1, ...stateVector]   — sync step 1 (client sends its state vector)
 *   [2, ...update]        — sync step 2 (server responds with diff)
 *   [3, ...awarenessUpdate] — awareness (cursor, selection)
 */

const MSG_UPDATE = 0;
const MSG_SYNC_STEP1 = 1;
const MSG_SYNC_STEP2 = 2;
const MSG_AWARENESS = 3;

export class VoxelSyncDO extends DurableObject {
  private doc: Y.Doc;
  private conns = new Set<WebSocket>();

  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env);
    this.doc = new Y.Doc();

    // Restore persisted state
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<Uint8Array>("doc");
      if (stored) {
        applyUpdate(this.doc, new Uint8Array(stored));
      }
    });

    // Persist on updates (debounced via alarm)
    this.doc.on("update", () => {
      this.ctx.storage.setAlarm(Date.now() + 1000);
    });
  }

  override async alarm(): Promise<void> {
    const update = encodeStateAsUpdate(this.doc);
    await this.ctx.storage.put("doc", update);
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      this.ctx.acceptWebSocket(server);
      this.conns.add(server);

      // Send sync step 1 response immediately: full state as update
      const sv = encodeStateVector(this.doc);
      const update = encodeStateAsUpdate(this.doc);
      const step2 = new Uint8Array(1 + update.byteLength);
      step2[0] = MSG_SYNC_STEP2;
      step2.set(update, 1);
      server.send(step2);

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/snapshot" && request.method === "GET") {
      const update = encodeStateAsUpdate(this.doc);
      return new Response(update.buffer as ArrayBuffer, {
        headers: { "Content-Type": "application/octet-stream" },
      });
    }

    return new Response("Not found", { status: 404 });
  }

  override async webSocketMessage(
    ws: WebSocket,
    message: ArrayBuffer | string
  ): Promise<void> {
    if (typeof message === "string") return;

    const data = new Uint8Array(message);
    if (data.byteLength === 0) return;

    const msgType = data[0];
    const payload = data.slice(1);

    switch (msgType) {
      case MSG_SYNC_STEP1: {
        // Client sent its state vector; respond with diff
        const diff = encodeStateAsUpdate(this.doc, payload);
        const response = new Uint8Array(1 + diff.byteLength);
        response[0] = MSG_SYNC_STEP2;
        response.set(diff, 1);
        ws.send(response);
        break;
      }

      case MSG_UPDATE: {
        // Apply and broadcast
        applyUpdate(this.doc, payload);
        this.broadcast(data, ws);
        break;
      }

      case MSG_AWARENESS: {
        // Broadcast awareness to all other clients
        this.broadcast(data, ws);
        break;
      }
    }
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    this.conns.delete(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    this.conns.delete(ws);
  }

  private broadcast(data: Uint8Array, exclude?: WebSocket): void {
    for (const conn of this.conns) {
      if (conn === exclude) continue;
      try {
        conn.send(data);
      } catch {
        this.conns.delete(conn);
      }
    }
  }
}
