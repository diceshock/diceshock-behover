import { z } from "zod/v4";

// --- Edit User ---

export const editUserSchema = z.object({
	name: z.string().trim().max(50),
	nickname: z.string().trim().max(50),
	phone: z.string().trim().max(20),
});

export type EditUserForm = z.infer<typeof editUserSchema>;

// --- Add Plan ---

export const addPlanSchema = z.object({
	planType: z.enum(["monthly", "monthly_cc", "yearly", "stored_value"]),
	amount: z.string().trim().max(20),
	pointsChange: z.string().trim().max(20),
	startDate: z.string().trim().max(10),
	endDate: z.string().trim().max(10),
});

export type AddPlanForm = z.infer<typeof addPlanSchema>;

// --- Edit Plan ---

export const editPlanSchema = z.object({
	planType: z.enum(["monthly", "monthly_cc", "yearly", "stored_value"]),
	amount: z.string().trim().max(20),
	startDate: z.string().trim().max(10),
	endDate: z.string().trim().max(10),
});

export type EditPlanForm = z.infer<typeof editPlanSchema>;

// --- Deduct ---

export const deductSchema = z.object({
	amount: z.string().trim().max(20),
	deductPoints: z.string().trim().max(20),
	note: z.string().trim().min(1, "请输入划扣说明").max(200),
	date: z.string().trim().max(10),
});

export type DeductForm = z.infer<typeof deductSchema>;
