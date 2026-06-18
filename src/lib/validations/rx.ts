import { z } from "zod";

export const genderSchema = z.enum(["male", "female"]);

export const patientSchema = z.object({
  name: z.string().min(1, "اسم المريض مطلوب"),
  gender: genderSchema,
  birthdate: z.string().nullable().optional(),
  diagnosis: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
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

export const prescriptionFieldValueSchema = z.object({
  patientFieldId: z.number(),
  value: z.string(),
});

export const prescriptionSchema = z.object({
  patientId: z.number(),
  prescriptionDate: z.string(),
  diagnosis: z.string().nullable().optional(),
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
