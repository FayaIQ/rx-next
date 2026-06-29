import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiNotFound, apiServerError } from "@/lib/api/response";
import { loadPatientFile } from "@/lib/patient-file/load-patient-file";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const patientId = Number(id);
    if (!Number.isFinite(patientId)) return apiNotFound("المريض غير موجود");

    const file = await loadPatientFile(ctx.doctorId, patientId);
    if (!file) return apiNotFound("المريض غير موجود");

    return apiOk(file);
  } catch (error) {
    console.error("patient file load failed:", error);
    return apiServerError(
      error instanceof Error ? error.message : "فشل تحميل ملف المريض"
    );
  }
}
