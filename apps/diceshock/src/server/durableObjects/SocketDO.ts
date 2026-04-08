import { DurableObject } from "cloudflare:workers";
import db, { mahjongMatchesTable } from "@lib/db";
import { eq } from "drizzle-orm";
import { gszFetch } from "@/server/apis/trpc/gszApi";
import {
  fetchTableStateForDO,
  fetchTableStateForDOByCode,
} from "@/server/utils/seatTimer";
import type { Seat } from "@/shared/mahjong/constants";
import { COUNTDOWN_SECONDS } from "@/shared/mahjong/constants";
import * as engine from "@/shared/mahjong/engine";
import type {
  MatchConfig,
  MatchState,
  TerminationReason,
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
  step: number;
}

type ClientMessage =
  | { action: "sync" }
  | { action: "update_state"; table: TableInfo; occupancies: OccupancyInfo[] }
  | { action: "app_ping"; ts: number }
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
  | { action: "mahjong_start_countdown" }
  | { action: "mahjong_start" }
  | { action: "mahjong_begin_scoring" }
  | { action: "mahjong_cancel_scoring" }
  | { action: "mahjong_submit_score"; points: number }
  | { action: "mahjong_confirm_score" }
  | { action: "mahjong_cancel_confirm" }
  | { action: "mahjong_finalize_scoring" }
  | { action: "mahjong_reset"; mode: "keep_config" | "to_config" }
  | {
      action: "mahjong_admin_abort";
      reason?: "admin_abort" | "order_invalid";
    };

type ServerMessage =
  | { type: "state"; data: SocketState }
  | { type: "error"; message: string }
  | { type: "app_pong"; ts: number; serverTime: number };

type AlarmType = "countdown";

export class SocketDO extends DurableObject<Cloudflare.Env> {
  private tableInfo: TableInfo | null = null;
  private occupancies: OccupancyInfo[] = [];
  private mahjongState: MatchState | null = null;
  private step = 0;
  private pendingAlarm: AlarmType | null = null;

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  private async hydrateIfNeeded(code: string): Promise<void> {
    if (this.tableInfo) return;
    try {
      const tdb = db(this.env.DB);
      const state = await fetchTableStateForDOByCode(tdb, code);
      if (state) {
        this.tableInfo = state.table as TableInfo;
        this.occupancies = state.occupancies as OccupancyInfo[];
      }
    } catch {}
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const code = url.searchParams.get("code");
      if (code) await this.hydrateIfNeeded(code);
      return this.handleWebSocket(request);
    }

    if (url.pathname === "/update-state" && request.method === "POST") {
      const body = (await request.json()) as {
        table: TableInfo;
        occupancies: OccupancyInfo[];
      };
      this.tableInfo = body.table;
      this.occupancies = body.occupancies;
      this.checkOrderValidity();
      this.broadcastState();
      return new Response("ok");
    }

    if (url.pathname === "/state" && request.method === "GET") {
      return Response.json(this.buildState());
    }

    if (url.pathname === "/mahjong-state" && request.method === "GET") {
      return Response.json({
        mahjong: this.mahjongState,
        table: this.tableInfo,
        occupancies: this.occupancies,
      });
    }

