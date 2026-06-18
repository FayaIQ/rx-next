import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiNotFound } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { z } from "zod";
import { serializePatientField } from "@/lib/patient-field-serializer";

type Params = { params: Promise<{ id: string }> };

const positionSchema = z.object({
  designX: z.number().min(0).max(100),
  designY: z.number().min(0).max(100),
});

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const body = await req.json();
  const parsed = positionSchema.safeParse(body);
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
      designX: parsed.data.designX,
      designY: parsed.data.designY,
    },
  });

  return apiOk({ field: serializePatientField(field) });
}
