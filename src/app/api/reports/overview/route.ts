import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk } from "@/lib/api/response";
import { loadDoctorReports } from "@/lib/reports/load-reports";
import { isClinicFeatureEnabled } from "@/lib/clinic-features";

export async function GET(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const month = new URL(request.url).searchParams.get("month") ?? undefined;
  const reports = await loadDoctorReports(ctx.doctorId, month ?? undefined);
  const treatmentEnabled = await isClinicFeatureEnabled(
    ctx.doctorId,
    "treatment"
  );
  return apiOk(
    treatmentEnabled
      ? reports
      : {
          ...reports,
          summary: { ...reports.summary, completedSessions: 0 },
          treatmentBreakdown: [],
        }
  );
}
