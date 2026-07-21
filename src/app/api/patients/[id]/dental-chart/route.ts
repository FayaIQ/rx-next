import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { serializeDentalChart } from "@/lib/dental/serializer";
import { dentalChartUpdateSchema } from "@/lib/validations/dental";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { id } = await params;
  const patientDbId = toDbId(id);

  const patient = await prisma.patient.findFirst({
    where: { id: patientDbId, doctorId: toDbId(ctx.doctorId) },
    select: { id: true, name: true },
  });
  if (!patient) return apiNotFound("المريض غير موجود");

  const chart = await prisma.dentalChart.findUnique({
    where: { patientId: patientDbId },
    include: { teeth: true },
  });

  return apiOk({
    patient: { id: Number(patient.id), name: patient.name },
    chart: chart
      ? serializeDentalChart(chart)
      : {
          id: 0,
          patientId: Number(patient.id),
          doctorId: ctx.doctorId,
          notes: null,
          updatedAt: null,
          teeth: [],
        },
  });
}

export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const patientDbId = toDbId(id);

    const patient = await prisma.patient.findFirst({
      where: { id: patientDbId, doctorId: toDbId(ctx.doctorId) },
    });
    if (!patient) return apiNotFound("المريض غير موجود");

    const body = await request.json();
    const data = dentalChartUpdateSchema.parse(body);

    const chart = await prisma.$transaction(async (tx) => {
      const upserted = await tx.dentalChart.upsert({
        where: { patientId: patientDbId },
        create: {
          patientId: patientDbId,
          doctorId: toDbId(ctx.doctorId),
          notes: data.notes ?? null,
        },
        update: {
          notes: data.notes ?? null,
        },
      });

      for (const tooth of data.teeth) {
        if (tooth.status === "healthy" && !(tooth.notes?.trim())) {
          await tx.dentalToothRecord.deleteMany({
            where: {
              chartId: upserted.id,
              toothFdi: tooth.toothFdi,
            },
          });
          continue;
        }

        await tx.dentalToothRecord.upsert({
          where: {
            chartId_toothFdi: {
              chartId: upserted.id,
              toothFdi: tooth.toothFdi,
            },
          },
          create: {
            chartId: upserted.id,
            toothFdi: tooth.toothFdi,
            status: tooth.status,
            notes: tooth.notes?.trim() || null,
          },
          update: {
            status: tooth.status,
            notes: tooth.notes?.trim() || null,
          },
        });
      }

      return tx.dentalChart.findUnique({
        where: { id: upserted.id },
        include: { teeth: true },
      });
    });

    if (!chart) return apiServerError();

    return apiOk({ chart: serializeDentalChart(chart) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError(undefined, error);
  }
}
