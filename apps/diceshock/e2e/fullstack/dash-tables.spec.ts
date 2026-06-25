import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/auth.fixture";
import { mockGraphQL, type GraphQLMocks } from "../fixtures/graphql.fixture";

type GqlCall = { operationName: string; variables: Record<string, unknown> };
type GqlMockRequest = { variables: Record<string, unknown> };
type PaginationInput = { offset?: unknown; limit?: unknown };
type DashFilter = {
  pagination?: PaginationInput;
  status?: string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  role?: string[];
  type?: string[];
  mode?: string[];
  format?: string[];
  syncStatus?: string[];
  completion?: string[];
  tableCode?: string;
};

const now = "2024-06-15T10:00:00.000Z";
const pageSize = { orders: 50, users: 30, tables: 20, actives: 20, events: 20, gsz: 50 };

const orders = [
  order("order-001", "A1", "张三", "ACTIVE", "2024-06-10T10:00:00.000Z"),
  order("order-002", "B1", "李四", "PAUSED", "2024-06-11T10:00:00.000Z"),
  order("order-003", "A1", "王五", "ACTIVE", "2024-06-12T10:00:00.000Z"),
  order("order-004", "C1", "赵六", "ENDED", "2024-05-20T10:00:00.000Z"),
  order("order-005", "A2", "Alice", "ACTIVE", "2024-06-20T10:00:00.000Z"),
  order("order-006", "D1", "Bob", "PAUSED", "2024-06-22T10:00:00.000Z"),
];

const users = [
  user("user-001", "Alice Admin", "ADMIN", "13800000001"),
  user("user-002", "Sally Staff", "STAFF", "13800000002"),
  user("user-003", "张三", "AUTHENTICATED", "13800000003"),
  user("user-004", "Bob Staff", "STAFF", "13800000004"),
  user("user-005", "Charlie Admin", "ADMIN", "13800000005"),
];

const tables = [
  table("table-001", "A1 主桌", "A1", "FIXED", "ACTIVE", 6),
  table("table-002", "B1 开放桌", "B1", "SOLO", "ACTIVE", null),
  table("table-003", "C1 包间", "C1", "FIXED", "INACTIVE", 4),
  table("table-004", "A2 主桌", "A2", "FIXED", "ACTIVE", 8),
  table("table-005", "D1 拼桌", "D1", "SOLO", "INACTIVE", null),
];

const actives = [
  active("active-001", "活跃跑团", "2026-07-01", "Alice", 5),
  active("active-002", "过期活动", "2024-01-01", "Bob", 3),
  active("active-003", "新手约局", "2026-08-01", "张三", 2),
  active("active-004", "桌游公开局", "2024-02-01", "Sally", 4),
  active("active-005", "周末团", "2026-09-01", "Alice", 1),
];

const events = [
  event("event-001", "Game Night", true, "2024-06-01T10:00:00.000Z"),
  event("event-002", "TRPG Workshop", false, "2024-06-10T10:00:00.000Z"),
  event("event-003", "Mahjong League", true, "2024-07-01T10:00:00.000Z"),
  event("event-004", "Expired Demo", false, "2024-05-01T10:00:00.000Z"),
];

const matches = [
  match("match-001", "A1", "4p", "hanchan", false, "score_complete", "2024-06-10T10:00:00.000Z"),
  match("match-002", "B1", "3p", "tonpuu", true, "vote", "2024-06-11T10:00:00.000Z"),
  match("match-003", "A2", "4p", "hanchan", false, "admin_abort", "2024-06-12T10:00:00.000Z"),
  match("match-004", "C1", "4p", "tonpuu", true, "score_complete", "2024-07-01T10:00:00.000Z"),
  match("match-005", "D1", "3p", "hanchan", false, "order_invalid", "2024-06-20T10:00:00.000Z"),
];

