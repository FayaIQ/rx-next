import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { patientSchema } from "@/lib/validations/rx";
import { parseBirthdateInput, normalizePatientPhoneForSave } from "@/lib/patient-utils";
import { findPatientWithSamePhone } from "@/lib/patient-phone";
import { serializePatient, serializePatientLight, fetchVisitStatsMap } from "@/lib/patient-serializer";
import { upsertPatientFieldValues } from "@/lib/patient-field-value-service";
import { toDbId } from "@/lib/bigint";
import {
  buildPaginationMeta,
  parsePaginationParams,
} from "@/lib/pagination";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const { page, pageSize, skip } = parsePaginationParams(searchParams);

  const where = {
    doctorId: toDbId(ctx.doctorId),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        fieldValues: true,
      },
    }),
    prisma.patient.count({ where }),
  ]);

  const visitStatsMap = await fetchVisitStatsMap(patients.map((p) => p.id));

  return apiOk({
    patients: await Promise.all(
      patients.map((patient) =>
        serializePatient(patient, visitStatsMap.get(patient.id.toString()))
      )
    ),
    pagination: buildPaginationMeta(page, pageSize, total),
  });
}

export async function POST(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const body = await request.json();
    const data = patientSchema.parse(body);
    const birthdate = parseBirthdateInput(data.birthdate);
    const phone = normalizePatientPhoneForSave(data.phone);

    const duplicate =
      phone != null
        ? await findPatientWithSamePhone(ctx.doctorId, phone)
        : null;

    const patient = await prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          name: data.name,
          gender: data.gender,
          birthdate,
          diagnosis: data.diagnosis ?? null,
          phone,
          allergies: data.allergies?.trim() || null,
          currentMedications: data.currentMedications?.trim() || null,
          portalInstructions: data.portalInstructions?.trim() || null,
          doctorId: toDbId(ctx.doctorId),
        },
      });

      await upsertPatientFieldValues(
        created.id,
        ctx.doctorId,
        data.fieldValues,
        tx
      );

      const fieldValues = await tx.patientFieldValue.findMany({
        where: { patientId: created.id },
      });

      return { created, fieldValues };
    });

    return apiOk(
      {
        patient: serializePatientLight(patient.created, patient.fieldValues),
        phoneDuplicate: !!duplicate,
        duplicatePatientName: duplicate?.name ?? null,
      },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError(undefined, error);
  }
}
