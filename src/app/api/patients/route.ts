import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { patientSchema } from "@/lib/validations/rx";
import { parseBirthdateInput } from "@/lib/patient-utils";
import { serializePatient, serializePatientLight } from "@/lib/patient-serializer";
import { toDbId } from "@/lib/bigint";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const patients = await prisma.patient.findMany({
    where: {
      doctorId: toDbId(ctx.doctorId),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { prescriptions: true } },
      prescriptions: {
        orderBy: { prescriptionDate: "desc" },
        take: 1,
        select: { prescriptionDate: true },
      },
    },
  });

  return apiOk({
    patients: await Promise.all(patients.map(serializePatient)),
  });
}

export async function POST(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const body = await request.json();
    const data = patientSchema.parse(body);
    const birthdate = parseBirthdateInput(data.birthdate);

    const patient = await prisma.patient.create({
      data: {
        name: data.name,
        gender: data.gender,
        birthdate,
        diagnosis: data.diagnosis ?? null,
        phone: data.phone ?? null,
        doctorId: toDbId(ctx.doctorId),
      },
    });

    return apiOk({ patient: serializePatientLight(patient) }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError();
  }
}
