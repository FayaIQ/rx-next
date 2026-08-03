import { fromDbId } from "@/lib/bigint";
import type { RecipeSettings } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/client";

import { migrateRecipeFontId } from "@/lib/recipe-fonts";
import { ACADEMIC_RECIPE_TEMPLATE_DEFAULTS } from "@/lib/academic-recipe-template";

export type RecipeSettingsDto = {
  id: number;
  doctorId: number;
  clinicName: string | null;
  doctorName: string;
  doctorSpecialty: string;
  professionalTitle: string | null;
  licenseNumber: string | null;
  services: string | null;
  additionalText1: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  fontFamily: string;
  fontSize: string;
  opacity: number;
  paperSize: string;
  color: string;
  logoPath: string | null;
  designImagePath: string | null;
  designMode: string;
  designTemplate: string;
  designImageScale: number;
  designPatientX: number;
  designPatientY: number;
  designAgeX: number;
  designAgeY: number;
  designDateX: number;
  designDateY: number;
  designItemsX: number;
  designItemsY: number;
  designItemsWidth: number;
  designItemsHeight: number;
  showGender: boolean;
  showAge: boolean;
  showPhone: boolean;
  printName: boolean;
  printAge: boolean;
  printGender: boolean;
  printPhone: boolean;
  printDiagnosis: boolean;
  /** Hide design background image when printing (pre-printed paper). */
  printWithoutDesignImage: boolean;
  designPhoneX: number;
  designPhoneY: number;
};

function dec(v: Decimal | number | string | null | undefined, fallback?: number): number {
  if (v == null) return fallback ?? 0;
  return Number(v);
}

function bool(v: boolean | null | undefined, fallback: boolean): boolean {
  return v ?? fallback;
}

/** Defaults for fields added after initial deploy (pre-migration rows). */
export const RECIPE_CORE_FIELD_DEFAULTS = {
  showGender: true,
  showAge: true,
  showPhone: true,
  printPhone: false,
  designPhoneX: 88,
  designPhoneY: 42,
} as const;

