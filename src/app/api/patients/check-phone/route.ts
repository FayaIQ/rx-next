import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError } from "@/lib/api/response";
import { parsePatientPhoneInput } from "@/lib/patient-utils";
import { findPatientWithSamePhone } from "@/lib/patient-phone";

export async function GET(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("phone")?.trim() ?? "";
  const excludeId = searchParams.get("excludeId");

  if (!raw) {
    return apiOk({ exists: false });
  }

  const { normalized, error } = parsePatientPhoneInput(raw);
  if (error || !normalized) {
    return apiError(error ?? "رقم الهاتف غير صالح");
  }

  const match = await findPatientWithSamePhone(
    ctx.doctorId,
    normalized,
    excludeId ? Number(excludeId) : undefined
  );

  return apiOk({
    exists: !!match,
    patientName: match?.name ?? null,
  });
}