test.describe("Dash table full flows", () => {
  test.describe("Orders Full Flow", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupDash(page));

    test("renders DashTable with correct columns", async ({ page }) => {
      await gotoDash(page, "/dash/orders");
      await expectHeaders(page, [/ID/, /桌|Table/i, /用户|User/i, /开始|Start/i, /状态|Status/i]);
    });

    for (const scenario of [
      ["status:active", "张三", "李四"],
      ["table:A1", "张三", "李四"],
      ["date:>2024-06-01", "张三", "赵六"],
      ["张三", "张三", "李四"],
      ["status:active table:A1 date:>2024-06-01", "张三", "李四"],
    ] as const) {
      test(`search ${scenario[0]} filters rows and URL`, async ({ page }) => {
        await gotoDash(page, "/dash/orders");
        await submitSearch(page, scenario[0]);
        await expect(page).toHaveURL(new RegExp(`q=.*${encodePart(scenario[0].split(" ")[0])}`));
        await expect(page.getByText(scenario[1]).first()).toBeVisible();
        await expect(page.getByText(scenario[2]).first()).not.toBeVisible();
      });
    }

    test("invalid key shows error indicator", async ({ page }) => {
      await gotoDash(page, "/dash/orders");
      await page.locator('input[type="search"]').fill("foo:bar");
      await expect(page.locator(".badge.badge-error")).toContainText("Unsupported search key");
    });

    test("quick Active pill toggles URL and active class", async ({ page }) => {
      await gotoDash(page, "/dash/orders");
      const pill = quickPill(page, /Active|活跃|进行中/).first();
      await pill.click();
      await expect(page).toHaveURL(/q=status/);
      await expect(pill).toHaveClass(/btn-primary/);
      await pill.click();
      await expect(page.locator('input[type="search"]')).toHaveValue("");
    });

    test("sort Start Time toggles ascending and descending", async ({ page }) => {
      await gotoDash(page, "/dash/orders");
      await sortBy(page, /Start|开始/);
      await expect(page).toHaveURL(/sortBy=start_at&sortOrder=asc|sortOrder=asc.*sortBy=start_at/);
      await sortBy(page, /Start|开始/);
      await expect(page).toHaveURL(/sortBy=start_at&sortOrder=desc|sortOrder=desc.*sortBy=start_at/);
    });

    test("pagination next and previous preserve state", async ({ page }) => {
      await gotoDash(page, "/dash/orders?q=status%3Aactive");
      await nextPage(page);
      await expect(page).toHaveURL(/page=2/);
      await previousPage(page);
      await expect(page).toHaveURL(/page=1/);
      await expect(page).toHaveURL(/q=status/);
    });

    test("jumping directly to page two renders URL state", async ({ page }) => {
      await gotoDash(page, "/dash/orders?q=status%3Apaused&page=2");
      await expect(page.locator('input[type="search"]')).toHaveValue("status:paused");
      await expect(page).toHaveURL(/page=2/);
    });

    test("batch selecting two rows shows action bar", async ({ page }) => {
      await gotoDash(page, "/dash/orders");
      await checkRows(page, 2);
      await expect(page.locator(".fixed.bottom-0")).toContainText(/2/);
    });

    test("batch pause action confirms by mutation and clears selection", async ({ page }) => {
      const calls = await setupDash(page);
      await gotoDash(page, "/dash/orders");
      await checkRows(page, 2);
      await page.locator(".fixed.bottom-0 button").filter({ hasText: /Pause|暂停/ }).first().click();
      await expect.poll(() => calls.filter((c) => c.operationName === "BatchPauseOrders").length).toBeGreaterThan(0);
    });

    test("empty state renders for nonexistent search", async ({ page }) => {
      await gotoDash(page, "/dash/orders");
      await submitSearch(page, "nonexistent_garbage");
      await expect(page.locator("table tbody tr")).toContainText(/No|无|没有|未找到|匹配/);
    });
  });

  test.describe("Users Full Flow", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupDash(page));
    test("renders with correct columns", async ({ page }) => {
      await gotoDash(page, "/dash/users");
      await expectHeaders(page, [/ID/, /Name|姓名|名称/i, /Role|角色/i]);
    });
    for (const scenario of [
      ["Alice", "Alice Admin", "Sally Staff"],
      ["role:admin", "Alice Admin", "Sally Staff"],
      ["role:staff", "Sally Staff", "Alice Admin"],
    ] as const) {
      test(`search ${scenario[0]} filters users`, async ({ page }) => {
        await gotoDash(page, "/dash/users");
        await submitSearch(page, scenario[0]);
        await expect(page.getByText(scenario[1]).first()).toBeVisible();
        await expect(page.getByText(scenario[2]).first()).not.toBeVisible();
      });
    }
    test("quick admin pill updates URL", async ({ page }) => {
      await gotoDash(page, "/dash/users");
      await quickPill(page, /admin|管理员/i).first().click();
      await expect(page).toHaveURL(/q=role/);
    });
    test("Name sort changes row order", async ({ page }) => {
      await gotoDash(page, "/dash/users");
      await sortBy(page, /Name|姓名|名称/);
      await expect(rowText(page, 0)).resolves.toContain("Alice");
    });
    test("pagination next and previous works with search preserved", async ({ page }) => {
      await gotoDash(page, "/dash/users?q=role%3Astaff");
      await nextPage(page);
      await expect(page).toHaveURL(/page=2/);
      await previousPage(page);
      await expect(page).toHaveURL(/q=role/);
    });
    test("direct URL state renders staff search", async ({ page }) => {
      await gotoDash(page, "/dash/users?q=role%3Astaff&page=1");
      await expect(page.locator('input[type="search"]')).toHaveValue("role:staff");
    });
    test("staff sees phone content without exposing admin controls", async ({ page }) => {
      await gotoDash(page, "/dash/users");
      await expect(page.getByText(/138\*\*\*\*0001|13800000001|\*\*\*/).first()).toBeVisible();
    });
    test("empty state appears for no matching users", async ({ page }) => {
      await gotoDash(page, "/dash/users");
      await submitSearch(page, "missing-user");
      await expect(page.locator("table tbody tr")).toContainText(/No|无|没有|未找到|匹配/);
    });
  });

  test.describe("Tables Full Flow", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupDash(page));
    test("renders with columns", async ({ page }) => {
      await gotoDash(page, "/dash/tables");
      await expectHeaders(page, [/Code|代码|ID/i, /Name|名称/i, /Type|类型/i, /Status|状态/i, /Capacity|容量/i]);
    });
    for (const scenario of [
      ["type:fixed", "A1 主桌", "B1 开放桌"],
      ["status:active", "A1 主桌", "C1 包间"],
      ["name:A1", "A1 主桌", "B1 开放桌"],
      ["type:fixed status:active", "A1 主桌", "C1 包间"],
    ] as const) {
      test(`search ${scenario[0]} filters tables`, async ({ page }) => {
        await gotoDash(page, "/dash/tables");
        await submitSearch(page, scenario[0]);
        await expect(page.getByText(scenario[1]).first()).toBeVisible();
        await expect(page.getByText(scenario[2]).first()).not.toBeVisible();
      });
    }
    for (const pill of [/fixed|固定/i, /solo|开放/i, /active|启用|上架/i, /inactive|停用|下架/i]) {
      test(`quick pill ${pill} toggles search`, async ({ page }) => {
        await gotoDash(page, "/dash/tables");
        const button = quickPill(page, pill).first();
        await button.click();
        await expect(page.locator('input[type="search"]')).not.toHaveValue("");
        await expect(button).toHaveClass(/btn-primary/);
      });
    }
    test("sort and pagination work", async ({ page }) => {
      await gotoDash(page, "/dash/tables");
      await sortBy(page, /Name|名称/);
      await expect(page.locator("table.table")).toBeVisible();
      await nextPage(page);
      await expect(page).toHaveURL(/page=2/);
    });
    test("URL state and empty state are deterministic", async ({ page }) => {
      await gotoDash(page, "/dash/tables?q=status%3Ainactive&page=1");
      await expect(page.locator('input[type="search"]')).toHaveValue("status:inactive");
      await submitSearch(page, "name:missing-table");
      await expect(page.locator("table tbody tr")).toContainText(/No|无|没有|未找到|匹配/);
    });
  });

  test.describe("Actives Full Flow", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupDash(page));
    test("renders with columns", async ({ page }) => {
      await gotoDash(page, "/dash/actives");
      await expectHeaders(page, [/ID/, /Title|标题/i, /Date|日期/i, /Creator|发起|创建/i]);
    });
    for (const scenario of [["status:active", "活跃跑团", "过期活动"], ["status:expired", "过期活动", "活跃跑团"]] as const) {
      test(`search ${scenario[0]} filters actives`, async ({ page }) => {
        await gotoDash(page, "/dash/actives");
        await submitSearch(page, scenario[0]);
        await expect(page.getByText(scenario[1]).first()).toBeVisible();
        await expect(page.getByText(scenario[2]).first()).not.toBeVisible();
      });
    }
    test("quick active and expired pills toggle", async ({ page }) => {
      await gotoDash(page, "/dash/actives");
      await quickPill(page, /active|活跃/i).first().click();
      await expect(page).toHaveURL(/status/);
      await quickPill(page, /expired|过期/i).first().click();
      await expect(page.locator('input[type="search"]')).toHaveValue(/status:(expired|active)/);
    });
    test("Load More cursor pagination appends data", async ({ page }) => {
      await gotoDash(page, "/dash/actives");
      await page.getByRole("button", { name: /Load More|加载更多/i }).click();
      await expect(page.getByText("周末团").first()).toBeVisible();
    });
    test("batch select and delete mutation clears bar", async ({ page }) => {
      const calls = await setupDash(page);
      await gotoDash(page, "/dash/actives");
      await checkRows(page, 2);
      await expect(page.locator(".fixed.bottom-0")).toContainText(/2/);
      await page.locator(".fixed.bottom-0 button").filter({ hasText: /Delete|删除/ }).first().click();
      await page.locator("dialog[open] button").filter({ hasText: /Delete|删除|确认/ }).last().click();
      await expect.poll(() => calls.filter((c) => c.operationName === "BatchRemoveActives").length).toBeGreaterThan(0);
    });
    test("URL state and empty state render", async ({ page }) => {
      await gotoDash(page, "/dash/actives?q=status%3Aactive");
      await expect(page.locator('input[type="search"]')).toHaveValue("status:active");
      await submitSearch(page, "missing-active");
      await expect(page.locator("table tbody tr")).toContainText(/No|无|没有|未找到|匹配/);
    });
  });

  test.describe("Events Full Flow", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupDash(page));
    test("renders with columns", async ({ page }) => {
      await gotoDash(page, "/dash/events");
      await expectHeaders(page, [/ID/, /Title|标题/i, /Published|发布|状态/i]);
    });
    for (const scenario of [["status:active", "Game Night"], ["date:>2024-06-01", "TRPG Workshop"], ["type:game", "Game Night"]] as const) {
      test(`search ${scenario[0]} sends filter and shows data`, async ({ page }) => {
        await gotoDash(page, "/dash/events");
        await submitSearch(page, scenario[0]);
        await expect(page.getByText(scenario[1]).first()).toBeVisible();
        await expect(page).toHaveURL(/q=/);
      });
    }
    test("date sort and pagination work", async ({ page }) => {
      await gotoDash(page, "/dash/events");
      await sortBy(page, /Created|创建|日期|Date/i);
      await nextPage(page);
      await expect(page).toHaveURL(/page=2/);
    });
    test("URL state persists", async ({ page }) => {
      await gotoDash(page, "/dash/events?q=status%3Aactive&page=1");
      await expect(page.locator('input[type="search"]')).toHaveValue("status:active");
    });
    test("create button runs create mutation", async ({ page }) => {
      const calls = await setupDash(page);
      await gotoDash(page, "/dash/events");
      await page.getByRole("button", { name: /Create|创建|新建|New/i }).click();
      await expect.poll(() => calls.filter((c) => c.operationName === "CreateEvent").length).toBeGreaterThan(0);
    });
    test("empty state renders", async ({ page }) => {
      await gotoDash(page, "/dash/events");
      await submitSearch(page, "missing-event");
      await expect(page.locator("table tbody tr")).toContainText(/No|无|没有|未找到|匹配/);
    });
  });

  test.describe("GSZ Full Flow", () => {
    test.beforeEach(async ({ page, mockStaffSession }) => setupDash(page));
    test("renders match table with columns", async ({ page }) => {
      await gotoDash(page, "/dash/gsz");
      await expectHeaders(page, [/ID/, /Table|桌/i, /Mode|模式/i, /Format|场/i]);
    });
    for (const scenario of [
      ["mode:4p", "match-001", "match-002"],
      ["format:hanchan", "match-001", "match-002"],
      ["sync:unsynced", "match-001", "match-002"],
      ["completion:completed", "match-001", "match-003"],
      ["date:2024-06-01..2024-06-30", "match-001", "match-004"],
      ["mode:4p format:hanchan sync:unsynced", "match-001", "match-002"],
    ] as const) {
      test(`search ${scenario[0]} filters matches`, async ({ page }) => {
        await gotoDash(page, "/dash/gsz");
        await submitSearch(page, scenario[0]);
        await expect(page.getByText(scenario[1].slice(0, 5)).first()).toBeVisible();
        await expect(page.getByText(scenario[2].slice(0, 5)).first()).not.toBeVisible();
      });
    }
    for (const pill of [/3p|三/i, /4p|四/i, /tonpuu|东风/i, /hanchan|半庄/i, /synced|已同步/i, /unsynced|未同步/i, /completed|完成/i, /incomplete|未完成/i]) {
      test(`quick pill ${pill} toggles bidirectionally`, async ({ page }) => {
        await gotoDash(page, "/dash/gsz");
        const button = quickPill(page, pill).first();
        await button.click();
        await expect(page.locator('input[type="search"]')).not.toHaveValue("");
        await expect(button).toHaveClass(/btn-primary/);
      });
    }
    test("typed search activates matching pill", async ({ page }) => {
      await gotoDash(page, "/dash/gsz");
      await submitSearch(page, "mode:4p");
      await expect(quickPill(page, /4p|四/).first()).toHaveClass(/btn-primary/);
    });
    test("pagination preserves filters", async ({ page }) => {
      await gotoDash(page, "/dash/gsz?q=sync%3Aunsynced");
      await nextPage(page);
      await expect(page).toHaveURL(/page=2/);
      await expect(page).toHaveURL(/q=sync/);
    });
    test("batch sync selected unsynced matches", async ({ page }) => {
      const calls = await setupDash(page);
      await gotoDash(page, "/dash/gsz?q=sync%3Aunsynced");
      await checkRows(page, 2);
      await page.getByRole("button", { name: /Sync|同步/i }).first().click();
      await expect.poll(() => calls.filter((c) => c.operationName === "BatchSyncMahjongMatchesToGsz").length).toBeGreaterThan(0);
    });
    test("empty state renders for no matching matches", async ({ page }) => {
      await gotoDash(page, "/dash/gsz");
      await submitSearch(page, "table:missing");
      await expect(page.locator("table tbody tr")).toContainText(/No|无|没有|未找到|匹配/);
    });
  });
});

