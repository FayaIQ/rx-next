import { fromDbId } from "@/lib/bigint";
import type { RecipeSettings } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export type RecipeSettingsDto = {
  id: number;
  doctorId: number;
  doctorName: string;
  doctorSpecialty: string;
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

export function normalizeRecipeSettingsDto(
  input: Partial<RecipeSettingsDto> & Pick<RecipeSettingsDto, "id" | "doctorId">
): RecipeSettingsDto {
  return {
    id: input.id,
    doctorId: input.doctorId,
    doctorName: input.doctorName ?? "",
    doctorSpecialty: input.doctorSpecialty ?? "",
    additionalText1: input.additionalText1 ?? null,
    phoneNumber: input.phoneNumber ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    fontFamily: input.fontFamily ?? "Cairo",
    fontSize: input.fontSize ?? "14",
    opacity: input.opacity ?? 0.2,
    paperSize: input.paperSize ?? "A4",
    color: input.color ?? "#117e65",
    logoPath: input.logoPath ?? null,
    designImagePath: input.designImagePath ?? null,
    designMode: input.designMode ?? "design",
    designTemplate: input.designTemplate ?? "classic",
    designImageScale: input.designImageScale ?? 1,
    designPatientX: input.designPatientX ?? 8,
    designPatientY: input.designPatientY ?? 6,
    designAgeX: input.designAgeX ?? 38,
    designAgeY: input.designAgeY ?? 1,
    designDateX: input.designDateX ?? 46,
    designDateY: input.designDateY ?? 1,
    designItemsX: input.designItemsX ?? 8,
    designItemsY: input.designItemsY ?? 15,
    designItemsWidth: input.designItemsWidth ?? 84,
    designItemsHeight: input.designItemsHeight ?? 45,
    showGender: bool(input.showGender, RECIPE_CORE_FIELD_DEFAULTS.showGender),
    showAge: bool(input.showAge, RECIPE_CORE_FIELD_DEFAULTS.showAge),
    showPhone: bool(input.showPhone, RECIPE_CORE_FIELD_DEFAULTS.showPhone),
    printName: bool(input.printName, true),
    printAge: bool(input.printAge, true),
    printGender: bool(input.printGender, true),
    printPhone: bool(input.printPhone, RECIPE_CORE_FIELD_DEFAULTS.printPhone),
    printDiagnosis: bool(input.printDiagnosis, true),
    designPhoneX: input.designPhoneX ?? RECIPE_CORE_FIELD_DEFAULTS.designPhoneX,
    designPhoneY: input.designPhoneY ?? RECIPE_CORE_FIELD_DEFAULTS.designPhoneY,
  };
}

export function serializeRecipeSettings(rs: RecipeSettings): RecipeSettingsDto {
  const row = rs as RecipeSettings & {
    showGender?: boolean | null;
    showAge?: boolean | null;
    showPhone?: boolean | null;
    printPhone?: boolean | null;
    designPhoneX?: Decimal | number | string | null;
    designPhoneY?: Decimal | number | string | null;
  };

  return normalizeRecipeSettingsDto({
    id: fromDbId(rs.id),
    doctorId: fromDbId(rs.doctorId),
    doctorName: rs.doctorName,
    doctorSpecialty: rs.doctorSpecialty,
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
    designPhoneX: dec(row.designPhoneX, RECIPE_CORE_FIELD_DEFAULTS.designPhoneX),
    designPhoneY: dec(row.designPhoneY, RECIPE_CORE_FIELD_DEFAULTS.designPhoneY),
  });
}

export const FONT_OPTIONS = [
  { value: "Cairo", label: "Cairo" },
  { value: "FF_Shamel", label: "FF Shamel" },
  { value: "Tajawal", label: "Tajawal" },
] as const;

export const PAPER_OPTIONS = [
  { value: "A4", label: "A4" },
  { value: "A5", label: "A5" },
] as const;

export function fontFamilyCss(family: string): string {
  if (family === "FF_Shamel") return '"FF Shamel", "Cairo", sans-serif';
  if (family === "Cairo") return '"Cairo", sans-serif';
  return "var(--font-tajawal), Tajawal, sans-serif";
}
