export type GraphQLMockValue = unknown | ((request: {
  operationName: string;
  variables: Record<string, unknown>;
  body: Record<string, unknown>;
}) => unknown | Promise<unknown>);

export type GraphQLMocks = Record<string, GraphQLMockValue>;

export async function mockGraphQL() {
  return;
}
