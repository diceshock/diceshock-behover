import z from "zod/v4";

export const docsMetaZ = z.object({
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

export const docsContentZ = z.object({
    cover: z.url().optional(),
    title: z.string(),
    subtitle: z.string().optional(),
    body_md: z.string(),
});
