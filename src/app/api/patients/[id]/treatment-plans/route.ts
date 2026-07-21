import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { serializeTreatmentPlan } from "@/lib/treatment/serializer";
import { createTreatmentPlanForPatient } from "@/lib/treatment/create-plan-service";
import { treatmentPlanCreateSchema } from "@/lib/validations/treatment";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { id } = await params;
  const patientDbId = toDbId(id);
  const url = new URL(request.url);
  const toothFdi = url.searchParams.get("toothFdi");

  const patient = await prisma.patient.findFirst({
    where: { id: patientDbId, doctorId: toDbId(ctx.doctorId) },
    select: { id: true },
  });
  if (!patient) return apiNotFound("المريض غير موجود");

  const plans = await prisma.treatmentPlan.findMany({
    where: {
      patientId: patientDbId,
      doctorId: toDbId(ctx.doctorId),
      ...(toothFdi ? { toothFdi: Number(toothFdi) } : {}),
    },
    include: {
      sessions: { orderBy: { sessionNumber: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return apiOk({
    plans: plans.map(serializeTreatmentPlan),
  });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const patientDbId = toDbId(id);

    const patient = await prisma.patient.findFirst({
      where: { id: patientDbId, doctorId: toDbId(ctx.doctorId) },
      select: { id: true },
    });
    if (!patient) return apiNotFound("المريض غير موجود");

    const body = await request.json();
    const data = treatmentPlanCreateSchema.parse(body);

    const plan = await createTreatmentPlanForPatient(
      ctx.doctorId,
      patientDbId,
      data
    );

    return apiOk({ plan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError(undefined, error);
  }
}
