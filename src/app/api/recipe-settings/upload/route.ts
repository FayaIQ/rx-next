import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError } from "@/lib/api/response";
import { serializeRecipeSettings, ensureRecipeSettings } from "@/lib/recipe-settings";
import {
  saveUploadedImage,
  deleteUploadedFile,
  type UploadKind,
} from "@/lib/upload";

const FIELD_MAP: Record<string, "logoPath" | "designImagePath"> = {
  logo: "logoPath",
  design: "designImagePath",
};

export async function POST(req: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const form = await req.formData();
  const kind = form.get("kind") as UploadKind | null;
  const file = form.get("file");

  if (!kind || !(kind in FIELD_MAP)) {
    return apiError("نوع الرفع غير صالح");
  }
  if (!(file instanceof File)) {
    return apiError("الملف مطلوب");
  }

  const settings = await ensureRecipeSettings(ctx.doctorId);

  try {
    const dbField = FIELD_MAP[kind];
    const oldPath = settings[dbField];
    const newPath = await saveUploadedImage(file, ctx.doctorId, kind);

    const updated = await prisma.recipeSettings.update({
      where: { id: settings.id },
      data: { [dbField]: newPath },
    });

    await deleteUploadedFile(oldPath);

    return apiOk({ settings: serializeRecipeSettings(updated), path: newPath });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "فشل رفع الملف");
  }
}
