import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiNotFound } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { loadPatientAccount } from "@/lib/finance/session-billing-service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;
  const patientId = toDbId((await params).id);
  const doctorId = toDbId(ctx.doctorId);
  if (!await prisma.patient.findFirst({ where: { id: patientId, doctorId }, select: { id: true } })) return apiNotFound("المريض غير موجود");
  return apiOk(await loadPatientAccount(doctorId, patientId));
}
