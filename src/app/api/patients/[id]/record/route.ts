import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiNotFound } from "@/lib/api/response";
import { serializePrescription } from "@/lib/prescription-service";
import { toDbId } from "@/lib/bigint";
import { fromDbId } from "@/lib/bigint";
import {
  buildPaginationMeta,
  parsePaginationParams,
} from "@/lib/pagination";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const patientDbId = toDbId(id);
  const { searchParams } = new URL(request.url);
  const { page, pageSize, skip } = parsePaginationParams(searchParams);

  const patient = await prisma.patient.findFirst({
    where: { id: patientDbId, doctorId: toDbId(ctx.doctorId) },
  });
  if (!patient) return apiNotFound("المريض غير موجود");

  const where = { patientId: patientDbId, doctorId: toDbId(ctx.doctorId) };

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      orderBy: { prescriptionDate: "desc" },
      skip,
      take: pageSize,
      include: {
        items: true,
        fieldValues: { include: { patientField: true } },
      },
    }),
    prisma.prescription.count({ where }),
  ]);

  return apiOk({
    patient: {
      id: fromDbId(patient.id),
      name: patient.name,
      gender: patient.gender,
    },
    prescriptions: prescriptions.map(serializePrescription),
    pagination: buildPaginationMeta(page, pageSize, total),
  });
}
