import { atomWithImmer } from "jotai-immer";
import { z } from "zod/v4";

const xssPattern = /[<>]/;

const safeString = z
	.string()
	.trim()
	.max(50)
	.refine((v) => !xssPattern.test(v), { message: "Invalid characters" });

const urlOrEmpty = z
	.string()
	.trim()
	.max(2048)
	.refine((v) => v === "" || z.string().url().safeParse(v).success, {
		message: "Must be a valid URL or empty",
	});

const wechatMenuItemSchema = z.object({
	id: z.string(),
	type: z.enum(["view", "click"]),
	name: safeString,
	url: urlOrEmpty.optional(),
	key: z.string().trim().max(128).optional(),
	link_target: z.string().trim().max(256).optional(),
	notification: z
		.object({
			message: z.string().trim().max(1000),
			translations: z.record(z.string(), z.string()),
		})
		.optional(),
});

const wechatMenuCategorySchema = z.object({
	id: z.string(),
	name: safeString,
	items: z.array(wechatMenuItemSchema),
});

const buttonEntrySchema = z.union([wechatMenuCategorySchema, wechatMenuItemSchema]);

export const wechatMenuDataSchema = z.object({
	buttons: z.array(buttonEntrySchema),
});

export type WechatMenuData = z.infer<typeof wechatMenuDataSchema>;

export const EMPTY_DATA: WechatMenuData = { buttons: [] };

export type WechatMenuStore = {
	data: WechatMenuData;
	savedData: WechatMenuData;
	snapshotName: string;
	initialized: boolean;
};

export const wechatMenuStoreAtom = atomWithImmer<WechatMenuStore>({
	data: EMPTY_DATA,
	savedData: EMPTY_DATA,
	snapshotName: "",
	initialized: false,
});
