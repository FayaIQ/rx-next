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
import { toDbId } from "@/lib/bigint";
import { z } from "zod";

export async function GET() {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const prescriptions = await prisma.prescription.findMany({
    where: { doctorId: toDbId(ctx.doctorId) },
    orderBy: { prescriptionDate: "desc" },
    include: {
      items: true,
      patient: true,
      fieldValues: true,
    },
    take: 100,
  });

  return apiOk({
    prescriptions: prescriptions.map((p) => ({
      ...serializePrescription(p),
      patientName: p.patient.name,
    })),
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
        await upsertMedicinePresets(ctx.doctorId, data.items);
      } catch (error) {
        console.error("medicine preset upsert failed", error);
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
