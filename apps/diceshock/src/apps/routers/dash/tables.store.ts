import { z } from "zod/v4";
import { createFormAtom } from "@/shared/forms/createFormAtom";

const xssPattern = /[<>"'`]/;

export const tableCreateSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "桌台名称不能为空")
		.max(50, "桌台名称最多50个字符")
		.refine((v) => !xssPattern.test(v), "名称包含非法字符"),
	type: z.enum(["fixed", "solo"]),
	scope: z.enum(["boardgame", "trpg", "console", "mahjong"]),
	capacity: z.number().int().min(1).max(20),
});

export const tableEditSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "桌台名称不能为空")
		.max(50, "桌台名称最多50个字符")
		.refine((v) => !xssPattern.test(v), "名称包含非法字符"),
	type: z.enum(["fixed", "solo"]),
	scope: z.enum(["boardgame", "trpg", "console", "mahjong"]),
	capacity: z.number().int().min(1).max(20),
	description: z
		.string()
		.trim()
		.max(500, "描述最多500个字符")
		.refine((v) => !xssPattern.test(v), "描述包含非法字符"),
});

export const addOccSchema = z.object({
	userId: z
		.string()
		.trim()
		.min(1, "请输入用户 ID")
		.max(64, "用户 ID 过长")
		.refine((v) => !xssPattern.test(v), "ID 包含非法字符"),
});

export const tableCreateFormAtoms = createFormAtom(tableCreateSchema, {
	name: "",
	type: "fixed" as const,
	scope: "boardgame" as const,
	capacity: 4,
});

export const tableEditFormAtoms = createFormAtom(tableEditSchema, {
	name: "",
	type: "fixed" as const,
	scope: "boardgame" as const,
	capacity: 1,
	description: "",
});

export const addOccFormAtoms = createFormAtom(addOccSchema, {
	userId: "",
});
