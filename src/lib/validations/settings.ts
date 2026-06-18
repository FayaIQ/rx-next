import { z } from "zod";

export const recipeSettingsSchema = z.object({
  doctorName: z.string().min(1, "اسم الطبيب مطلوب"),
  doctorSpecialty: z.string().min(1, "التخصص مطلوب"),
  additionalText1: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  email: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().email("بريد غير صالح").nullable().optional()
  ),
  address: z.string().nullable().optional(),
  fontFamily: z.string().min(1),
  fontSize: z.string().min(1),
  opacity: z.number().min(0).max(1),
  paperSize: z.enum(["A4", "A5"]),
  color: z.string().min(1),
  designMode: z.enum(["design", "image"]),
  designImageScale: z.number().int().min(1).max(3).optional(),
  designPatientX: z.number().min(0).max(100),
  designPatientY: z.number().min(0).max(100),
  designAgeX: z.number().min(0).max(100),
  designAgeY: z.number().min(0).max(100),
  designDateX: z.number().min(0).max(100),
  designDateY: z.number().min(0).max(100),
  designItemsX: z.number().min(0).max(100),
  designItemsY: z.number().min(0).max(100),
  designItemsWidth: z.number().min(25).max(92),
  designItemsHeight: z.number().min(15).max(80),
  showGender: z.preprocess((v) => v ?? true, z.boolean()),
  showAge: z.preprocess((v) => v ?? true, z.boolean()),
  showPhone: z.preprocess((v) => v ?? true, z.boolean()),
  printName: z.preprocess((v) => v ?? true, z.boolean()),
  printAge: z.preprocess((v) => v ?? true, z.boolean()),
  printGender: z.preprocess((v) => v ?? true, z.boolean()),
  printPhone: z.preprocess((v) => v ?? false, z.boolean()),
  printDiagnosis: z.preprocess((v) => v ?? true, z.boolean()),
  designPhoneX: z.preprocess((v) => v ?? 88, z.number().min(0).max(100)),
  designPhoneY: z.preprocess((v) => v ?? 42, z.number().min(0).max(100)),
});

export const patientFieldSchema = z.object({
  name: z.string().min(1, "اسم الحقل مطلوب"),
  size: z.enum(["larg", "medium", "small"]),
  isPersonal: z.boolean().optional().default(false),
  isPrintable: z.boolean().optional().default(false),
});

export const profileSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phoneNumber: z.string().min(8, "رقم الهاتف مطلوب"),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export type RecipeSettingsInput = z.infer<typeof recipeSettingsSchema>;
export type PatientFieldInput = z.infer<typeof patientFieldSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
