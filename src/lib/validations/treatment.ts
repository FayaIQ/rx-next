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

export const treatmentSessionInputSchema = z.object({
  sessionNumber: z.number().int().min(1).max(20),
  scheduledDate: dateKeySchema.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const treatmentPlanCreateSchema = z.object({
  toothFdi: fdiSchema,
  treatmentType: treatmentTypeSchema,
  title: z.string().max(255).optional().nullable(),
  totalSessions: z.number().int().min(1).max(20).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  sessions: z.array(treatmentSessionInputSchema).min(1).max(20).optional(),
});

export const treatmentPlanUpdateSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  totalSessions: z.number().int().min(1).max(20).optional().nullable(),
  status: planStatusSchema.optional(),
  notes: z.string().max(4000).optional().nullable(),
});

export const treatmentSessionUpdateSchema = z.object({
  status: sessionStatusSchema.optional(),
  scheduledDate: dateKeySchema.optional().nullable(),
  performedAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const treatmentSessionCreateSchema = z.object({
  sessionNumber: z.number().int().min(1).max(20).optional(),
  scheduledDate: dateKeySchema.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
