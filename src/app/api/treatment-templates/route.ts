import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { sessionNoteTemplateSchema } from "@/lib/treatment/session-note-template";
import { saveSessionNoteTemplate, serializeSessionNoteTemplate } from "@/lib/treatment/session-note-template-service";

export async function GET() {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;
  const rows = await prisma.dentalSessionTemplate.findMany({ where: { doctorId: toDbId(ctx.doctorId) }, orderBy: { name: "asc" } });
  return apiOk({ templates: rows.map(serializeSessionNoteTemplate) });
}

export async function POST(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;
  try {
    const parsed = sessionNoteTemplateSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("اسم القالب ونص الجلسة مطلوبان (النص حتى 2000 حرف)");
    const row = await saveSessionNoteTemplate(prisma, toDbId(ctx.doctorId), parsed.data);
    return apiOk({ template: serializeSessionNoteTemplate(row!) }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return apiError("يوجد قالب بهذا الاسم", 409);
    return apiServerError(undefined, error);
  }
}
