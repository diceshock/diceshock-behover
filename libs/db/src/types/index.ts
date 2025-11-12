import z4 from "zod/v4";

export const pagedZ = <T extends z4.ZodTypeAny>(params: T) =>
  z4.object({
    page: z4.number().int().min(1).default(1),
    pageSize: z4.number().int().min(1).max(100).default(10),
    params,
  });
