import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { sessionNoteTemplateSchema } from "@/lib/treatment/session-note-template";
import { saveSessionNoteTemplate, deleteSessionNoteTemplate, serializeSessionNoteTemplate } from "@/lib/treatment/session-note-template-service";

type Params = { params: Promise<{ id: string }> };
export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;
  try {
    const { id } = await params;
    const parsed = sessionNoteTemplateSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("اسم القالب ونص الجلسة مطلوبان (النص حتى 2000 حرف)");
    const row = await saveSessionNoteTemplate(prisma, toDbId(ctx.doctorId), parsed.data, toDbId(id));
    return row ? apiOk({ template: serializeSessionNoteTemplate(row) }) : apiNotFound();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return apiError("يوجد قالب بهذا الاسم", 409);
    return apiServerError(undefined, error);
  }
}
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;
  const { id } = await params;
  return await deleteSessionNoteTemplate(prisma, toDbId(ctx.doctorId), toDbId(id))
    ? apiOk({ success: true }) : apiNotFound();
}
