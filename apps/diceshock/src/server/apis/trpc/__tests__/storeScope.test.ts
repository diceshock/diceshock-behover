import db from "@lib/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouterDash } from "../index";

vi.mock("@lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lib/db")>();
  return { ...actual, default: vi.fn() };
});

const tables = [
  { id: "table_gg", name: "GG Table", code: "GG01", store_id: "gg" },
  { id: "table_jdk", name: "JDK Table", code: "JDK01", store_id: "jdk" },
];

function buildCaller(storeCode?: string) {
  return appRouterDash.createCaller({
    env: { DB: {} } as never,
    aliyunClient: {} as never,
    userId: "admin_user",
    userRole: "admin",
    storeCode,
  });
}

function eqColumn(column: string, value: string) {
  return (row: Record<string, unknown>) => row[column] === value;
}

function setupDb() {
  const createdEvents: Array<Record<string, unknown>> = [];
  vi.mocked(db).mockReturnValue({
    query: {
      tablesTable: {
        findMany: vi.fn((options?: { where?: (...args: any[]) => any }) => {
          const predicate = options?.where?.(
            { store_id: "store_id" },
            { eq: eqColumn },
          );
          return predicate ? tables.filter(predicate) : tables;
        }),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn((value: Record<string, unknown>) => {
        createdEvents.push(value);
        return {
          returning: vi.fn(() => [{ id: "event_1", ...value }]),
        };
      }),
    })),
  } as never);
  return { createdEvents };
}

describe("store-scoped tRPC routers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tablesManagement.list returns only the current store when storeCode is set", async () => {
    setupDb();

    const result = await buildCaller("gg").tablesManagement.list();

    expect(result).toHaveLength(1);
    expect(result[0]?.store_id).toBe("gg");
  });

  it("tablesManagement.list returns all stores when storeCode is undefined", async () => {
    setupDb();

    const result = await buildCaller(undefined).tablesManagement.list();

    expect(result.map((table) => table.store_id)).toEqual(["gg", "jdk"]);
  });

  it("eventsManagement.create sets store_id from storeCode", async () => {
    const { createdEvents } = setupDb();

    await buildCaller("jdk").eventsManagement.create({
      title: "Riichi Night",
    });

    expect(createdEvents[0]?.store_id).toBe("jdk");
  });
});
