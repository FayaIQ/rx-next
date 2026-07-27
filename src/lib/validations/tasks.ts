import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/constants";

const optionalId = z.coerce.number().int().positive().nullable().optional();

export const createClinicTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "عنوان المهمة يجب أن يكون 3 أحرف على الأقل")
    .max(180, "عنوان المهمة طويل جداً"),
  description: z.string().trim().max(5000, "تفاصيل المهمة طويلة جداً").nullable().optional(),
  assignedToId: optionalId,
  patientId: optionalId,
  priority: z.enum(TASK_PRIORITIES).default("normal"),
  dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
});

export const updateClinicTaskSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    assignedToId: optionalId,
    patientId: optionalId,
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "لا توجد تغييرات للحفظ",
  });

export const createTaskCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "اكتب التعليق أولاً")
    .max(2000, "التعليق طويل جداً"),
});