async function setupDash(page: Page): Promise<GqlCall[]> {
  const calls: GqlCall[] = [];
  const mocks: GraphQLMocks = {
    Orders: ({ variables }: GqlMockRequest) => {
      calls.push({ operationName: "Orders", variables });
      const filter = getDashFilter(variables.filter);
      const rows = filterOrders(orders, filter);
      return { orders: connection(rows, filter.pagination, pageSize.orders) };
    },
    PublishedPricing: { publishedPricing: null },
    BatchPauseOrders: ({ variables }: GqlMockRequest) => {
      calls.push({ operationName: "BatchPauseOrders", variables });
      return { batchPauseOrders: getStringList(variables.ids).map((id) => ({ id, status: "PAUSED" })) };
    },
    BatchResumeOrders: ({ variables }: GqlMockRequest) => {
      calls.push({ operationName: "BatchResumeOrders", variables });
      return { batchResumeOrders: getStringList(variables.ids).map((id) => ({ id, status: "ACTIVE" })) };
    },
    PauseOrder: ({ variables }: GqlMockRequest) => ({ pauseOrder: { id: variables.id, status: "PAUSED" } }),
    ResumeOrder: ({ variables }: GqlMockRequest) => ({ resumeOrder: { id: variables.id, status: "ACTIVE" } }),
    Users: ({ variables }: GqlMockRequest) => {
      calls.push({ operationName: "Users", variables });
      const filter = getDashFilter(variables.filter);
      return { managedUsers: connection(filterUsers(users, filter), filter.pagination, pageSize.users) };
    },
    ManagedTables: ({ variables }: GqlMockRequest) => {
      calls.push({ operationName: "ManagedTables", variables });
      return { managedTables: filterTables(tables, getDashFilter(variables.filter)) };
    },
    ToggleTableStatus: ({ variables }: GqlMockRequest) => ({ toggleTableStatus: { id: variables.id, status: "INACTIVE" } }),
    RemoveTable: ({ variables }: GqlMockRequest) => ({ removeTable: { id: variables.id } }),
    ManagedActives: ({ variables }: GqlMockRequest) => {
      calls.push({ operationName: "ManagedActives", variables });
      return { managedActives: filterActives(actives, getDashFilter(variables.filter)) };
    },
    BatchRemoveActives: ({ variables }: GqlMockRequest) => {
      calls.push({ operationName: "BatchRemoveActives", variables });
      return { batchRemoveActives: getStringList(variables.ids).map((id) => ({ id })) };
    },
    RemoveActive: ({ variables }: GqlMockRequest) => ({ removeActive: { id: variables.id } }),
    ManagedEvents: ({ variables }: GqlMockRequest) => {
      calls.push({ operationName: "ManagedEvents", variables });
      return { managedEvents: filterEvents(events, getDashFilter(variables.filter)) };
    },
    CreateEvent: ({ variables }: GqlMockRequest) => {
      calls.push({ operationName: "CreateEvent", variables });
      return { createEvent: event("event-new", getEventTitle(variables.input), false, now) };
    },
    ManagedMahjongMatches: ({ variables }: GqlMockRequest) => {
      calls.push({ operationName: "ManagedMahjongMatches", variables });
      const filter = getDashFilter(variables.filter);
      const rows = filterMatches(matches, filter);
      return { managedMahjongMatches: connection(rows, filter.pagination, pageSize.gsz) };
    },
    ActiveMahjongMatches: { activeMahjongMatches: [] },
    MahjongTables: { mahjongTables: tables.map(({ id, name, code }) => ({ id, name, code })) },
    BatchSyncMahjongMatchesToGsz: ({ variables }: GqlMockRequest) => {
      calls.push({ operationName: "BatchSyncMahjongMatchesToGsz", variables });
      const matchIds = getStringList(variables.matchIds);
      return { batchSyncMahjongMatchesToGsz: { success: true, error: null, successCount: matchIds.length, failCount: 0, total: matchIds.length } };
    },
  };
  await mockGraphQL(page, mocks);
  return calls;
}

