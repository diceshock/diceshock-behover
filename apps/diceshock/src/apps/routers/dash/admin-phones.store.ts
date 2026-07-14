import { z } from "zod/v4";

export const addPhoneSchema = z.object({
	phone: z
		.string()
		.trim()
		.regex(/^1[3-9]\d{9}$/, "手机号格式错误")
		.max(11, "手机号最多11位"),
	smsCode: z
		.string()
		.trim()
		.length(6, "验证码6位"),
});

export type AddPhoneForm = z.infer<typeof addPhoneSchema>;

export const removePhoneSchema = z.object({
	phone: z.string().trim().min(1, "手机号不能为空").max(11, "手机号最多11位"),
	removeCode: z
		.string()
		.trim()
		.length(6, "验证码6位"),
});

export type RemovePhoneForm = z.infer<typeof removePhoneSchema>;
