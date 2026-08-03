import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiError, apiOk } from "@/lib/api/response";
import { ensureRecipeSettings } from "@/lib/recipe-settings-server";
import { doctorOnboardingSchema } from "@/lib/validations/settings";
import { ACADEMIC_RECIPE_TEMPLATE_DEFAULTS } from "@/lib/academic-recipe-template";

function serializeOnboarding(settings: Awaited<ReturnType<typeof ensureRecipeSettings>>) {
  return {
    clinicName: settings.clinicName,
    doctorName: settings.doctorName,
    doctorSpecialty: settings.doctorSpecialty,
    professionalTitle: settings.professionalTitle,
    licenseNumber: settings.licenseNumber,
    services: settings.services,
    phoneNumber: settings.phoneNumber,
    email: settings.email,
    address: settings.address,
    logoPath: settings.logoPath,
    completed: settings.onboardingCompleted,
  };
}

export async function GET() {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const settings = await ensureRecipeSettings(ctx.doctorId);
  return apiOk({ onboarding: serializeOnboarding(settings) });
}

export async function PUT(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const parsed = doctorOnboardingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "بيانات غير صالحة");
  }

  const settings = await ensureRecipeSettings(ctx.doctorId);
  const data = parsed.data;

  const [, updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: settings.doctorId },
      data: { name: data.doctorName },
    }),
    prisma.recipeSettings.update({
      where: { id: settings.id },
      data: {
        ...ACADEMIC_RECIPE_TEMPLATE_DEFAULTS,
        clinicName: data.clinicName,
        doctorName: data.doctorName,
        doctorSpecialty: data.doctorSpecialty,
        professionalTitle: data.professionalTitle,
        licenseNumber: data.licenseNumber,
        services: data.services,
        phoneNumber: data.phoneNumber,
        email: data.email,
        address: data.address,
        designImagePath: null,
        printName: true,
        printAge: true,
        printGender: true,
        printPhone: false,
        printDiagnosis: true,
        onboardingCompleted: true,
      },
    }),
  ]);

  return apiOk({ onboarding: serializeOnboarding(updated) });
}
