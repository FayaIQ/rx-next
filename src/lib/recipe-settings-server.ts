import "server-only";
import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { defaultRecipeSettingsForDoctor } from "@/lib/recipe-settings";
import {
  ACADEMIC_RECIPE_TEMPLATE_DEFAULTS,
  ACADEMIC_RECIPE_TEMPLATE_LAYOUT_V1,
} from "@/lib/academic-recipe-template";

function sameCoordinate(value: unknown, expected: number) {
  return Math.abs(Number(value) - expected) < 0.001;
}

export async function ensureRecipeSettings(doctorId: number) {
  const doctorDbId = toDbId(doctorId);
  const existing = await prisma.recipeSettings.findFirst({
    where: { doctorId: doctorDbId },
  });
  if (existing) {
    const usesPreviousAcademicDefaults =
      existing.designMode === "design" &&
      existing.designTemplate === "academic" &&
      existing.paperSize === "A4" &&
      existing.fontSize === "14";

    const usesPreviousAcademicLayout =
      existing.designMode === "design" &&
      existing.designTemplate === "academic" &&
      sameCoordinate(
        existing.designPatientX,
        ACADEMIC_RECIPE_TEMPLATE_LAYOUT_V1.designPatientX
      ) &&
      sameCoordinate(
        existing.designPatientY,
        ACADEMIC_RECIPE_TEMPLATE_LAYOUT_V1.designPatientY
      ) &&
      sameCoordinate(
        existing.designAgeX,
        ACADEMIC_RECIPE_TEMPLATE_LAYOUT_V1.designAgeX
      ) &&
      sameCoordinate(
        existing.designAgeY,
        ACADEMIC_RECIPE_TEMPLATE_LAYOUT_V1.designAgeY
      ) &&
      sameCoordinate(
        existing.designDateX,
        ACADEMIC_RECIPE_TEMPLATE_LAYOUT_V1.designDateX
      ) &&
      sameCoordinate(
        existing.designDateY,
        ACADEMIC_RECIPE_TEMPLATE_LAYOUT_V1.designDateY
      );

    if (usesPreviousAcademicDefaults || usesPreviousAcademicLayout) {
      return prisma.recipeSettings.update({
        where: { id: existing.id },
        data: {
          ...(usesPreviousAcademicDefaults
            ? {
                paperSize: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.paperSize,
                fontSize: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.fontSize,
              }
            : {}),
          ...(usesPreviousAcademicLayout
            ? {
                designPatientX:
                  ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designPatientX,
                designPatientY:
                  ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designPatientY,
                designAgeX: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designAgeX,
                designAgeY: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designAgeY,
                designDateX: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designDateX,
                designDateY: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designDateY,
              }
            : {}),
        },
      });
    }

    return existing;
  }

  const user = await prisma.user.findUnique({
    where: { id: doctorDbId },
    select: { name: true, phoneNumber: true },
  });
  const defaults = defaultRecipeSettingsForDoctor(doctorId, user ?? undefined);
  const { id: _id, doctorId: _doctorId, ...data } = defaults;

  return prisma.recipeSettings.create({
    data: { ...data, doctorId: doctorDbId },
  });
}
