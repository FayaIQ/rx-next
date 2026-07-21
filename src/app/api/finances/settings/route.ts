import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { getOrCreateFinanceSettings } from "@/lib/finance/service";
import { serializeFinanceSettings } from "@/lib/finance/serializer";
import { financeSettingsSchema } from "@/lib/validations/finance";
import { z } from "zod";

export async function GET() {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const settings = await getOrCreateFinanceSettings(ctx.doctorId);
  return apiOk({ settings });
}

export async function PUT(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const body = await request.json();
    const data = financeSettingsSchema.parse(body);

    const row = await prisma.clinicFinanceSettings.upsert({
      where: { doctorId: toDbId(ctx.doctorId) },
      create: {
        doctorId: toDbId(ctx.doctorId),
        consultationFee: data.consultationFee,
        followUpFee: data.followUpFee,
        procedureFee: data.procedureFee,
        currency: data.currency,
      },
      update: {
        consultationFee: data.consultationFee,
        followUpFee: data.followUpFee,
        procedureFee: data.procedureFee,
        currency: data.currency,
      },
    });

    return apiOk({ settings: serializeFinanceSettings(row) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError(undefined, error);
  }
}
