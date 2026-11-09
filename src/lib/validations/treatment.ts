import { sessionBillingSchema } from "@/lib/validations/session-billing";
import { z } from "zod";
import { FDI_ALL } from "@/lib/dental/constants";
import {
  PLAN_STATUSES,
  SESSION_STATUSES,
  TREATMENT_TYPES,
} from "@/lib/treatment/constants";

const fdiSchema = z
  .number()
  .int()
  .refine((n) => (FDI_ALL as readonly number[]).includes(n), "رقم السن غير صالح");

const treatmentTypeSchema = z.enum(
  TREATMENT_TYPES.map((t) => t.id) as [string, ...string[]]
);

const sessionStatusSchema = z.enum(
  SESSION_STATUSES.map((s) => s.id) as [string, ...string[]]
);

const planStatusSchema = z.enum(
  PLAN_STATUSES.map((s) => s.id) as [string, ...string[]]
);

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح");

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "وقت غير صالح");

export const treatmentSessionInputSchema = z.object({
  billing: sessionBillingSchema.optional(),
  sessionNumber: z.number().int().min(1).max(20),
  scheduledDate: dateKeySchema.optional().nullable(),
  scheduledTime: timeSchema.optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const treatmentPlanCreateSchema = z.object({
  pricingMode: z.enum(["plan", "per_session"]).optional(),
  billing: sessionBillingSchema.optional(),
  clientRequestId: z.string().min(1).max(64).optional(),
  toothFdi: fdiSchema.nullable().optional(),
  toothFdis: z.array(fdiSchema).min(1).max(32).optional(),
  treatmentType: treatmentTypeSchema,
  title: z.string().max(255).optional().nullable(),
  totalSessions: z.number().int().min(1).max(20).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  sessions: z.array(treatmentSessionInputSchema).min(1).max(20).optional(),
}).superRefine((data, ctx) => {
  if (data.pricingMode === "plan" && data.sessions?.some(s => s.billing)) {
    ctx.addIssue({ code: "custom", path: ["sessions"], message: "سعر الخطة يشمل كل الجلسات؛ لا يمكن إضافة أجور جلسات منفصلة" });
  }
  if (data.pricingMode !== "plan" && data.billing) {
    ctx.addIssue({ code: "custom", path: ["billing"], message: "اختر تسعير الخطة كاملة لتسجيل حساب الخطة" });
  }
  if (data.sessions) {
    if (new Set(data.sessions.map(s => s.sessionNumber)).size !== data.sessions.length) {
      ctx.addIssue({ code: "custom", path: ["sessions"], message: "أرقام الجلسات يجب أن تكون مختلفة" });
    }
    if (data.totalSessions != null && data.totalSessions !== data.sessions.length) {
      ctx.addIssue({ code: "custom", path: ["totalSessions"], message: "عدد الجلسات لا يطابق الخطة" });
    }
  }
  const wholeMouth = data.treatmentType === "full_mouth_cleaning";
  if (data.toothFdis && new Set(data.toothFdis).size !== data.toothFdis.length) {
    ctx.addIssue({ code: "custom", path: ["toothFdis"], message: "السن محدد أكثر من مرة" });
  }
  if (data.toothFdi != null && data.toothFdis && !data.toothFdis.includes(data.toothFdi)) {
    ctx.addIssue({ code: "custom", path: ["toothFdis"], message: "السن الأساسي يجب أن يكون ضمن الأسنان المحددة" });
  }
  if (wholeMouth ? data.toothFdi != null || !!data.toothFdis?.length : data.toothFdi == null && !data.toothFdis?.length) {
    ctx.addIssue({ code: "custom", path: ["toothFdi"], message: wholeMouth
      ? "غسل اسنان يشمل الفم بالكامل ولا يرتبط بسن واحد"
      : "اختر السن لخطة العلاج" });
  }
});

export const treatmentPlanUpdateSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  totalSessions: z.number().int().min(1).max(20).optional().nullable(),
  status: planStatusSchema.optional(),
  notes: z.string().max(4000).optional().nullable(),
});

export const treatmentSessionUpdateSchema = z.object({
  billing: sessionBillingSchema.optional(),
  status: sessionStatusSchema.optional(),
  scheduledDate: dateKeySchema.optional().nullable(),
  scheduledTime: timeSchema.optional(),
  performedAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const treatmentSessionCreateSchema = z.object({
  billing: sessionBillingSchema.optional(),
  sessionNumber: z.number().int().min(1).max(20).optional(),
  scheduledDate: dateKeySchema.optional().nullable(),
  scheduledTime: timeSchema.optional(),
  notes: z.string().max(2000).optional().nullable(),
});
