import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError } from "@/lib/api/response";
import { loadDoctorReports } from "@/lib/reports/load-reports";
import { isClinicFeatureEnabled } from "@/lib/clinic-features";

export async function GET(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const month = new URL(request.url).searchParams.get("month") ?? undefined;
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return apiError("الشهر غير صالح");
  const [reports, treatmentEnabled] = await Promise.all([loadDoctorReports(ctx.doctorId, month), isClinicFeatureEnabled(ctx.doctorId, "treatment")]);
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