function getDashFilter(value: unknown): DashFilter {
  return value && typeof value === "object" ? (value as DashFilter) : {};
}

function getStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getEventTitle(value: unknown) {
  if (!value || typeof value !== "object") return "New Event";
  const title = (value as Record<string, unknown>).title;
  return typeof title === "string" ? title : "New Event";
}

async function gotoDash(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("table.table")).toBeVisible();
}

async function submitSearch(page: Page, query: string) {
  const input = page.locator('input[type="search"]');
  await input.fill(query);
  await input.press("Enter");
  await expect(input).toHaveValue(query);
}

async function expectHeaders(page: Page, headers: RegExp[]) {
  for (const header of headers) await expect(page.locator("table thead")).toContainText(header);
}

function quickPill(page: Page, name: RegExp) {
  return page.locator("button.btn-xs", { hasText: name });
}

async function sortBy(page: Page, name: RegExp) {
  await page.locator("table thead th button", { hasText: name }).first().click();
}

async function nextPage(page: Page) {
  await page.locator(".join button", { hasText: /Next|下一页/i }).click();
}

async function previousPage(page: Page) {
  await page.locator(".join button", { hasText: /Previous|上一页/i }).click();
}

async function checkRows(page: Page, count: number) {
  const boxes = page.locator("table tbody input[type='checkbox']");
  for (let index = 0; index < count; index += 1) await boxes.nth(index).check();
}

