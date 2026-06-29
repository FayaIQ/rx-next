import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiNotFound } from "@/lib/api/response";
import { loadPatientQueueSummary } from "@/lib/patient/queue-summary";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const patientId = Number(id);
  if (!Number.isFinite(patientId)) return apiNotFound("المريض غير موجود");

  const summary = await loadPatientQueueSummary(ctx.doctorId, patientId);
  if (!summary) return apiNotFound("المريض غير موجود");

  return apiOk(summary);
}
