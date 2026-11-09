import { saveSessionBillingInTransaction, savePlanBillingInTransaction } from "@/lib/finance/session-billing-service";
import { recordClinicActivity } from "@/lib/product-analytics/server";
import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { defaultSessionsForType, todayDateKey, treatmentTargetLabel, treatmentTypeLabel } from "@/lib/treatment/constants";
import { serializeTreatmentPlan } from "@/lib/treatment/serializer";
import { syncPlanSessionAppointments } from "@/lib/treatment/session-appointment";
import { parseDateKey } from "@/lib/treatment/plan-utils";
import { sessionTimeInput } from "@/lib/treatment/session-datetime";
import type { z } from "zod";
import { treatmentPlanCreateSchema } from "@/lib/validations/treatment";
import { treatmentPlanTeeth } from "@/lib/treatment/plan-teeth";

type PlanCreateInput = z.infer<typeof treatmentPlanCreateSchema>;

export async function createTreatmentPlanForPatient(
  doctorId: number,
  patientDbId: bigint,
  data: PlanCreateInput,
  options?: { clientRequestId?: string; userId?: number },
) {
  data = treatmentPlanCreateSchema.parse(data);
  const doctorDbId = toDbId(doctorId);
  const requestId = options?.clientRequestId ?? data.clientRequestId;
  if (requestId) {
    const existing = await prisma.treatmentPlan.findFirst({ where: { doctorId: doctorDbId, clientRequestId: requestId }, include: { payments: { select: { amount: true } }, sessions: { orderBy: { sessionNumber: "asc" }, include: { payments: { select: { amount: true } } } } } });
    if (existing) { await syncPlanSessionAppointments(existing.id); await recordClinicActivity(doctorId, "treatment_plan", existing.id, existing.createdAt ?? new Date()); return serializeTreatmentPlan(existing); }
  }

  const totalSessions =
    data.totalSessions ??
    data.sessions?.length ??
    defaultSessionsForType(data.treatmentType);

  const defaultTime = sessionTimeInput();
  const sessionInputs: NonNullable<PlanCreateInput["sessions"]> =
    data.sessions ??
    Array.from({ length: totalSessions }, (_, i) => ({
      sessionNumber: i + 1,
      scheduledDate: i === 0 ? todayDateKey() : null,
      notes: null,
    }));

  const toothFdis = treatmentPlanTeeth(data);
  const toothFdi = data.toothFdi ?? toothFdis[0] ?? null;
  const title =
    data.title?.trim() || (toothFdi == null
      ? `${treatmentTypeLabel(data.treatmentType)} — ${treatmentTargetLabel(null)}`
      : `علاج — ${treatmentTargetLabel(toothFdi, toothFdis)}`);

  const plan = await prisma.$transaction(async (tx) => {
    if (requestId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(${doctorDbId})`;
    if (requestId) { const existing = await tx.treatmentPlan.findFirst({ where: { doctorId: doctorDbId, clientRequestId: requestId }, include: { payments: { select: { amount: true } }, sessions: { orderBy: { sessionNumber: "asc" }, include: { payments: { select: { amount: true } } } } } }); if (existing) return existing; }
    const created = await tx.treatmentPlan.create({
      data: {
        doctorId: doctorDbId,
        clientRequestId: requestId ?? null,
        patientId: patientDbId,
        toothFdi,
        toothFdis,
        treatmentType: data.treatmentType,
        pricingMode: data.pricingMode ?? "per_session",
        title,
        totalSessions,
        notes: data.notes?.trim() || null,
        status: "active",
      },
    });

    await tx.treatmentSession.createMany({ data: sessionInputs.map(session => ({
      planId: created.id, doctorId: doctorDbId, patientId: patientDbId,
      sessionNumber: session.sessionNumber, status: "planned",
      scheduledDate: session.scheduledDate ? parseDateKey(session.scheduledDate) : null,
      scheduledTime: session.scheduledTime ?? defaultTime, notes: session.notes?.trim() || null,
    })) });

    const createdSessions = await tx.treatmentSession.findMany({ where: { planId: created.id } });
    if (data.billing) await savePlanBillingInTransaction(tx, doctorDbId, toDbId(options?.userId ?? doctorId), created.id, data.billing);
    for (const input of sessionInputs) {
      if (!input.billing) continue;
      const session = createdSessions.find(s => s.sessionNumber === input.sessionNumber)!;
      await saveSessionBillingInTransaction(tx, doctorDbId, toDbId(options?.userId ?? doctorId), session.id, input.billing);
    }

    return tx.treatmentPlan.findUnique({
      where: { id: created.id },
      include: { payments: { select: { amount: true } }, sessions: { orderBy: { sessionNumber: "asc" }, include: { payments: { select: { amount: true } } } } },
    });
  });

  if (!plan) throw new Error("فشل إنشاء خطة العلاج");

  await syncPlanSessionAppointments(plan.id);

  const refreshed = await prisma.treatmentPlan.findUnique({
    where: { id: plan.id },
    include: { payments: { select: { amount: true } }, sessions: { orderBy: { sessionNumber: "asc" }, include: { payments: { select: { amount: true } } } } },
  });

  await recordClinicActivity(doctorId, "treatment_plan", plan.id);
  return serializeTreatmentPlan(refreshed ?? plan);
}
