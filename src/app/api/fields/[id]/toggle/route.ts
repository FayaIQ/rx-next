import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiNotFound } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import {
  nextPrintableFieldPosition,
  serializePatientField,
} from "@/lib/patient-field-serializer";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const body = await req.json();
  const toggle = body.toggle as "active" | "printable" | undefined;
  if (!toggle) return apiError("نوع التبديل مطلوب");

  const existing = await prisma.patientField.findFirst({
    where: { id: toDbId(id), doctorId: toDbId(ctx.doctorId) },
  });
  if (!existing) return apiNotFound();

  const enablingPrint = toggle === "printable" && !existing.isPrintable;
  const position =
    enablingPrint && !existing.isPersonal
      ? existing.designX != null && existing.designY != null
        ? null
        : await nextPrintableFieldPosition(ctx.doctorId)
      : null;

  const field = await prisma.patientField.update({
    where: { id: existing.id },
    data: {
      ...(toggle === "active"
        ? { isActive: !existing.isActive }
        : { isPrintable: !existing.isPrintable }),
      ...(position
        ? { designX: position.designX, designY: position.designY }
        : {}),
    },
  });

  return apiOk({ field: serializePatientField(field) });
}
