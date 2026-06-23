import { test, expect } from "../fixtures/vibe.fixture";

test.describe("Worker API contract smoke tests", () => {
  test("GraphQL GET is protected for anonymous users", async ({ request }) => {
    const response = await request.get("/graphql");
    expect([401, 403]).toContain(response.status());
  });

  test("GraphQL POST validates malformed JSON", async ({ request }) => {
    const response = await request.post("/graphql", {
      data: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test("sitemap endpoint returns XML", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"] ?? "").toMatch(/xml/i);
    const text = await response.text();
    expect(text).toContain("<urlset");
  });

  test("font css endpoint returns cacheable CSS", async ({ request }) => {
    const response = await request.get("/fonts/css/zh-CN.css");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"] ?? "").toMatch(/text\/css/i);
    expect(response.headers()["cache-control"] ?? "").toContain("immutable");
    const text = await response.text();
    expect(text).toMatch(/font-family|--font-diceshock-sans/i);
  });

  test("unknown shortlink returns a not-found response", async ({ request }) => {
    const response = await request.get("/x/__missing_vibe_test_shortlink__", { maxRedirects: 0 });
    expect(response.status()).toBe(404);
  });
});
