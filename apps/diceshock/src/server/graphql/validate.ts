import type { z } from "zod";
import { validationError } from "./errors";

export function zodToGraphQLError<TSchema extends z.ZodType>(
  schema: TSchema,
  data: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw validationError(issue.path.join(".") || "input", issue.message);
  }
  return result.data;
}
