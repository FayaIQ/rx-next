import { recordClinicActivity } from "@/lib/product-analytics/server";
import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { defaultSessionsForType, todayDateKey, treatmentTargetLabel, treatmentTypeLabel } from "@/lib/treatment/constants";
import { serializeTreatmentPlan } from "@/lib/treatment/serializer";
import { syncPlanSessionAppointments } from "@/lib/treatment/session-appointment";
import { parseDateKey } from "@/lib/treatment/plan-utils";
import { sessionTimeInput } from "@/lib/treatment/session-datetime";
import type { z } from "zod";
import type { treatmentPlanCreateSchema } from "@/lib/validations/treatment";

type PlanCreateInput = z.infer<typeof treatmentPlanCreateSchema>;

export async function createTreatmentPlanForPatient(
  doctorId: number,
  patientDbId: bigint,
  data: PlanCreateInput,
  options?: { clientRequestId?: string },
) {
  const doctorDbId = toDbId(doctorId);
  const requestId = options?.clientRequestId ?? data.clientRequestId;
  if (requestId) {
    const existing = await prisma.treatmentPlan.findFirst({ where: { doctorId: doctorDbId, clientRequestId: requestId }, include: { sessions: { orderBy: { sessionNumber: "asc" } } } });
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

  const title =
    data.title?.trim() || (data.toothFdi == null
      ? `${treatmentTypeLabel(data.treatmentType)} — ${treatmentTargetLabel(null)}`
      : `علاج — سن ${data.toothFdi}`);

  const plan = await prisma.$transaction(async (tx) => {
    if (requestId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(${doctorDbId})`;
    if (requestId) { const existing = await tx.treatmentPlan.findFirst({ where: { doctorId: doctorDbId, clientRequestId: requestId }, include: { sessions: { orderBy: { sessionNumber: "asc" } } } }); if (existing) return existing; }
    const created = await tx.treatmentPlan.create({
      data: {
        doctorId: doctorDbId,
        clientRequestId: requestId ?? null,
        patientId: patientDbId,
        toothFdi: data.toothFdi ?? null,
        treatmentType: data.treatmentType,
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

    return tx.treatmentPlan.findUnique({
      where: { id: created.id },
      include: { sessions: { orderBy: { sessionNumber: "asc" } } },
    });
  });

  if (!plan) throw new Error("فشل إنشاء خطة العلاج");

  await syncPlanSessionAppointments(plan.id);

  const refreshed = await prisma.treatmentPlan.findUnique({
    where: { id: plan.id },
    include: { sessions: { orderBy: { sessionNumber: "asc" } } },
  });

  await recordClinicActivity(doctorId, "treatment_plan", plan.id);
  return serializeTreatmentPlan(refreshed ?? plan);
}
