import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { defaultSessionsForType, todayDateKey } from "@/lib/treatment/constants";
import { serializeTreatmentPlan } from "@/lib/treatment/serializer";
import { syncPlanSessionAppointments } from "@/lib/treatment/session-appointment";
import { parseDateKey } from "@/lib/treatment/plan-utils";
import type { z } from "zod";
import type { treatmentPlanCreateSchema } from "@/lib/validations/treatment";

type PlanCreateInput = z.infer<typeof treatmentPlanCreateSchema>;

export async function createTreatmentPlanForPatient(
  doctorId: number,
  patientDbId: bigint,
  data: PlanCreateInput
) {
  const doctorDbId = toDbId(doctorId);

  const totalSessions =
    data.totalSessions ??
    data.sessions?.length ??
    defaultSessionsForType(data.treatmentType);

  const sessionInputs =
    data.sessions ??
    Array.from({ length: totalSessions }, (_, i) => ({
      sessionNumber: i + 1,
      scheduledDate: i === 0 ? todayDateKey() : null,
      notes: null,
    }));

  const title =
    data.title?.trim() || `علاج — سن ${data.toothFdi}`;

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.treatmentPlan.create({
      data: {
        doctorId: doctorDbId,
        patientId: patientDbId,
        toothFdi: data.toothFdi,
        treatmentType: data.treatmentType,
        title,
        totalSessions,
        notes: data.notes?.trim() || null,
        status: "active",
      },
    });

    for (const session of sessionInputs) {
      await tx.treatmentSession.create({
        data: {
          planId: created.id,
          doctorId: doctorDbId,
          patientId: patientDbId,
          sessionNumber: session.sessionNumber,
          status: "planned",
          scheduledDate: session.scheduledDate
            ? parseDateKey(session.scheduledDate)
            : null,
          notes: session.notes?.trim() || null,
        },
      });
    }

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

  return serializeTreatmentPlan(refreshed ?? plan);
}
