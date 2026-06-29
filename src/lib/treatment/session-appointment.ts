import { prisma } from "@/lib/prisma";
import { fromDbId } from "@/lib/bigint";
import { treatmentTypeLabel } from "@/lib/treatment/constants";
import { parseDateKey } from "@/lib/treatment/plan-utils";

function sessionAppointmentDatetime(scheduledDate: Date): Date {
  const key = scheduledDate.toISOString().slice(0, 10);
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 10, 0, 0));
}

export async function syncSessionAppointment(sessionId: bigint) {
  const session = await prisma.treatmentSession.findUnique({
    where: { id: sessionId },
    include: { plan: true, patient: { select: { name: true } } },
  });
  if (!session) return null;

  if (!session.scheduledDate || session.status === "cancelled") {
    if (session.appointmentId) {
      await prisma.appointment.update({
        where: { id: session.appointmentId },
        data: { status: false },
      });
    }
    return session;
  }

  const label = treatmentTypeLabel(session.plan.treatmentType);
  const notes = `${label} — سن ${session.plan.toothFdi} · جلسة ${session.sessionNumber}${session.plan.totalSessions ? `/${session.plan.totalSessions}` : ""}`;

  const appointmentDatetime = sessionAppointmentDatetime(session.scheduledDate);

  if (session.appointmentId) {
    await prisma.appointment.update({
      where: { id: session.appointmentId },
      data: {
        appointmentDatetime,
        bookingDate: session.scheduledDate,
        notes,
        status: session.status === "completed" ? false : true,
      },
    });
    return session;
  }

  const appointment = await prisma.appointment.create({
    data: {
      doctorId: session.doctorId,
      patientId: session.patientId,
      appointmentDatetime,
      bookingDate: session.scheduledDate,
      notes,
      status: true,
      visitStatus: "scheduled",
    },
  });

  return prisma.treatmentSession.update({
    where: { id: session.id },
    data: { appointmentId: appointment.id },
  });
}

export async function recordSessionVisit(sessionId: bigint) {
  const session = await prisma.treatmentSession.findUnique({
    where: { id: sessionId },
    include: { plan: true },
  });
  if (!session || session.status !== "completed") return;

  const existing = await prisma.patientVisit.findFirst({
    where: { treatmentSessionId: session.id },
  });
  if (existing) {
    await prisma.patientVisit.update({
      where: { id: existing.id },
      data: {
        notes: session.notes,
        summary: `${treatmentTypeLabel(session.plan.treatmentType)} — جلسة ${session.sessionNumber}`,
        visitDate: session.performedAt ?? new Date(),
      },
    });
    return;
  }

  await prisma.patientVisit.create({
    data: {
      doctorId: session.doctorId,
      patientId: session.patientId,
      visitDate: session.performedAt ?? new Date(),
      summary: `${treatmentTypeLabel(session.plan.treatmentType)} — جلسة ${session.sessionNumber}`,
      notes: session.notes,
      appointmentId: session.appointmentId,
      treatmentSessionId: session.id,
    },
  });
}

export async function syncPlanSessionAppointments(planId: bigint) {
  const sessions = await prisma.treatmentSession.findMany({
    where: { planId },
    select: { id: true },
  });
  for (const s of sessions) {
    await syncSessionAppointment(s.id);
  }
}

export function formatAppointmentId(id: bigint | null | undefined) {
  return id ? fromDbId(id) : null;
}
