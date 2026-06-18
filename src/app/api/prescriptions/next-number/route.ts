import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk } from "@/lib/api/response";
import { getNextPrescriptionNumber } from "@/lib/prescription-service";

export async function GET() {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const prescriptionNumber = await getNextPrescriptionNumber(ctx.doctorId);
  return apiOk({ prescriptionNumber });
}
