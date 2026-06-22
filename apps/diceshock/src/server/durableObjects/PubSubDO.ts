import { DurableObject } from "cloudflare:workers";

interface SSEClient {
  controller: ReadableStreamDefaultController;
  id: string;
}

interface PubSubEvent {
  type: string;
  payload: unknown;
  timestamp: number;
}

const HEARTBEAT_INTERVAL = 15_000;
const encoder = new TextEncoder();

export class PubSubDO extends DurableObject<Cloudflare.Env> {
  private sseClients = new Map<string, SSEClient>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/subscribe" && request.method === "GET") {
      return this.handleSSE(request);
    }

    if (url.pathname === "/publish" && request.method === "POST") {
      return this.handlePublish(request);
    }

    if (url.pathname === "/status" && request.method === "GET") {
      return Response.json({
        subscribers: this.sseClients.size,
        channel: this.channelName(request),
      });
    }

    return new Response("Not found", { status: 404 });
  }

  private handleSSE(request: Request): Response {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") ?? crypto.randomUUID();

    const stream = new ReadableStream({
      start: (controller) => {
        this.sseClients.set(clientId, { controller, id: clientId });
        this.ensureHeartbeat();
      },
      cancel: () => {
        this.sseClients.delete(clientId);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Client-Id": clientId,
      },
    });
  }

  private async handlePublish(request: Request): Promise<Response> {
    try {
      const event = (await request.json()) as PubSubEvent;
      if (!this.isPubSubEvent(event)) {
        return Response.json(
          { ok: false, error: "Invalid event" },
          { status: 400 },
        );
      }

      this.broadcast(event);
      return Response.json({ ok: true, subscribers: this.sseClients.size });
    } catch {
      return Response.json(
        { ok: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }
  }

  private ensureHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      const heartbeat = encoder.encode(":heartbeat\n\n");
      for (const [clientId, client] of this.sseClients) {
        try {
          client.controller.enqueue(heartbeat);
        } catch {
          this.sseClients.delete(clientId);
        }
      }
      if (this.sseClients.size === 0 && this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }, HEARTBEAT_INTERVAL);
  }

  private broadcast(event: PubSubEvent): void {
    const payload = this.formatSSE(event);
    for (const [clientId, client] of this.sseClients) {
      try {
        client.controller.enqueue(payload);
      } catch {
        this.sseClients.delete(clientId);
      }
    }
  }

  private formatSSE(event: PubSubEvent): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  }

  private isPubSubEvent(event: unknown): event is PubSubEvent {
    if (!event || typeof event !== "object") return false;
    const candidate = event as Partial<PubSubEvent>;
    return (
      typeof candidate.type === "string" &&
      typeof candidate.timestamp === "number"
    );
  }

  private channelName(request: Request): string {
    return (
      new URL(request.url).searchParams.get("channel") ?? this.ctx.id.toString()
    );
  }
}
