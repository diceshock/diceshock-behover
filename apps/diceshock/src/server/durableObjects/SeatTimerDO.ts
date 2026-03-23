import { DurableObject } from "cloudflare:workers";

interface SessionMeta {
  userId: string;
  role: "user" | "dash";
}

interface OccupancyInfo {
  id: string;
  user_id: string;
  nickname: string;
  uid: string | null;
  seats: number;
  start_at: number;
}

interface TableInfo {
  id: string;
  name: string;
  type: "mahjong" | "boardgame";
  status: "active" | "inactive";
  capacity: number;
  code: string;
}

export interface SeatTimerState {
  table: TableInfo | null;
  occupancies: OccupancyInfo[];
  serverTime: number;
}

type ClientMessage =
  | { action: "sync" }
  | { action: "update_state"; table: TableInfo; occupancies: OccupancyInfo[] };

type ServerMessage =
  | { type: "state"; data: SeatTimerState }
  | { type: "error"; message: string };

export class SeatTimerDO extends DurableObject<Cloudflare.Env> {
  private tableInfo: TableInfo | null = null;
  private occupancies: OccupancyInfo[] = [];

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      return this.handleWebSocket(request);
    }

    if (url.pathname === "/update-state" && request.method === "POST") {
      const body = (await request.json()) as {
        table: TableInfo;
        occupancies: OccupancyInfo[];
      };
      this.tableInfo = body.table;
      this.occupancies = body.occupancies;
      this.broadcastState();
      return new Response("ok");
    }

    if (url.pathname === "/state" && request.method === "GET") {
      return Response.json(this.buildState());
    }

    return new Response("Not found", { status: 404 });
  }

  private handleWebSocket(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") ?? "anonymous";
    const role = (url.searchParams.get("role") ?? "user") as "user" | "dash";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server, [`userId:${userId}`, `role:${role}`]);
    server.serializeAttachment({ userId, role } satisfies SessionMeta);
    server.send(JSON.stringify(this.buildStateMessage()));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    try {
      const meta = ws.deserializeAttachment() as SessionMeta | null;
      if (!meta) return;

      const data = JSON.parse(message as string) as ClientMessage;

      switch (data.action) {
        case "sync":
          ws.send(JSON.stringify(this.buildStateMessage()));
          break;

        case "update_state":
          this.tableInfo = data.table;
          this.occupancies = data.occupancies;
          this.broadcastState();
          break;
      }
    } catch (err) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        } satisfies ServerMessage),
      );
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    ws.close(code, reason);
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    ws.close(1011, "WebSocket error");
  }

  private buildState(): SeatTimerState {
    return {
      table: this.tableInfo,
      occupancies: this.occupancies,
      serverTime: Date.now(),
    };
  }

  private buildStateMessage(): ServerMessage {
    return { type: "state", data: this.buildState() };
  }

  private broadcastState(): void {
    const payload = JSON.stringify(this.buildStateMessage());
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        // noop
      }
    }
  }
}
