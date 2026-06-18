import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiNotFound } from "@/lib/api/response";
import { serializePrescription } from "@/lib/prescription-service";
import { toDbId } from "@/lib/bigint";
import { fromDbId } from "@/lib/bigint";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const patientDbId = toDbId(id);

  const patient = await prisma.patient.findFirst({
    where: { id: patientDbId, doctorId: toDbId(ctx.doctorId) },
  });
  if (!patient) return apiNotFound("المريض غير موجود");

  const prescriptions = await prisma.prescription.findMany({
    where: { patientId: patientDbId, doctorId: toDbId(ctx.doctorId) },
    orderBy: { prescriptionDate: "desc" },
    include: {
      items: true,
      fieldValues: { include: { patientField: true } },
    },
  });

  return apiOk({
    patient: {
      id: fromDbId(patient.id),
      name: patient.name,
      gender: patient.gender,
    },
    prescriptions: prescriptions.map(serializePrescription),
  });
}
