import { z } from "zod/v4";

export const createActiveSchema = z.object({
	title: z.string().trim().min(1, "标题必填").max(100),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式错误"),
	time: z
		.string()
		.regex(/^\d{2}:\d{2}$/, "时间格式错误")
		.optional(),
	maxPlayers: z.number().int().min(2).max(50).optional(),
	content: z.string().trim().max(2000).optional(),
	boardGameId: z.string().trim().max(50).optional(),
	isGame: z.boolean().default(true),
});

export type CreateActiveForm = z.infer<typeof createActiveSchema>;
