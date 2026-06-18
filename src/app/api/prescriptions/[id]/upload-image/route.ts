import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiNotFound } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { serializePrescription } from "@/lib/prescription-service";
import {
  saveUploadedImage,
  deleteUploadedFile,
  type UploadKind,
} from "@/lib/upload";

type Params = { params: Promise<{ id: string }> };

const FIELD_MAP: Record<string, "xrayImage" | "analysisImage"> = {
  xray: "xrayImage",
  analysis: "analysisImage",
};

export async function POST(req: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const form = await req.formData();
  const kind = form.get("kind") as UploadKind | null;
  const file = form.get("file");

  if (!kind || !(kind in FIELD_MAP)) {
    return apiError("نوع الصورة غير صالح (xray أو analysis)");
  }
  if (!(file instanceof File)) {
    return apiError("الملف مطلوب");
  }

  const rx = await prisma.prescription.findFirst({
    where: { id: toDbId(id), doctorId: toDbId(ctx.doctorId) },
  });
  if (!rx) return apiNotFound("الوصفة غير موجودة");

  try {
    const dbField = FIELD_MAP[kind];
    const oldPath = rx[dbField];
    const newPath = await saveUploadedImage(file, ctx.doctorId, kind, 1600);

    const updated = await prisma.prescription.update({
      where: { id: rx.id },
      data: { [dbField]: newPath },
      include: { items: true, fieldValues: true, patient: true },
    });

    await deleteUploadedFile(oldPath);

    return apiOk({ prescription: serializePrescription(updated), path: newPath });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "فشل رفع الصورة");
  }
}
