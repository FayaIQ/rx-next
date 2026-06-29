import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk } from "@/lib/api/response";
import { loadDoctorReports } from "@/lib/reports/load-reports";

export async function GET(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const month = new URL(request.url).searchParams.get("month") ?? undefined;
  const reports = await loadDoctorReports(ctx.doctorId, month ?? undefined);
  return apiOk(reports);
}