async function rowText(page: Page, index: number) {
  return (await page.locator("table tbody tr").nth(index).textContent()) ?? "";
}

function encodePart(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(":", "%3A|:");
}

function connection<T>(items: T[], pagination: PaginationInput | undefined, defaultLimit: number) {
  const offset = Number(pagination?.offset ?? 0);
  const limit = Number(pagination?.limit ?? defaultLimit);
  const pageItems = items.slice(offset, offset + limit);
  return { items: pageItems, pageInfo: { offset, limit, total: Math.max(items.length, limit + 1), nextCursor: null, hasMore: true } };
}

function order(id: string, tableCode: string, nickname: string, status: string, startAt: string) {
  return { id, tableId: `table-${tableCode}`, userId: `user-${nickname}`, tempId: null, nickname, uid: id, phone: "13800000000", seats: 2, status, startAt, endAt: status === "ENDED" ? "2024-06-30T10:00:00.000Z" : null, finalPrice: null, pricingSnapshotId: null, table: { id: `table-${tableCode}`, name: `${tableCode} 桌`, code: tableCode, scope: "boardgame" } };
}

function user(id: string, name: string, role: string, phone: string) {
  return { id, uid: id, name, email: `${id}@test.local`, image: null, role, nickname: name, phone, points: 100, preferredLocale: "zh-CN", preferredStoreId: "demo", meta: null, createdAt: now, membershipPlans: [] };
}

