import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { VoxelWorld } from "./VoxelWorld";

const MSG_UPDATE = 0;
const MSG_SYNC_STEP1 = 1;
const MSG_SYNC_STEP2 = 2;

/**
 * React hook that creates a VoxelWorld backed by a Yjs doc,
 * synced to a remote VoxelSyncDO via WebSocket.
 */
export function useVoxelSync(wsUrl: string | null): {
  world: VoxelWorld;
  connected: boolean;
} {
  const worldRef = useRef<VoxelWorld>(new VoxelWorld());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!wsUrl) return;

    const world = worldRef.current;
    const doc = world.doc;
    let ws: WebSocket | null = null;
    let disposed = false;

    function connect() {
      if (disposed) return;
      ws = new WebSocket(wsUrl!);
      ws.binaryType = "arraybuffer";

      ws.addEventListener("open", () => {
        setConnected(true);
        // Send sync step 1: our state vector
        const sv = Y.encodeStateVector(doc);
        const msg = new Uint8Array(1 + sv.byteLength);
        msg[0] = MSG_SYNC_STEP1;
        msg.set(sv, 1);
        ws!.send(msg);
      });

      ws.addEventListener("message", (evt) => {
        if (typeof evt.data === "string") return;
        const data = new Uint8Array(evt.data as ArrayBuffer);
        if (data.byteLength === 0) return;

        const msgType = data[0];
        const payload = data.slice(1);

        switch (msgType) {
          case MSG_SYNC_STEP2:
          case MSG_UPDATE:
            Y.applyUpdate(doc, payload, "remote");
            break;
        }
      });

      ws.addEventListener("close", () => {
        setConnected(false);
        // Reconnect after 1s
        if (!disposed) setTimeout(connect, 1000);
      });

      ws.addEventListener("error", () => {
        ws?.close();
      });
    }

    // Forward local updates to server
    const onUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const msg = new Uint8Array(1 + update.byteLength);
      msg[0] = MSG_UPDATE;
      msg.set(update, 1);
      ws.send(msg);
    };

    doc.on("update", onUpdate);
    connect();

    return () => {
      disposed = true;
      doc.off("update", onUpdate);
      ws?.close();
    };
  }, [wsUrl]);

  return { world: worldRef.current, connected };
}
