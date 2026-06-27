import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError } from "@/lib/api/response";
import { fetchDoctorChanges } from "@/lib/sync/server-data";

export async function GET(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const sinceParam = new URL(request.url).searchParams.get("since");
  if (!sinceParam) return apiError("since مطلوب");

  const since = new Date(sinceParam);
  if (Number.isNaN(since.getTime())) return apiError("since غير صالح");

  const data = await fetchDoctorChanges(ctx.doctorId, since);
  return apiOk({ ...data, syncedAt: new Date().toISOString() });
}