function clampNum(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function sanitizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

function nonEmptyStr(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

export function normalizeRecipeSettingsDto(
  input: Partial<RecipeSettingsDto> & Pick<RecipeSettingsDto, "id" | "doctorId">
): RecipeSettingsDto {
  const opacity =
    input.opacity == null ? 0.2 : clampNum(Number(input.opacity), 0, 1);

  return {
    id: input.id,
    doctorId: input.doctorId,
    clinicName: input.clinicName?.trim() || null,
    doctorName: nonEmptyStr(input.doctorName, "طبيب"),
    doctorSpecialty: nonEmptyStr(input.doctorSpecialty, "طب عام"),
    professionalTitle: input.professionalTitle?.trim() || null,
    licenseNumber: input.licenseNumber?.trim() || null,
    services: input.services?.trim() || null,
    additionalText1: input.additionalText1?.trim() || null,
    phoneNumber: input.phoneNumber?.trim() || null,
    email: sanitizeEmail(input.email),
    address: input.address?.trim() || null,
    fontFamily: migrateRecipeFontId(input.fontFamily),
    fontSize: nonEmptyStr(input.fontSize, "14"),
    opacity,
    paperSize: input.paperSize === "A5" ? "A5" : "A4",
    color: nonEmptyStr(input.color, "#117e65"),
    logoPath: input.logoPath ?? null,
    designImagePath: input.designImagePath ?? null,
    designMode: input.designMode === "image" ? "image" : "design",
    designTemplate: input.designTemplate ?? "classic",
    designImageScale: clampNum(Math.round(Number(input.designImageScale ?? 1)), 1, 3),
    designPatientX: clampNum(Number(input.designPatientX ?? 8), 0, 100),
    designPatientY: clampNum(Number(input.designPatientY ?? 6), 0, 100),
    designAgeX: clampNum(Number(input.designAgeX ?? 38), 0, 100),
    designAgeY: clampNum(Number(input.designAgeY ?? 1), 0, 100),
    designDateX: clampNum(Number(input.designDateX ?? 46), 0, 100),
    designDateY: clampNum(Number(input.designDateY ?? 1), 0, 100),
    designItemsX: clampNum(Number(input.designItemsX ?? 8), 0, 100),
    designItemsY: clampNum(Number(input.designItemsY ?? 15), 0, 100),
    designItemsWidth: clampNum(Number(input.designItemsWidth ?? 84), 25, 92),
    designItemsHeight: clampNum(Number(input.designItemsHeight ?? 45), 15, 80),
    showGender: bool(input.showGender, RECIPE_CORE_FIELD_DEFAULTS.showGender),
    showAge: bool(input.showAge, RECIPE_CORE_FIELD_DEFAULTS.showAge),
    showPhone: bool(input.showPhone, RECIPE_CORE_FIELD_DEFAULTS.showPhone),
    printName: bool(input.printName, true),
    printAge: bool(input.printAge, true),
    printGender: bool(input.printGender, true),
    printPhone: bool(input.printPhone, RECIPE_CORE_FIELD_DEFAULTS.printPhone),
    printDiagnosis: bool(input.printDiagnosis, true),
    printWithoutDesignImage: bool(input.printWithoutDesignImage, false),
    designPhoneX: clampNum(
      Number(input.designPhoneX ?? RECIPE_CORE_FIELD_DEFAULTS.designPhoneX),
      0,
      100
    ),
    designPhoneY: clampNum(
      Number(input.designPhoneY ?? RECIPE_CORE_FIELD_DEFAULTS.designPhoneY),
      0,
      100
    ),
  };
}

export function serializeRecipeSettings(rs: RecipeSettings): RecipeSettingsDto {
  const row = rs as RecipeSettings & {
    showGender?: boolean | null;
    showAge?: boolean | null;
    showPhone?: boolean | null;
    printPhone?: boolean | null;
    printWithoutDesignImage?: boolean | null;
    designPhoneX?: Decimal | number | string | null;
    designPhoneY?: Decimal | number | string | null;
  };

  return normalizeRecipeSettingsDto({
    id: fromDbId(rs.id),
    doctorId: fromDbId(rs.doctorId),
    clinicName: rs.clinicName,
    doctorName: rs.doctorName,
    doctorSpecialty: rs.doctorSpecialty,
    professionalTitle: rs.professionalTitle,
    licenseNumber: rs.licenseNumber,
    services: rs.services,
    additionalText1: rs.additionalText1,
    phoneNumber: rs.phoneNumber,
    email: rs.email,
    address: rs.address,
    fontFamily: rs.fontFamily,
    fontSize: rs.fontSize,
    opacity: dec(rs.opacity),
    paperSize: rs.paperSize,
    color: rs.color,
    logoPath: rs.logoPath,
    designImagePath: rs.designImagePath,
    designMode: rs.designMode,
    designTemplate: (rs as RecipeSettings & { designTemplate?: string }).designTemplate,
    designImageScale: rs.designImageScale,
    designPatientX: dec(rs.designPatientX),
    designPatientY: dec(rs.designPatientY),
    designAgeX: dec(rs.designAgeX),
    designAgeY: dec(rs.designAgeY),
    designDateX: dec(rs.designDateX),
    designDateY: dec(rs.designDateY),
    designItemsX: dec(rs.designItemsX),
    designItemsY: dec(rs.designItemsY),
    designItemsWidth: dec(rs.designItemsWidth),
    designItemsHeight: dec(rs.designItemsHeight),
    showGender: row.showGender,
    showAge: row.showAge,
    showPhone: row.showPhone,
    printName: rs.printName,
    printAge: rs.printAge,
    printGender: rs.printGender,
    printPhone: row.printPhone,
    printDiagnosis: rs.printDiagnosis,
    printWithoutDesignImage: row.printWithoutDesignImage,
    designPhoneX: dec(row.designPhoneX, RECIPE_CORE_FIELD_DEFAULTS.designPhoneX),
    designPhoneY: dec(row.designPhoneY, RECIPE_CORE_FIELD_DEFAULTS.designPhoneY),
  });
}

export {
  FONT_OPTIONS,
  RECIPE_FONT_OPTIONS,
  fontFamilyCss,
  migrateRecipeFontId,
} from "@/lib/recipe-fonts";

export const PAPER_OPTIONS = [
  { value: "A4", label: "A4" },
  { value: "A5", label: "A5" },
] as const;

export function defaultRecipeSettingsForDoctor(
  doctorId: number,
  profile?: {
    name?: string | null;
    phoneNumber?: string | null;
  }
): RecipeSettingsDto {
  return normalizeRecipeSettingsDto({
    id: 0,
    doctorId,
    clinicName: null,
    doctorName: profile?.name?.trim() || "د.",
    doctorSpecialty: "طب عام",
    professionalTitle: null,
    licenseNumber: null,
    services: null,
    additionalText1: null,
    phoneNumber: profile?.phoneNumber ?? null,
    email: null,
    address: null,
    fontFamily: "cairo",
    fontSize: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.fontSize,
    opacity: 0.2,
    paperSize: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.paperSize,
    color: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.color,
    logoPath: null,
    designImagePath: null,
    designMode: "design",
    designTemplate: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designTemplate,
    designImageScale: 1,
    designPatientX: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designPatientX,
    designPatientY: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designPatientY,
    designAgeX: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designAgeX,
    designAgeY: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designAgeY,
    designDateX: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designDateX,
    designDateY: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designDateY,
    designItemsX: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designItemsX,
    designItemsY: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designItemsY,
    designItemsWidth: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designItemsWidth,
    designItemsHeight: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designItemsHeight,
    showGender: true,
    showAge: true,
    showPhone: true,
    printName: true,
    printAge: true,
    printGender: true,
    printPhone: false,
    printDiagnosis: true,
    printWithoutDesignImage: false,
    designPhoneX: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designPhoneX,
    designPhoneY: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designPhoneY,
  });
}
