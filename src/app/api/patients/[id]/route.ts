import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { patientSchema } from "@/lib/validations/rx";
import { parseBirthdateInput, normalizePatientPhoneForSave } from "@/lib/patient-utils";
import { findPatientWithSamePhone } from "@/lib/patient-phone";
import { serializePatient, serializePatientLight } from "@/lib/patient-serializer";
import { upsertPatientFieldValues } from "@/lib/patient-field-value-service";
import { toDbId } from "@/lib/bigint";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id: toDbId(id), doctorId: toDbId(ctx.doctorId) },
    include: {
      fieldValues: true,
    },
  });

  if (!patient) return apiNotFound("المريض غير موجود");

  return apiOk({ patient: await serializePatient(patient) });
}

export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const patientDbId = toDbId(id);
    const existing = await prisma.patient.findFirst({
      where: { id: patientDbId, doctorId: toDbId(ctx.doctorId) },
    });
    if (!existing) return apiNotFound("المريض غير موجود");

    const body = await request.json();
    const data = patientSchema.parse(body);
    const birthdate = parseBirthdateInput(data.birthdate);
    const phone = normalizePatientPhoneForSave(data.phone);

    const duplicate =
      phone != null
        ? await findPatientWithSamePhone(
            ctx.doctorId,
            phone,
            Number(id)
          )
        : null;

    const patient = await prisma.$transaction(async (tx) => {
      const updated = await tx.patient.update({
        where: { id: patientDbId },
        data: {
          name: data.name,
          gender: data.gender,
          birthdate,
          diagnosis: data.diagnosis ?? null,
          phone,
        },
      });

      await upsertPatientFieldValues(
        patientDbId,
        ctx.doctorId,
        data.fieldValues,
        tx
      );

      const fieldValues = await tx.patientFieldValue.findMany({
        where: { patientId: patientDbId },
      });

      return { updated, fieldValues };
    });

    return apiOk({
      patient: serializePatientLight(patient.updated, patient.fieldValues),
      phoneDuplicate: !!duplicate,
      duplicatePatientName: duplicate?.name ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { id } = await params;
  const patientDbId = toDbId(id);

  const existing = await prisma.patient.findFirst({
    where: { id: patientDbId, doctorId: toDbId(ctx.doctorId) },
  });
  if (!existing) return apiNotFound("المريض غير موجود");

  await prisma.patient.delete({ where: { id: patientDbId } });
  return apiOk({ success: true });
}
