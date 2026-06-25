import type { Page, Route } from "@playwright/test";

export type GraphQLMockValue = unknown | ((request: { operationName: string; variables: Record<string, unknown>; body: Record<string, unknown> }) => unknown | Promise<unknown>);

export type GraphQLMocks = Record<string, GraphQLMockValue>;

function operationNameFromQuery(query: unknown): string | undefined {
  if (typeof query !== "string") return undefined;
  return /\b(?:query|mutation|subscription)\s+(\w+)/.exec(query)?.[1];
}

async function fulfillGraphQL(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data }),
  });
}

export async function mockGraphQL(page: Page, mocks: GraphQLMocks) {
  await page.route("**/graphql**", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown> | null;
    const operationName = String(
      body?.operationName ?? operationNameFromQuery(body?.query) ?? "",
    );

    const mock = mocks[operationName];
    if (!mock) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: {} }),
      });
      return;
    }

    const variables =
      body && typeof body.variables === "object" && body.variables !== null
        ? (body.variables as Record<string, unknown>)
        : {};
    const data =
      typeof mock === "function" ? await mock({ operationName, variables, body: body ?? {} }) : mock;
    await fulfillGraphQL(route, data);
  });
}