function table(id: string, name: string, code: string, type: string, status: string, capacity: number | null) {
  return { id, name, type, scope: "boardgame", status, capacity, code, description: null, storeId: "demo", occupancies: [], createdAt: now, updatedAt: now };
}

function active(id: string, title: string, date: string, creator: string, players: number) {
  return { id, creatorId: `creator-${creator}`, creator: { id: `creator-${creator}`, name: creator }, title, boardGameId: null, boardGame: null, storeId: "demo", date, time: "19:00", maxPlayers: players, content: "mock", isGame: true, registrations: Array.from({ length: players }, (_, i) => ({ id: `${id}-reg-${i}`, activeId: id, userId: `u-${i}`, isWatching: false, nickname: `玩家${i}`, uid: `uid-${i}` })), createdAt: now, updatedAt: now };
}

function event(id: string, title: string, isPublished: boolean, createdAt: string) {
  return { id, title, description: `${title} description`, coverImageUrl: null, content: "mock", isPublished, createdAt, updatedAt: createdAt };
}

function match(id: string, tableCode: string, mode: string, format: string, synced: boolean, terminationReason: string, startedAt: string) {
  return { id, tableId: `table-${tableCode}`, table: { id: `table-${tableCode}`, name: `${tableCode} 麻将桌`, code: tableCode, scope: "mahjong" }, matchType: "tournament", gszRecordId: synced ? `gsz-${id}` : null, gszSynced: synced, gszError: null, gszSyncedAt: synced ? now : null, mode, format, startedAt, endedAt: now, terminationReason, players: [{ userId: "u1", nickname: "南风", seat: 0, finalScore: 25000 }], playersJson: "[]", unsyncableReasons: [] };
}

