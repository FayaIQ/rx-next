import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk } from "@/lib/api/response";
import { fetchDoctorHydration, fetchSecretaryHydration } from "@/lib/sync/server-data";

export async function GET() {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const data =
    ctx.userType === "secretary"
      ? await fetchSecretaryHydration(ctx.doctorId)
      : await fetchDoctorHydration(ctx.doctorId);
  return apiOk({ ...data, syncedAt: new Date().toISOString() });
}
