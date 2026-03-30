import { DurableObject } from "cloudflare:workers";
import type { Seat } from "@/shared/mahjong/constants";
import * as engine from "@/shared/mahjong/engine";
import type {
  MatchConfig,
  MatchState,
  RoundResult,
} from "@/shared/mahjong/types";

interface SessionMeta {
  userId: string;
  role: "user" | "dash";
}

interface OccupancyInfo {
  id: string;
  user_id: string;
  temp_id: string | null;
  nickname: string;
  uid: string | null;
  start_at: number;
}

interface TableInfo {
  id: string;
  name: string;
  type: "fixed" | "solo";
  scope: "trpg" | "boardgame" | "console" | "mahjong";
  status: "active" | "inactive";
  capacity: number;
  code: string;
}

export interface SocketState {
  table: TableInfo | null;
  occupancies: OccupancyInfo[];
  serverTime: number;
  mahjong: MatchState | null;
}

type ClientMessage =
  | { action: "sync" }
  | { action: "update_state"; table: TableInfo; occupancies: OccupancyInfo[] }
  | { action: "mahjong_set_config"; config: MatchConfig }
  | {
      action: "mahjong_join";
      nickname: string;
      phone: string | null;
      registered: boolean;
    }
  | { action: "mahjong_start_seat_select" }
  | { action: "mahjong_back_to_config" }
  | { action: "mahjong_select_seat"; seat: Seat }
  | { action: "mahjong_ready"; ready: boolean }
  | { action: "mahjong_start" }
  | { action: "mahjong_begin_scoring" }
  | { action: "mahjong_submit_score"; points: number }
  | { action: "mahjong_confirm_scores" }
  | { action: "mahjong_end_round"; result: RoundResult }
  | { action: "mahjong_initiate_vote" }
  | { action: "mahjong_cast_vote"; vote: boolean }
  | { action: "mahjong_resolve_vote" }
  | { action: "mahjong_reset" };

type ServerMessage =
  | { type: "state"; data: SocketState }
  | { type: "error"; message: string };

export class SocketDO extends DurableObject<Cloudflare.Env> {
  private tableInfo: TableInfo | null = null;
  private occupancies: OccupancyInfo[] = [];
  private mahjongState: MatchState | null = null;

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

        default:
          if (data.action.startsWith("mahjong_")) {
            this.handleMahjongAction(meta, data);
          }
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

  private handleMahjongAction(meta: SessionMeta, data: ClientMessage): void {
    try {
      switch (data.action) {
        case "mahjong_set_config": {
          if (!this.mahjongState)
            this.mahjongState = engine.createInitialState();
          this.mahjongState = engine.setConfig(this.mahjongState, data.config);
          break;
        }
        case "mahjong_start_seat_select": {
          if (!this.mahjongState)
            this.mahjongState = engine.createInitialState();
          this.mahjongState = engine.startSeatSelect(this.mahjongState);
          break;
        }
        case "mahjong_back_to_config": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.backToConfig(this.mahjongState);
          break;
        }
        case "mahjong_join": {
          if (!this.mahjongState)
            this.mahjongState = engine.createInitialState();
          this.mahjongState = engine.addPlayer(this.mahjongState, {
            userId: meta.userId,
            nickname: data.nickname,
            phone: data.phone,
            registered: data.registered,
          });
          break;
        }
        case "mahjong_select_seat": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.selectSeat(
            this.mahjongState,
            meta.userId,
            data.seat,
          );
          // Auto-start when all players are seated
          if (engine.allSeated(this.mahjongState)) {
            this.mahjongState = engine.startMatch(this.mahjongState);
          }
          break;
        }
        case "mahjong_ready": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.setReady(
            this.mahjongState,
            meta.userId,
            data.ready,
          );
          break;
        }
        case "mahjong_start": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.startMatch(this.mahjongState);
          break;
        }
        case "mahjong_begin_scoring": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.beginScoring(this.mahjongState);
          break;
        }
        case "mahjong_submit_score": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.submitScore(
            this.mahjongState,
            meta.userId,
            data.points,
          );
          break;
        }
        case "mahjong_confirm_scores": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.confirmScores(this.mahjongState);
          break;
        }
        case "mahjong_end_round": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.endRound(this.mahjongState, data.result);
          break;
        }
        case "mahjong_initiate_vote": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.initiateVote(this.mahjongState);
          break;
        }
        case "mahjong_cast_vote": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.castVote(
            this.mahjongState,
            meta.userId,
            data.vote,
          );
          break;
        }
        case "mahjong_resolve_vote": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.resolveVote(this.mahjongState);
          break;
        }
        case "mahjong_reset": {
          if (this.mahjongState) {
            this.mahjongState = engine.resetKeepConfig(this.mahjongState);
          } else {
            this.mahjongState = null;
          }
          break;
        }
      }
      this.broadcastState();
    } catch (err) {
      this.broadcastError(
        err instanceof Error ? err.message : "Mahjong action failed",
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

  private buildState(): SocketState {
    return {
      table: this.tableInfo,
      occupancies: this.occupancies,
      serverTime: Date.now(),
      mahjong: this.mahjongState,
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

  private broadcastError(message: string): void {
    const payload = JSON.stringify({
      type: "error",
      message,
    } satisfies ServerMessage);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        // noop
      }
    }
  }
}
