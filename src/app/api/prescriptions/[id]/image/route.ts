import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiNotFound } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { serializePrescription } from "@/lib/prescription-service";
import { deleteUploadedFile } from "@/lib/upload";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");

  if (kind !== "xray" && kind !== "analysis") {
    return apiError("نوع الصورة غير صالح");
  }

  const dbField = kind === "xray" ? "xrayImage" : "analysisImage";

  const rx = await prisma.prescription.findFirst({
    where: { id: toDbId(id), doctorId: toDbId(ctx.doctorId) },
  });
  if (!rx) return apiNotFound("الوصفة غير موجودة");

  const oldPath = rx[dbField];
  await deleteUploadedFile(oldPath);

  const updated = await prisma.prescription.update({
    where: { id: rx.id },
    data: { [dbField]: null },
    include: { items: true, fieldValues: true, patient: true },
  });

  return apiOk({ prescription: serializePrescription(updated) });
}
