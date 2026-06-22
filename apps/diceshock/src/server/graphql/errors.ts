import { GraphQLError, type GraphQLErrorExtensions } from "graphql";

export type GQLErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "INTERNAL";

interface ErrorExtensions extends GraphQLErrorExtensions {
  code: GQLErrorCode;
  field?: string;
}

function graphQLError(
  message: string,
  extensions: ErrorExtensions,
): GraphQLError {
  return new GraphQLError(message, { extensions });
}

export function notFound(message = "Resource not found"): GraphQLError {
  return graphQLError(message, { code: "NOT_FOUND" });
}

export function unauthorized(
  message = "Authentication required",
): GraphQLError {
  return graphQLError(message, { code: "UNAUTHORIZED" });
}

export function forbidden(message = "Access forbidden"): GraphQLError {
  return graphQLError(message, { code: "FORBIDDEN" });
}

export function validationError(field: string, message: string): GraphQLError {
  return graphQLError(message, { code: "VALIDATION_ERROR", field });
}

export function internalError(message = "Internal server error"): GraphQLError {
  return graphQLError(message, { code: "INTERNAL" });
}
