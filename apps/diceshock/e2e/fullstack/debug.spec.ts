import { test, expect } from "../fixtures/auth.fixture";
import { mockGraphQL, type GraphQLMocks } from "../fixtures/graphql.fixture";

test("debug: full page render", async ({ page, mockStaffSession }) => {
  const mocks: GraphQLMocks = {
    Orders: { orders: { items: [{ id: "o1", tableId: "t1", userId: "u1", tempId: null, nickname: "张三", uid: "o1", phone: "138", seats: 2, status: "ACTIVE", startAt: "2024-06-25T10:00:00.000Z", endAt: null, finalPrice: null, pricingSnapshotId: null, table: { id: "t1", name: "A1", code: "A1", scope: "boardgame" } }], pageInfo: { offset: 0, limit: 50, total: 1, nextCursor: null, hasMore: false } } },
    PublishedPricing: { publishedPricing: null },
  };
  await mockGraphQL(page, mocks);
  
  page.on("console", msg => console.log("CONSOLE:", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));
  
  await page.goto("/dash/orders?q=&sortBy=start_at&sortOrder=desc&groupBy=none&page=1");
  await page.waitForTimeout(5000);
  
  const html = await page.content();
  console.log("HTML length:", html.length);
  console.log("Has #root:", html.includes("id=\"root\"") || html.includes("id=\"app\""));
  console.log("Has react-root:", html.includes("__next") || html.includes("__tanstack"));
  
  const bodyHTML = await page.locator("body").innerHTML();
  console.log("BODY HTML (first 2000):", bodyHTML.slice(0, 2000));
});
