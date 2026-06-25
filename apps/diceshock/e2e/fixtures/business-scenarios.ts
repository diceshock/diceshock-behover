import type { MockChatStreamResponse, MockToolCall } from "./chat.fixture";
import type { GraphQLMocks } from "./graphql.fixture";

export const MOCK_REVENUE_DATA = {
  orders: { active: 5, paused: 2, ended: 15, totalRevenue: 4250 },
  today: "2024-06-25",
  topTable: { code: "A1", revenue: 980, hours: 8.5 },
  topUser: { name: "张三", visits: 12, spending: 1500 },
};

export const MOCK_PRICING_PLAN = {
  id: "pricing-001",
  name: "工作日标准",
  status: "PUBLISHED",
  data: {
    config: { daytimeStart: "10:00", daytimeEnd: "18:00" },
    plans: '[{"name":"标准桌","price":30,"unit":"hour"}]',
  },
};

export type BusinessScenario = {
  name: string;
  path: string;
  message: string;
  response: MockChatStreamResponse;
  expectedTexts?: RegExp[];
  expectedToolNames?: string[];
  expectedToolText?: RegExp[];
};

export const BUSINESS_GRAPHQL_MOCKS: GraphQLMocks = {
  Orders: {
    orders: {
      items: [
        order("order-active-a1", "A1", "张三", "ACTIVE", "2024-06-25T10:00:00.000Z"),
        order("order-active-a3", "A3", "李四", "ACTIVE", "2024-06-25T12:30:00.000Z"),
        order("order-paused-b1", "B1", "王五", "PAUSED", "2024-06-25T11:00:00.000Z"),
      ],
      pageInfo: { offset: 0, limit: 50, total: 3, nextCursor: null, hasMore: false },
    },
  },
  PublishedPricing: { publishedPricing: MOCK_PRICING_PLAN },
  PricingDraft: {
    pricingDraft: {
      data: MOCK_PRICING_PLAN.data,
      snapshotId: MOCK_PRICING_PLAN.id,
      snapshotName: MOCK_PRICING_PLAN.name,
      status: MOCK_PRICING_PLAN.status,
    },
  },
  PricingSnapshots: { pricingSnapshots: [MOCK_PRICING_PLAN] },
  PricingSnapshot: { pricingSnapshot: MOCK_PRICING_PLAN },
  Users: {
    managedUsers: {
      items: [user("user-001", "张三", "CUSTOMER"), user("staff-001", "Sally Staff", "STAFF")],
      pageInfo: { offset: 0, limit: 30, total: 2, nextCursor: null, hasMore: false },
    },
  },
  ManagedTables: {
    managedTables: [
      table("table-A1", "A1", "A1 主桌", "boardgame"),
      table("table-A3", "A3", "A3 标准桌", "boardgame"),
      table("table-M1", "M1", "M1 日麻桌", "mahjong"),
    ],
  },
  ManagedActives: {
    managedActives: [
      {
        id: "active-001",
        creatorId: "user-001",
        creator: { id: "user-001", name: "张三" },
        title: "狼人杀活动",
        boardGameId: null,
        boardGame: null,
        storeId: "demo",
        date: "2024-06-26",
        time: "14:00",
        maxPlayers: 8,
        content: "明天下午狼人杀",
        isGame: true,
        registrations: [],
        createdAt: "2024-06-25T00:00:00.000Z",
        updatedAt: "2024-06-25T00:00:00.000Z",
      },
    ],
  },
  ManagedEvents: { managedEvents: [] },
  ManagedMahjongMatches: {
    managedMahjongMatches: {
      items: [
        {
          id: "match-001",
          tableId: "table-M1",
          table: { id: "table-M1", name: "M1 日麻桌", code: "M1", scope: "mahjong" },
          matchType: "tournament",
          gszRecordId: null,
          gszSynced: false,
          gszError: null,
          gszSyncedAt: null,
          mode: "4p",
          format: "hanchan",
          startedAt: "2024-06-21T18:00:00.000Z",
          endedAt: "2024-06-21T19:00:00.000Z",
          terminationReason: "score_complete",
          players: [],
          playersJson: "[]",
          unsyncableReasons: [],
        },
      ],
      pageInfo: { offset: 0, limit: 50, total: 1, nextCursor: null, hasMore: false },
    },
  },
  ActiveMahjongMatches: { activeMahjongMatches: [] },
  MahjongTables: { mahjongTables: [{ id: "table-M1", name: "M1 日麻桌", code: "M1" }] },
};

export function queryTool(
  id: string,
  query: string,
  result: unknown,
  variables: Record<string, unknown> = {},
): MockToolCall {
  return { id, name: "query_gql", args: { query, variables }, result };
}

export function mutationTool(
  id: string,
  query: string,
  description: string,
  variables: Record<string, unknown> = {},
): MockToolCall {
  return {
    id,
    name: "mutate_gql",
    args: { query, variables, description },
    result: { mutationId: id, query, variables, description },
  };
}

export function searchTool(
  id: string,
  entityType: string,
  description: string,
  syntax: string,
): MockToolCall {
  return {
    id,
    name: "format_search_query",
    args: { entityType, description },
    result: syntax,
  };
}

export function participantsTool(id: string): MockToolCall {
  return {
    id,
    name: "query_active_participants",
    args: { active_id: "active-001" },
    result: {
      active: { id: "active-001", title: "狼人杀活动" },
      participants: [
        { id: "user-001", name: "张三", nickname: "三哥", phoneMasked: "138****0000" },
        { id: "user-002", name: "李四", nickname: "四姐", phoneMasked: "139****0000" },
      ],
    },
  };
}

function order(id: string, tableCode: string, nickname: string, status: string, startAt: string) {
  return {
    id,
    tableId: `table-${tableCode}`,
    userId: "user-001",
    tempId: null,
    nickname,
    uid: id,
    phone: "13800000000",
    seats: 2,
    status,
    startAt,
    endAt: status === "ENDED" ? "2024-06-25T18:00:00.000Z" : null,
    finalPrice: status === "ENDED" ? 280 : null,
    pricingSnapshotId: MOCK_PRICING_PLAN.id,
    table: { id: `table-${tableCode}`, name: `${tableCode} 桌`, code: tableCode, scope: "boardgame" },
  };
}

function table(id: string, code: string, name: string, scope: string) {
  return {
    id,
    name,
    type: "FIXED",
    scope,
    status: "ACTIVE",
    capacity: 6,
    code,
    description: null,
    storeId: "demo",
    occupancies: [],
    createdAt: "2024-06-01T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
  };
}

function user(id: string, name: string, role: string) {
  return {
    id,
    uid: id,
    name,
    email: `${id}@diceshock.test`,
    image: null,
    role,
    nickname: name,
    phone: "13800000000",
    points: 100,
    preferredLocale: "zh-CN",
    preferredStoreId: "demo",
    meta: null,
    createdAt: "2024-06-25T00:00:00.000Z",
    membershipPlans: [],
  };
}
