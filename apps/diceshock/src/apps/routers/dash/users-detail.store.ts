import { z } from "zod/v4";
import { createFormAtom } from "@/shared/forms/createFormAtom";
import dayjs from "@/shared/utils/dayjs-config";

// --- Edit User ---

export const editUserSchema = z.object({
	name: z.string().trim().max(50),
	nickname: z.string().trim().max(50),
	phone: z.string().trim().max(20),
});

export const editUserFormAtoms = createFormAtom(editUserSchema, {
	name: "",
	nickname: "",
	phone: "",
});

// --- Add Plan ---

export const addPlanSchema = z.object({
	planType: z.enum(["monthly", "monthly_cc", "yearly", "stored_value"]),
	amount: z.string().trim().max(20),
	pointsChange: z.string().trim().max(20),
	startDate: z.string().trim().max(10),
	endDate: z.string().trim().max(10),
});

export const addPlanFormAtoms = createFormAtom(addPlanSchema, {
	planType: "monthly",
	amount: "",
	pointsChange: "",
	startDate: dayjs().format("YYYY-MM-DD"),
	endDate: dayjs().add(30, "day").format("YYYY-MM-DD"),
});

// --- Edit Plan ---

export const editPlanSchema = z.object({
	planType: z.enum(["monthly", "monthly_cc", "yearly", "stored_value"]),
	amount: z.string().trim().max(20),
	startDate: z.string().trim().max(10),
	endDate: z.string().trim().max(10),
});

export const editPlanFormAtoms = createFormAtom(editPlanSchema, {
	planType: "monthly",
	amount: "",
	startDate: "",
	endDate: "",
});

// --- Deduct ---

export const deductSchema = z.object({
	amount: z.string().trim().max(20),
	deductPoints: z.string().trim().max(20),
	note: z.string().trim().max(200),
	date: z.string().trim().max(10),
});

export const deductFormAtoms = createFormAtom(deductSchema, {
	amount: "",
	deductPoints: "",
	note: "",
	date: dayjs().format("YYYY-MM-DD"),
});
