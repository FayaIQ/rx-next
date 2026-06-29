import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiNotFound } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { deleteUploadedFile } from "@/lib/upload";

type Params = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id, imageId } = await params;
  const patientDbId = toDbId(id);
  const imageDbId = toDbId(imageId);

  const image = await prisma.dentalToothImage.findFirst({
    where: {
      id: imageDbId,
      patientId: patientDbId,
      doctorId: toDbId(ctx.doctorId),
    },
  });
  if (!image) return apiNotFound("الصورة غير موجودة");

  await prisma.dentalToothImage.delete({ where: { id: imageDbId } });
  await deleteUploadedFile(image.imageUrl);

  return apiOk({ success: true });
}
