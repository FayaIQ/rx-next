import { recordClinicActivity } from "@/lib/product-analytics/server";
import { prisma } from "@/lib/prisma";
import { fromDbId } from "@/lib/bigint";
import { treatmentTypeLabel } from "@/lib/treatment/constants";
import { sessionAppointmentDatetime, sessionTimeInput, sessionVisitDate } from "@/lib/treatment/session-datetime";

export async function syncSessionAppointment(sessionId: bigint) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM treatment_sessions WHERE id = ${sessionId} FOR UPDATE`;
  const session = await tx.treatmentSession.findUnique({
    where: { id: sessionId },
    include: { plan: true, appointment: true, patient: { select: { name: true } } },
  });
  if (!session) return null;

  if (!session.scheduledDate || session.status === "cancelled") {
    if (session.appointmentId) {
      await tx.appointment.update({
        where: { id: session.appointmentId },
        data: { status: false },
      });
    }
    return session;
  }

  const label = treatmentTypeLabel(session.plan.treatmentType);
  const notes = `${label} — سن ${session.plan.toothFdi} · جلسة ${session.sessionNumber}${session.plan.totalSessions ? `/${session.plan.totalSessions}` : ""}`;

  // Preserve existing appointments when upgrading sessions without a saved time.
  const scheduledTime = session.scheduledTime ?? sessionTimeInput(session.appointment?.appointmentDatetime ?? new Date());
  const appointmentDatetime = sessionAppointmentDatetime(session.scheduledDate, scheduledTime);
  if (!session.scheduledTime) {
    await tx.treatmentSession.update({ where: { id: session.id }, data: { scheduledTime } });
  }

  if (session.appointmentId) {
    await tx.appointment.update({
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

  const appointment = await tx.appointment.create({
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

  return tx.treatmentSession.update({
    where: { id: session.id },
    data: { appointmentId: appointment.id },
  });
  });
}

export async function recordSessionVisit(sessionId: bigint) {
  const session = await prisma.treatmentSession.findUnique({
    where: { id: sessionId },
    include: { plan: true },
  });
  if (!session || session.status !== "completed") return;
  await recordClinicActivity(Number(session.doctorId), "treatment_session", session.id);

  const details = {
    notes: session.notes,
    summary: `${treatmentTypeLabel(session.plan.treatmentType)} — جلسة ${session.sessionNumber}`,
    visitDate: sessionVisitDate(session.performedAt ?? new Date()),
  };
  await prisma.patientVisit.upsert({
    where: { treatmentSessionId: session.id }, update: details,
    create: { ...details, doctorId: session.doctorId, patientId: session.patientId, appointmentId: session.appointmentId, treatmentSessionId: session.id },
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
