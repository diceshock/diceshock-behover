import { z } from "zod/v4";

export const activeDashEditSchema = z.object({
	title: z.string().trim().min(1, "标题必填").max(100),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式无效"),
	time: z.string().regex(/^\d{2}:\d{2}$/, "时间格式无效").optional().or(z.literal("")),
	maxPlayers: z.number().int().min(0).max(100),
	boardGameId: z.string().trim().max(100).optional().or(z.literal("")),
	content: z.string().trim().max(5000).optional().or(z.literal("")),
	isGame: z.boolean(),
});

export type ActiveDashEditForm = z.infer<typeof activeDashEditSchema>;
