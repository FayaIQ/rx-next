import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { serializeToothImage } from "@/lib/dental/tooth-image-serializer";
import {
  deleteUploadedFile,
  saveUploadedImage,
} from "@/lib/upload";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const patientDbId = toDbId(id);
  const url = new URL(request.url);
  const toothFdi = url.searchParams.get("toothFdi");

  const patient = await prisma.patient.findFirst({
    where: { id: patientDbId, doctorId: toDbId(ctx.doctorId) },
    select: { id: true },
  });
  if (!patient) return apiNotFound("المريض غير موجود");

  const images = await prisma.dentalToothImage.findMany({
    where: {
      patientId: patientDbId,
      doctorId: toDbId(ctx.doctorId),
      ...(toothFdi ? { toothFdi: Number(toothFdi) } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return apiOk({ images: images.map(serializeToothImage) });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const patientDbId = toDbId(id);

    const patient = await prisma.patient.findFirst({
      where: { id: patientDbId, doctorId: toDbId(ctx.doctorId) },
      select: { id: true },
    });
    if (!patient) return apiNotFound("المريض غير موجود");

    const form = await request.formData();
    const file = form.get("file");
    const toothFdi = Number(form.get("toothFdi"));
    const imageType = String(form.get("imageType") ?? "photo");
    const caption = String(form.get("caption") ?? "").trim() || null;

    if (!(file instanceof File)) return apiError("الملف مطلوب");
    if (!Number.isFinite(toothFdi) || toothFdi < 11) {
      return apiError("رقم السن غير صالح");
    }
    if (!["photo", "xray"].includes(imageType)) {
      return apiError("نوع الصورة غير صالح");
    }

    const imageUrl = await saveUploadedImage(file, ctx.doctorId, "tooth", 1600);

    const image = await prisma.dentalToothImage.create({
      data: {
        doctorId: toDbId(ctx.doctorId),
        patientId: patientDbId,
        toothFdi,
        imageUrl,
        imageType,
        caption,
      },
    });

    return apiOk({ image: serializeToothImage(image) });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "فشل رفع الصورة");
  }
}
