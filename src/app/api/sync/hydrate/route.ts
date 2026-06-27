import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk } from "@/lib/api/response";
import { fetchDoctorHydration } from "@/lib/sync/server-data";

export async function GET() {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const data = await fetchDoctorHydration(ctx.doctorId);
  return apiOk({ ...data, syncedAt: new Date().toISOString() });
}
