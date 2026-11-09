import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError, apiNotFound, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { assertPlanAccess, parseDateKey } from "@/lib/treatment/plan-utils";
import { serializeTreatmentPlan, serializeTreatmentSession } from "@/lib/treatment/serializer";
import {
  treatmentPlanUpdateSchema,
  treatmentSessionCreateSchema,
} from "@/lib/validations/treatment";
import { syncSessionAppointment } from "@/lib/treatment/session-appointment";
import { sessionTimeInput } from "@/lib/treatment/session-datetime";
import { z } from "zod";
import { BillingError, deleteUnbilledPlan, saveSessionBillingInTransaction } from "@/lib/finance/session-billing-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { id } = await params;
  const plan = await assertPlanAccess(toDbId(id), toDbId(ctx.doctorId));
  if (!plan) return apiNotFound("خطة العلاج غير موجودة");

  return apiOk({ plan: serializeTreatmentPlan(plan) });
}

export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const planDbId = toDbId(id);

    const existing = await assertPlanAccess(planDbId, toDbId(ctx.doctorId));
    if (!existing) return apiNotFound("خطة العلاج غير موجودة");

    const body = await request.json();
    const data = treatmentPlanUpdateSchema.parse(body);

    const plan = await prisma.treatmentPlan.update({
      where: { id: planDbId },
      data: {
        ...(data.title !== undefined ? { title: data.title?.trim() || null } : {}),
        ...(data.totalSessions !== undefined
          ? { totalSessions: data.totalSessions }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
      },
      include: { payments: { select: { amount: true } }, sessions: { orderBy: { sessionNumber: "asc" }, include: { payments: { select: { amount: true } } } } },
    });

    return apiOk({ plan: serializeTreatmentPlan(plan) });
  } catch (error) {
    if (error instanceof BillingError) return apiError(error.message);
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
  const planDbId = toDbId(id);

  const existing = await assertPlanAccess(planDbId, toDbId(ctx.doctorId));
  if (!existing) return apiNotFound("خطة العلاج غير موجودة");

  try {
    await deleteUnbilledPlan(toDbId(ctx.doctorId), planDbId);
  } catch (error) {
    if (error instanceof BillingError) return apiError(error.message);
    return apiServerError(undefined, error);
  }

  return apiOk({ success: true });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const { id } = await params;
    const planDbId = toDbId(id);

    const existing = await assertPlanAccess(planDbId, toDbId(ctx.doctorId));
    if (!existing) return apiNotFound("خطة العلاج غير موجودة");

    const body = await request.json();
    const data = treatmentSessionCreateSchema.parse(body);

    if (existing.pricingMode === "plan" && data.billing) return apiError("سعر الخطة يشمل الجلسة الجديدة؛ سجل الدفعات من حساب الخطة");

    const maxNumber = existing.sessions.reduce(
      (max, s) => Math.max(max, s.sessionNumber),
      0
    );
    const sessionNumber = data.sessionNumber ?? maxNumber + 1;

    const session = await prisma.$transaction(async tx => {
      const created = await tx.treatmentSession.create({
      data: {
        planId: planDbId,
        doctorId: toDbId(ctx.doctorId),
        patientId: existing.patientId,
        sessionNumber,
        status: "planned",
        scheduledDate: data.scheduledDate
          ? parseDateKey(data.scheduledDate)
          : null,
        scheduledTime: data.scheduledTime ?? sessionTimeInput(),
        notes: data.notes?.trim() || null,
      },
    });
      if (data.billing) await saveSessionBillingInTransaction(tx, toDbId(ctx.doctorId), toDbId(ctx.userId), created.id, data.billing);
      return created;
    });

    if (session.scheduledDate) {
      await syncSessionAppointment(session.id);
    }

    const refreshed = await prisma.treatmentSession.findUnique({
      where: { id: session.id },
      include: { payments: { select: { amount: true } }, plan: { include: { payments: { select: { amount: true } } } } },
    });

    return apiOk({
      session: serializeTreatmentSession(refreshed ?? session),
    });
  } catch (error) {
    if (error instanceof BillingError) return apiError(error.message);
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError(undefined, error);
  }
}
