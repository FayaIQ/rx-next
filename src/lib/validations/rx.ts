import { z } from "zod";
import { parsePatientPhoneInput } from "@/lib/patient-utils";

export const genderSchema = z.enum(["male", "female"]);

const patientPhoneSchema = z
  .union([z.string(), z.null()])
  .optional()
  .superRefine((val, ctx) => {
    if (val == null || !String(val).trim()) return;
    const { error } = parsePatientPhoneInput(String(val));
    if (error) {
      ctx.addIssue({ code: "custom", message: error });
    }
  });

export const prescriptionFieldValueSchema = z.object({
  patientFieldId: z.number(),
  value: z.string(),
});

export const patientSchema = z.object({
  name: z.string().min(1, "اسم المريض مطلوب"),
  gender: genderSchema,
  birthdate: z.string().nullable().optional(),
  diagnosis: z.string().nullable().optional(),
  phone: patientPhoneSchema,
  allergies: z.string().max(4000).nullable().optional(),
  currentMedications: z.string().max(4000).nullable().optional(),
  portalInstructions: z.string().max(4000).nullable().optional(),
  fieldValues: z.array(prescriptionFieldValueSchema).optional().default([]),
});

export const medicineSchema = z.object({
  name: z.string().min(1, "اسم الدواء مطلوب"),
  type: z.string().nullable().optional(),
  dosage: z.string().nullable().optional(),
  quantity: z.string().nullable().optional(),
  period: z.string().nullable().optional(),
  timeOfUse: z.string().nullable().optional(),
});

export const prescriptionItemSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "اسم الدواء مطلوب"),
  type: z.string().nullable().optional(),
  dosage: z.string().nullable().optional(),
  quantity: z.string().nullable().optional(),
  period: z.string().nullable().optional(),
  timeOfUse: z.string().nullable().optional(),
});

export const prescriptionSchema = z.object({
  patientId: z.number(),
  prescriptionDate: z.string(),
  diagnosis: z.string().nullable().optional(),
  consultationFee: z.coerce.number().min(0).max(9999999999).optional(),
  consultationFeeWaived: z.boolean().optional().default(false),
  additionalInfo: z.record(z.string(), z.unknown()).nullable().optional(),
  items: z.array(prescriptionItemSchema).min(1, "أضف دواءً واحداً على الأقل"),
  fieldValues: z.array(prescriptionFieldValueSchema).optional().default([]),
});

export type PatientInput = z.infer<typeof patientSchema>;
export type MedicineInput = z.infer<typeof medicineSchema>;
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;

export const appointmentSchema = z.object({
  patientId: z.number(),
  appointmentDatetime: z.string(),
  bookingDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.boolean().optional().default(true),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
