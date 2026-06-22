import dbFactory from "@lib/db";
import { fetchTableStateForDOByCode } from "@/server/utils/seatTimer";
import type { GQLContext } from "../context";
import { forbidden } from "../errors";
import { requireAuth, requireStaff } from "../guards";

interface PubSubEvent {
  type: string;
  payload?: Record<string, unknown>;
  timestamp?: number;
}

type PubSubNamespace = DurableObjectNamespace;

interface SubscriptionResolver<TArgs extends Record<string, unknown>> {
  subscribe: (
    source: unknown,
    args: TArgs,
    ctx: GQLContext,
  ) => Promise<AsyncIterableIterator<unknown>> | AsyncIterableIterator<unknown>;
  resolve: (event: unknown) => Record<string, unknown>;
}

function ownUserOnly(ctx: GQLContext, userId: string): void {
  if (ctx.userId !== userId) {
    throw forbidden("Can only subscribe to your own notifications");
  }
}

function timestampToIso(timestamp: number | undefined): string {
  return new Date(timestamp ?? Date.now()).toISOString();
}

function payloadWithTimestamp(e: unknown): Record<string, unknown> {
  const event = e as PubSubEvent;
  return {
    ...(event.payload ?? {}),
    updatedAt: timestampToIso(event.timestamp),
  };
}

export async function* createPubSubIterator(
  pubsub: PubSubNamespace,
  channel: string,
): AsyncGenerator<PubSubEvent> {
  const id = pubsub.idFromName(channel);
  const stub = pubsub.get(id);
  const response = await stub.fetch("https://internal/subscribe");
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        if (!chunk.startsWith("data: ")) continue;
        try {
          yield JSON.parse(chunk.slice(6)) as PubSubEvent;
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function* resolveSeatEvents(
  rawIter: AsyncGenerator<PubSubEvent>,
  ctx: GQLContext,
  tableCode: string,
): AsyncGenerator<Record<string, unknown>> {
  const tdb = dbFactory(ctx.env.DB);
  for await (const event of rawIter) {
    const state = await fetchTableStateForDOByCode(tdb, tableCode);
    yield {
      tableCode,
      table: state?.table ?? null,
      occupancies: state?.occupancies ?? [],
      updatedAt: timestampToIso(event.timestamp),
    };
  }
}

function pubsub(ctx: GQLContext): PubSubNamespace {
  return (ctx.env as GQLContext["env"] & { PUBSUB: PubSubNamespace }).PUBSUB;
}

export const subscriptionTypeDefs = `
  extend type Subscription {
    seatUpdated(tableCode: String, storeId: ID): SeatUpdatePayload!
    activeParticipantsChanged(activeId: ID, storeId: ID): ActiveParticipantsChangedPayload!
    notificationReceived(userId: ID!): NotificationPayload!
    leaderboardUpdated(category: LeaderboardCategory, period: LeaderboardPeriod, storeId: ID): LeaderboardUpdatedPayload!
    orderStatusChanged(orderId: ID, tableId: ID, storeId: ID): OrderStatusChangedPayload!
  }
`;

export const subscriptionResolvers: {
  Subscription: Record<string, SubscriptionResolver<Record<string, unknown>>>;
} = {
  Subscription: {
    seatUpdated: {
      subscribe(_source, args, ctx) {
        requireAuth(ctx);
        const tableCode = String(args.tableCode ?? "");
        const rawIter = createPubSubIterator(pubsub(ctx), `seat:${tableCode}`);
        return resolveSeatEvents(rawIter, ctx, tableCode);
      },
      resolve(event) {
        return event as Record<string, unknown>;
      },
    },

    activeParticipantsChanged: {
      subscribe(_source, args, ctx) {
        requireAuth(ctx);
        const activeId = String(args.activeId ?? "");
        return createPubSubIterator(pubsub(ctx), `active:${activeId}`);
      },
      resolve(event) {
        return payloadWithTimestamp(event);
      },
    },

    notificationReceived: {
      subscribe(_source, args, ctx) {
        requireAuth(ctx);
        const userId = String(args.userId);
        ownUserOnly(ctx, userId);
        return createPubSubIterator(pubsub(ctx), `user:${userId}`);
      },
      resolve(event) {
        const e = event as PubSubEvent;
        return {
          ...(e.payload ?? {}),
          createdAt: timestampToIso(e.timestamp),
        };
      },
    },

    leaderboardUpdated: {
      subscribe(_source, args, ctx) {
        requireAuth(ctx);
        const category = String(args.category ?? "");
        return createPubSubIterator(pubsub(ctx), `leaderboard:${category}`);
      },
      resolve(event) {
        const e = event as PubSubEvent;
        return {
          ...((e.payload ?? {}) as Record<string, unknown>),
          updatedAt: timestampToIso(e.timestamp),
        };
      },
    },

    orderStatusChanged: {
      subscribe(_source, args, ctx) {
        requireStaff(ctx);
        const orderId = String(args.orderId ?? "");
        return createPubSubIterator(pubsub(ctx), `order:${orderId}`);
      },
      resolve(event) {
        const e = event as PubSubEvent;
        const p = (e.payload ?? {}) as Record<string, unknown>;
        return {
          ...p,
          currentStatus: p.currentStatus ?? p.status,
          updatedAt: timestampToIso(e.timestamp),
        };
      },
    },
  },
};
