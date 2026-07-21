import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import {
  apiOk,
  apiError,
  apiNotFound,
  apiServerError,
} from "@/lib/api/response";
import { prescriptionSchema } from "@/lib/validations/rx";
import {
  updatePrescription,
  serializePrescription,
} from "@/lib/prescription-service";
import { upsertMedicinePresets } from "@/lib/medicine-preset-service";
import { upsertMedicinesFromPrescription } from "@/lib/medicine-catalog-service";
import { toDbId } from "@/lib/bigint";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;

  const prescription = await prisma.prescription.findFirst({
    where: { id: toDbId(id), doctorId: toDbId(ctx.doctorId) },
    include: {
      items: true,
      fieldValues: true,
      patient: true,
    },
  });

  if (!prescription) return apiNotFound("الوصفة غير موجودة");

  return apiOk({ prescription: serializePrescription(prescription) });
}

export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = prescriptionSchema.parse(body);

    const prescription = await updatePrescription(
      ctx.doctorId,
      Number(id),
      data
    );

    if (!prescription) return apiNotFound("الوصفة غير موجودة");

    after(async () => {
      try {
        await Promise.all([
          upsertMedicinePresets(ctx.doctorId, data.items),
          upsertMedicinesFromPrescription(ctx.doctorId, data.items),
        ]);
      } catch (error) {
        console.error("medicine catalog upsert failed", error);
      }
    });

    return apiOk({ prescription: serializePrescription(prescription) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    if (error instanceof Error) return apiError(error.message);
    return apiServerError(undefined, error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const rxDbId = toDbId(id);

  const existing = await prisma.prescription.findFirst({
    where: { id: rxDbId, doctorId: toDbId(ctx.doctorId) },
  });
  if (!existing) return apiNotFound("الوصفة غير موجودة");

  await prisma.prescription.delete({ where: { id: rxDbId } });
  return apiOk({ success: true });
}
