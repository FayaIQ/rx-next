import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiNotFound } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { patientFieldSchema } from "@/lib/validations/settings";
import { serializePatientField } from "@/lib/patient-field-serializer";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const body = await req.json();
  const parsed = patientFieldSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "بيانات غير صالحة");
  }

  const existing = await prisma.patientField.findFirst({
    where: { id: toDbId(id), doctorId: toDbId(ctx.doctorId) },
  });
  if (!existing) return apiNotFound();

  const field = await prisma.patientField.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      size: parsed.data.size,
      isPersonal: parsed.data.isPersonal ?? false,
      isPrintable: parsed.data.isPrintable ?? false,
    },
  });

  return apiOk({ field: serializePatientField(field) });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const existing = await prisma.patientField.findFirst({
    where: { id: toDbId(id), doctorId: toDbId(ctx.doctorId) },
  });
  if (!existing) return apiNotFound();

  await prisma.patientField.update({
    where: { id: existing.id },
    data: { isActive: false },
  });

  return apiOk({ success: true });
}
