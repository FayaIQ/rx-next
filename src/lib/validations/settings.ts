import { z } from "zod";

import { RECIPE_TEMPLATE_IDS } from "@/lib/recipe-templates";
import { migrateRecipeFontId, RECIPE_FONT_IDS } from "@/lib/recipe-fonts";

export const recipeSettingsSchema = z.object({
  doctorName: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, "اسم الطبيب مطلوب")
  ),
  doctorSpecialty: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, "التخصص مطلوب")
  ),
  additionalText1: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  email: z.preprocess(
    (v) => {
      if (v == null || v === "") return null;
      const s = String(v).trim();
      if (!s) return null;
      return z.string().email().safeParse(s).success ? s : null;
    },
    z.string().email().nullable().optional()
  ),
  address: z.string().nullable().optional(),
  fontFamily: z.preprocess(
    (v) => migrateRecipeFontId(typeof v === "string" ? v : undefined),
    z.enum(RECIPE_FONT_IDS)
  ),
  fontSize: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : "14"),
    z.string().min(1, "حجم الخط مطلوب")
  ),
  opacity: z.number().min(0).max(1),
  paperSize: z.enum(["A4", "A5"]),
  color: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : "#117e65"),
    z.string().min(1, "اللون مطلوب")
  ),
  designMode: z.enum(["design", "image"]),
  designTemplate: z.preprocess(
    (v) =>
      typeof v === "string" && RECIPE_TEMPLATE_IDS.includes(v as (typeof RECIPE_TEMPLATE_IDS)[number])
        ? v
        : "classic",
    z.enum(RECIPE_TEMPLATE_IDS)
  ),
  designImageScale: z.preprocess(
    (v) => Math.min(3, Math.max(1, Math.round(Number(v ?? 1)))),
    z.number().int().min(1).max(3)
  ),
  designPatientX: z.number().min(0).max(100),
  designPatientY: z.number().min(0).max(100),
  designAgeX: z.number().min(0).max(100),
  designAgeY: z.number().min(0).max(100),
  designDateX: z.number().min(0).max(100),
  designDateY: z.number().min(0).max(100),
  designItemsX: z.number().min(0).max(100),
  designItemsY: z.number().min(0).max(100),
  designItemsWidth: z.preprocess(
    (v) => Math.min(92, Math.max(25, Number(v ?? 84))),
    z.number().min(25).max(92)
  ),
  designItemsHeight: z.preprocess(
    (v) => Math.min(80, Math.max(15, Number(v ?? 45))),
    z.number().min(15).max(80)
  ),
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

/** Account settings — phone is the login ID and cannot be changed here. */
export const profileUpdateSchema = profileSchema.omit({ phoneNumber: true });

export type RecipeSettingsInput = z.infer<typeof recipeSettingsSchema>;
export type PatientFieldInput = z.infer<typeof patientFieldSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
