import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiNotFound } from "@/lib/api/response";
import { ensurePatientPortalToken } from "@/lib/portal/patient-portal";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const patientId = Number(id);
  if (!Number.isFinite(patientId)) return apiNotFound("المريض غير موجود");

  const token = await ensurePatientPortalToken(patientId, ctx.doctorId);
  if (!token) return apiNotFound("المريض غير موجود");

  return apiOk({ token, url: `/portal/${token}` });
}
