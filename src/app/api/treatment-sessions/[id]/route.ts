import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import {
  assertSessionAccess,
  parseDateKey,
  refreshPlanStatus,
} from "@/lib/treatment/plan-utils";
import {
  recordSessionVisit,
  syncSessionAppointment,
} from "@/lib/treatment/session-appointment";
import { serializeTreatmentSession } from "@/lib/treatment/serializer";
import { treatmentSessionUpdateSchema } from "@/lib/validations/treatment";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const sessionDbId = toDbId(id);

    const existing = await assertSessionAccess(
      sessionDbId,
      toDbId(ctx.doctorId)
    );
    if (!existing) return apiNotFound("الجلسة غير موجودة");

    const body = await request.json();
    const data = treatmentSessionUpdateSchema.parse(body);

    const performedAt =
      data.status === "completed" && !data.performedAt
        ? new Date()
        : data.performedAt
          ? new Date(data.performedAt)
          : data.performedAt === null
            ? null
            : undefined;

    const session = await prisma.treatmentSession.update({
      where: { id: sessionDbId },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.scheduledDate !== undefined
          ? {
              scheduledDate: data.scheduledDate
                ? parseDateKey(data.scheduledDate)
                : null,
            }
          : {}),
        ...(performedAt !== undefined ? { performedAt } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
      },
    });

    await refreshPlanStatus(session.planId);

    if (data.scheduledDate !== undefined) {
      await syncSessionAppointment(session.id);
    }

    if (data.status === "completed") {
      await recordSessionVisit(session.id);
      await syncSessionAppointment(session.id);
    }

    const refreshed = await prisma.treatmentSession.findUnique({
      where: { id: sessionDbId },
    });

    return apiOk({
      session: serializeTreatmentSession(refreshed ?? session),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError(undefined, error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { id } = await params;
  const sessionDbId = toDbId(id);

  const existing = await assertSessionAccess(
    sessionDbId,
    toDbId(ctx.doctorId)
  );
  if (!existing) return apiNotFound("الجلسة غير موجودة");

  const planId = existing.planId;

  await prisma.treatmentSession.delete({ where: { id: sessionDbId } });
  await refreshPlanStatus(planId);

  return apiOk({ success: true });
}
