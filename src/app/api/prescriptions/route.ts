import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { prescriptionSchema } from "@/lib/validations/rx";
import {
  createPrescription,
  serializePrescription,
} from "@/lib/prescription-service";
import { upsertMedicinePresets } from "@/lib/medicine-preset-service";
import { upsertMedicinesFromPrescription } from "@/lib/medicine-catalog-service";
import { toDbId } from "@/lib/bigint";
import {
  buildPaginationMeta,
  parsePaginationParams,
} from "@/lib/pagination";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const { page, pageSize, skip } = parsePaginationParams(searchParams);

  const prescriptionNumber = q && /^\d+$/.test(q) ? Number(q) : null;

  const where = {
    doctorId: toDbId(ctx.doctorId),
    ...(q
      ? {
          OR: [
            { patient: { name: { contains: q, mode: "insensitive" as const } } },
            { diagnosis: { contains: q, mode: "insensitive" as const } },
            ...(prescriptionNumber != null ? [{ prescriptionNumber }] : []),
          ],
        }
      : {}),
  };

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      orderBy: { prescriptionDate: "desc" },
      skip,
      take: pageSize,
      include: {
        items: true,
        patient: true,
        fieldValues: true,
      },
    }),
    prisma.prescription.count({ where }),
  ]);

  return apiOk({
    prescriptions: prescriptions.map((p) => ({
      ...serializePrescription(p),
      patientName: p.patient.name,
    })),
    pagination: buildPaginationMeta(page, pageSize, total),
  });
}

export async function POST(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  try {
    const body = await request.json();
    const data = prescriptionSchema.parse(body);
    const prescription = await createPrescription(ctx.doctorId, data);

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

    return apiOk({ prescription: serializePrescription(prescription) }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    if (error instanceof Error) return apiError(error.message);
    return apiServerError();
  }
}
