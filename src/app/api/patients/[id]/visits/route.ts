import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { serializePatientVisit } from "@/lib/visit/serializer";
import { parseDateKey } from "@/lib/treatment/plan-utils";

type Params = { params: Promise<{ id: string }> };

const createSchema = z.object({
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().max(500).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const patientDbId = toDbId(id);

  const patient = await prisma.patient.findFirst({
    where: { id: patientDbId, doctorId: toDbId(ctx.doctorId) },
    select: { id: true },
  });
  if (!patient) return apiNotFound("المريض غير موجود");

  const visits = await prisma.patientVisit.findMany({
    where: { patientId: patientDbId, doctorId: toDbId(ctx.doctorId) },
    orderBy: [{ visitDate: "desc" }, { createdAt: "desc" }],
  });

  return apiOk({ visits: visits.map(serializePatientVisit) });
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

    const body = createSchema.parse(await request.json());

    const visit = await prisma.patientVisit.create({
      data: {
        doctorId: toDbId(ctx.doctorId),
        patientId: patientDbId,
        visitDate: parseDateKey(body.visitDate),
        summary: body.summary?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    });

    return apiOk({ visit: serializePatientVisit(visit) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError();
  }
}
