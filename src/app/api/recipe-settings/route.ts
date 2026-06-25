import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiNotFound } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import {
  normalizeRecipeSettingsDto,
  serializeRecipeSettings,
} from "@/lib/recipe-settings";
import { recipeSettingsSchema } from "@/lib/validations/settings";

export async function GET() {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const settings = await prisma.recipeSettings.findFirst({
    where: { doctorId: toDbId(ctx.doctorId) },
  });

  if (!settings) return apiNotFound("إعدادات الوصفة غير موجودة");

  return apiOk({ settings: serializeRecipeSettings(settings) });
}

export async function PUT(req: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const body = await req.json();
  const doctorDbId = toDbId(ctx.doctorId);

  const existing = await prisma.recipeSettings.findFirst({
    where: { doctorId: doctorDbId },
  });

  if (!existing) return apiNotFound("إعدادات الوصفة غير موجودة");

  const merged = normalizeRecipeSettingsDto({
    ...serializeRecipeSettings(existing),
    ...(typeof body === "object" && body !== null ? body : {}),
  });

  const parsed = recipeSettingsSchema.safeParse(merged);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "بيانات غير صالحة");
  }

  const data = parsed.data;

  const updated = await prisma.recipeSettings.update({
    where: { id: existing.id },
    data: {
      doctorName: data.doctorName,
      doctorSpecialty: data.doctorSpecialty,
      additionalText1: data.additionalText1 ?? null,
      phoneNumber: data.phoneNumber ?? null,
      email: data.email || null,
      address: data.address ?? null,
      fontFamily: data.fontFamily,
      fontSize: data.fontSize,
      opacity: data.opacity,
      paperSize: data.paperSize,
      color: data.color,
      designMode: data.designMode,
      designTemplate: data.designTemplate ?? "classic",
      designImageScale: data.designImageScale ?? 1,
      designPatientX: data.designPatientX,
      designPatientY: data.designPatientY,
      designAgeX: data.designAgeX,
      designAgeY: data.designAgeY,
      designDateX: data.designDateX,
      designDateY: data.designDateY,
      designItemsX: data.designItemsX,
      designItemsY: data.designItemsY,
      designItemsWidth: data.designItemsWidth,
      designItemsHeight: data.designItemsHeight,
      showGender: data.showGender,
      showAge: data.showAge,
      showPhone: data.showPhone,
      printName: data.printName,
      printAge: data.printAge,
      printGender: data.printGender,
      printPhone: data.printPhone,
      printDiagnosis: data.printDiagnosis,
      designPhoneX: data.designPhoneX,
      designPhoneY: data.designPhoneY,
    },
  });

  return apiOk({ settings: serializeRecipeSettings(updated) });
}
