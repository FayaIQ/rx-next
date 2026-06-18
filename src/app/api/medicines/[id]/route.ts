import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { medicineSchema } from "@/lib/validations/rx";
import { toDbId, fromDbId } from "@/lib/bigint";
import { emptyMed } from "@/lib/prescription-service";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

function serializeMedicine(medicine: {
  id: bigint | number;
  doctorId: bigint | number;
  name: string;
  type: string;
  dosage: string;
  quantity: string;
  period: string;
  timeOfUse: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}) {
  return {
    id: fromDbId(medicine.id),
    doctorId: fromDbId(medicine.doctorId),
    name: medicine.name,
    type: medicine.type || null,
    dosage: medicine.dosage || null,
    quantity: medicine.quantity || null,
    period: medicine.period || null,
    timeOfUse: medicine.timeOfUse || null,
    createdAt: medicine.createdAt?.toISOString() ?? null,
    updatedAt: medicine.updatedAt?.toISOString() ?? null,
  };
}

export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const medicineDbId = toDbId(id);
    const existing = await prisma.medicine.findFirst({
      where: { id: medicineDbId, doctorId: toDbId(ctx.doctorId) },
    });
    if (!existing) return apiNotFound("الدواء غير موجود");

    const body = await request.json();
    const data = medicineSchema.parse(body);

    const medicine = await prisma.medicine.update({
      where: { id: medicineDbId },
      data: {
        name: data.name,
        type: data.type ?? emptyMed.type,
        dosage: data.dosage ?? emptyMed.dosage,
        quantity: data.quantity ?? emptyMed.quantity,
        period: data.period ?? emptyMed.period,
        timeOfUse: data.timeOfUse ?? emptyMed.timeOfUse,
      },
    });

    return apiOk({ medicine: serializeMedicine(medicine) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const medicineDbId = toDbId(id);

  const existing = await prisma.medicine.findFirst({
    where: { id: medicineDbId, doctorId: toDbId(ctx.doctorId) },
  });
  if (!existing) return apiNotFound("الدواء غير موجود");

  await prisma.medicine.delete({ where: { id: medicineDbId } });
  return apiOk({ success: true });
}