    if (url.pathname === "/mahjong-abort" && request.method === "POST") {
      const body = (await request.json()) as {
        reason?: "admin_abort" | "order_invalid";
      };
      await this.abortMatch(body.reason ?? "admin_abort");
      return Response.json({ success: true });
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
          this.checkOrderValidity();
          this.step++;
          this.broadcastState();
          break;

        case "app_ping":
          ws.send(
            JSON.stringify({
              type: "app_pong",
              ts: data.ts,
              serverTime: Date.now(),
            } satisfies ServerMessage),
          );
          break;

        default:
          if (data.action.startsWith("mahjong_")) {
            await this.handleMahjongAction(meta, data);
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

  private checkOrderValidity(): void {
    if (!this.mahjongState) return;
    const activePhases: MatchState["phase"][] = [
      "countdown",
      "playing",
      "scoring",
    ];
    if (!activePhases.includes(this.mahjongState.phase)) return;

    const occupancyUserIds = new Set(this.occupancies.map((o) => o.user_id));
    const missingPlayer = this.mahjongState.players.find(
      (p) => !occupancyUserIds.has(p.userId),
    );

    if (missingPlayer) {
      this.mahjongState = null;
      this.step++;
      this.broadcastState();
    }
  }

  private async abortMatch(reason: TerminationReason): Promise<void> {
    if (!this.mahjongState || this.mahjongState.phase === "ended") return;

    this.mahjongState = engine.abortMatch(
      this.mahjongState,
      reason as "admin_abort" | "order_invalid",
    );
    this.step++;
    this.broadcastState();
    await this.saveMatchToDB();
  }

  private async saveMatchToDB(): Promise<void> {
    if (!this.mahjongState || this.mahjongState.phase !== "ended") return;
    const result = engine.serializeForDB(this.mahjongState);
    if (!result) return;

    try {
      const tdb = db(this.env.DB);
      const [inserted] = await tdb
        .insert(mahjongMatchesTable)
        .values({
          table_id: this.tableInfo?.id ?? null,
          match_type: result.matchType,
          mode: result.mode,
          format: result.format,
          started_at: new Date(result.startedAt),
          ended_at: new Date(result.endedAt),
          termination_reason: result.terminationReason,
          players: result.players,
          config: result.config,
        })
        .returning();

      if (inserted && result.matchType === "tournament") {
        await this.syncScoresToGsz(inserted.id);
      }
    } catch {
      // noop
    }
  }

  private async syncScoresToGsz(matchId: string): Promise<void> {
    if (!this.mahjongState) return;
    const players = this.mahjongState.players;
    if (players.length !== 4) return;

    const allHavePhones = players.every((p) => p.phone);
    if (!allHavePhones) return;

    const sorted = [...players].sort((a, b) => {
      const seatOrder = ["east", "south", "west", "north"];
      return seatOrder.indexOf(a.seat ?? "") - seatOrder.indexOf(b.seat ?? "");
    });

    const endedAt = this.mahjongState.endedAt ?? Date.now();
    const pad = (n: number) => String(n).padStart(2, "0");
    const d = new Date(endedAt);
    const rateTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    try {
      const gszRecordId = await gszFetch<number>(
        this.env,
        "/gszapi/open/score/add",
        {
          params: {
            phone1: sorted[0].phone!,
            phone2: sorted[1].phone!,
            phone3: sorted[2].phone!,
            phone4: sorted[3].phone!,
            point1: String(sorted[0].currentPoints),
            point2: String(sorted[1].currentPoints),
            point3: String(sorted[2].currentPoints),
            point4: String(sorted[3].currentPoints),
            rateTime,
          },
        },
      );

      if (gszRecordId) {
        const tdb = db(this.env.DB);
        await tdb
          .update(mahjongMatchesTable)
          .set({
            gsz_record_id: gszRecordId,
            gsz_synced: true,
            gsz_error: null,
            gsz_synced_at: new Date(),
          })
          .where(eq(mahjongMatchesTable.id, matchId));
      }
    } catch (err) {
      const tdb = db(this.env.DB);
      await tdb
        .update(mahjongMatchesTable)
        .set({
          gsz_synced: false,
          gsz_error: err instanceof Error ? err.message : "公式战同步失败",
        })
        .where(eq(mahjongMatchesTable.id, matchId))
        .catch(() => {});
    }
  }

  private async handleMahjongAction(
    meta: SessionMeta,
    data: ClientMessage,
  ): Promise<void> {
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
          if (engine.allSeated(this.mahjongState)) {
            this.mahjongState = engine.startCountdown(this.mahjongState);
            this.pendingAlarm = "countdown";
            await this.ctx.storage.setAlarm(
              Date.now() + COUNTDOWN_SECONDS * 1000,
            );
          }
          break;
        }
        case "mahjong_start_countdown": {
          if (!this.mahjongState) return;
          if (engine.allSeated(this.mahjongState)) {
            this.mahjongState = engine.startCountdown(this.mahjongState);
            this.pendingAlarm = "countdown";
            await this.ctx.storage.setAlarm(
              Date.now() + COUNTDOWN_SECONDS * 1000,
            );
          }
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
        case "mahjong_cancel_scoring": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.cancelScoring(this.mahjongState);
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
        case "mahjong_confirm_score": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.confirmScore(
            this.mahjongState,
            meta.userId,
          );
          if (engine.allScoresConfirmed(this.mahjongState)) {
            this.mahjongState = engine.finalizeScoring(this.mahjongState);
            await this.saveMatchToDB();
            this.mahjongState = engine.resetKeepConfig(this.mahjongState);
            this.pendingAlarm = "countdown";
            await this.ctx.storage.setAlarm(
              Date.now() + COUNTDOWN_SECONDS * 1000,
            );
          }
          break;
        }
        case "mahjong_cancel_confirm": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.cancelConfirm(
            this.mahjongState,
            meta.userId,
          );
          break;
        }
        case "mahjong_finalize_scoring": {
          if (!this.mahjongState) return;
          this.mahjongState = engine.finalizeScoring(this.mahjongState);
          await this.saveMatchToDB();
          this.mahjongState = engine.resetKeepConfig(this.mahjongState);
          this.pendingAlarm = "countdown";
          await this.ctx.storage.setAlarm(
            Date.now() + COUNTDOWN_SECONDS * 1000,
          );
          break;
        }
        case "mahjong_admin_abort": {
          await this.abortMatch(data.reason ?? "admin_abort");
          return;
        }
        case "mahjong_reset": {
          if (!this.mahjongState) return;
          if (data.mode === "keep_config") {
            this.mahjongState = engine.resetKeepConfig(this.mahjongState);
            this.pendingAlarm = "countdown";
            await this.ctx.storage.setAlarm(
              Date.now() + COUNTDOWN_SECONDS * 1000,
            );
          } else {
            this.mahjongState = engine.resetToConfig(this.mahjongState);
          }
          break;
        }
      }
      this.step++;
      this.broadcastState();

      if (this.mahjongState?.phase === "ended") {
        await this.saveMatchToDB();
      }
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

  async alarm(): Promise<void> {
    if (this.pendingAlarm === "countdown") {
      this.pendingAlarm = null;
      if (this.mahjongState?.phase === "countdown") {
        this.mahjongState = engine.startMatch(this.mahjongState);
        this.step++;
        this.broadcastState();
      }
      return;
    }
  }

  private buildState(): SocketState {
    return {
      table: this.tableInfo,
      occupancies: this.occupancies,
      serverTime: Date.now(),
      mahjong: this.mahjongState,
      step: this.step,
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
