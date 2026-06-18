import { z } from "zod";

export const createDoctorSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().min(8, "رقم الهاتف مطلوب"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
  specialty: z.string().optional(),
});

export const createSecretarySchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().min(8, "رقم الهاتف مطلوب"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
  doctorId: z.number(),
});

export const packageSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  description: z.string().min(1),
  duration: z.number().int().min(1),
  durationUnit: z.enum(["days", "months"]),
  planType: z.string().min(1),
  isTrial: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const activateSubscriptionSchema = z.object({
  packageId: z.number().optional(),
  duration: z.number().int().min(1).optional(),
  durationUnit: z.enum(["days", "months"]).optional(),
  notes: z.string().nullable().optional(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type CreateSecretaryInput = z.infer<typeof createSecretarySchema>;
export type PackageInput = z.infer<typeof packageSchema>;
export type ActivateSubscriptionInput = z.infer<typeof activateSubscriptionSchema>;
