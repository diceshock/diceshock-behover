import { DurableObject } from "cloudflare:workers";

interface SSEClient {
  controller: ReadableStreamDefaultController;
  connectedAt: number;
}

interface PubSubEvent {
  type: string;
  payload: unknown;
  timestamp: number;
}

const HEARTBEAT_INTERVAL = 15_000;
const encoder = new TextEncoder();

export class PubSubDO extends DurableObject<Cloudflare.Env> {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/subscribe" && request.method === "GET") {
      return this.handleSubscribe();
    }

    if (url.pathname === "/publish" && request.method === "POST") {
      const event = (await request.json()) as PubSubEvent;
      this.broadcast(event);
      return Response.json({ ok: true, subscribers: this.clients.size });
    }

    if (url.pathname === "/status" && request.method === "GET") {
      return Response.json({ subscribers: this.clients.size });
    }

    return new Response("Not found", { status: 404 });
  }

  private handleSubscribe(): Response {
    const clientId = crypto.randomUUID();

    const stream = new ReadableStream({
      start: (controller) => {
        this.clients.set(clientId, {
          controller,
          connectedAt: Date.now(),
        });
        this.ensureHeartbeat();
      },
      cancel: () => {
        this.clients.delete(clientId);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  private broadcast(event: PubSubEvent): void {
    const payload = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
    for (const [id, client] of this.clients) {
      try {
        client.controller.enqueue(payload);
      } catch {
        this.clients.delete(id);
      }
    }
  }

  private ensureHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      const heartbeat = encoder.encode(": heartbeat\n\n");
      for (const [id, client] of this.clients) {
        try {
          client.controller.enqueue(heartbeat);
        } catch {
          this.clients.delete(id);
        }
      }
      if (this.clients.size === 0 && this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }, HEARTBEAT_INTERVAL);
  }
}