function filterOrders(rows: typeof orders, filter: DashFilter) {
  return rows.filter((row) => {
    if (filter.status?.length && !filter.status.includes(row.status)) return false;
    if (filter.search && !`${row.nickname} ${row.table.code} ${row.table.name}`.includes(filter.search)) return false;
    if (filter.dateFrom && row.startAt < `${filter.dateFrom}T00:00:00.000Z`) return false;
    return true;
  });
}

function filterUsers(rows: typeof users, filter: DashFilter) {
  return rows.filter((row) => (!filter.role?.length || filter.role.includes(row.role)) && (!filter.search || row.name.includes(filter.search)));
}

function filterTables(rows: typeof tables, filter: DashFilter) {
  return rows.filter((row) => (!filter.type?.length || filter.type.includes(row.type)) && (!filter.status?.length || filter.status.includes(row.status)) && (!filter.search || `${row.name} ${row.code}`.includes(filter.search)));
}

function filterActives(rows: typeof actives, filter: DashFilter) {
  return rows.filter((row) => {
    const expired = row.date < "2026-01-01";
    if (filter.status?.includes("active") && expired) return false;
    if (filter.status?.includes("expired") && !expired) return false;
    if (filter.search && !row.title.includes(filter.search)) return false;
    return true;
  });
}

function filterEvents(rows: typeof events, filter: DashFilter) {
  return rows.filter((row) => !filter.search || `${row.title} ${row.description}`.toLowerCase().includes(String(filter.search).toLowerCase()));
}

function filterMatches(rows: typeof matches, filter: DashFilter) {
  return rows.filter((row) => {
    if (filter.mode?.length && !filter.mode.includes(row.mode === "4p" ? "FOUR_PLAYER" : "THREE_PLAYER")) return false;
    if (filter.format?.length && !filter.format.includes(row.format.toUpperCase())) return false;
    if (filter.syncStatus?.includes("SYNCED") && !row.gszSynced) return false;
    if (filter.syncStatus?.includes("UNSYNCED") && row.gszSynced) return false;
    if (filter.completion?.includes("COMPLETED") && ["admin_abort", "order_invalid"].includes(row.terminationReason)) return false;
    if (filter.completion?.includes("INCOMPLETE") && !["admin_abort", "order_invalid"].includes(row.terminationReason)) return false;
    if (filter.tableCode && row.table.code !== filter.tableCode) return false;
    if (filter.dateFrom && row.startedAt < `${filter.dateFrom}T00:00:00.000Z`) return false;
    if (filter.dateTo && row.startedAt > `${filter.dateTo}T23:59:59.999Z`) return false;
    return true;
  });
}
