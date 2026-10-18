import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk } from "@/lib/api/response";
import { claimFirstValueEvent, getClinicActivation } from "@/lib/product-analytics/server";
export async function GET() {
  const ctx = await requireDoctorApi(); if (isApiError(ctx)) return ctx;
  return apiOk({ activation: await getClinicActivation(ctx.doctorId) });
}
export async function POST() {
  const ctx = await requireDoctorApi(); if (isApiError(ctx)) return ctx;
  return apiOk({ firstValueCompleted: await claimFirstValueEvent(ctx.doctorId) });
}
