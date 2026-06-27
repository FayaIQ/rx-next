import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import {
  type VisitStatus,
  DOCTOR_VISIT_STATUS_NEXT,
  SECRETARY_VISIT_STATUS_NEXT,
} from "@/lib/visit-queue/constants";

const patientSelect = {
  id: true,
  name: true,
  phone: true,
  gender: true,
  birthdate: true,
} as const;

function todayDateOnly() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function updateAppointmentVisitStatus(
  doctorId: number,
  appointmentId: number,
  visitStatus: VisitStatus
) {
  const existing = await prisma.appointment.findFirst({
    where: { id: toDbId(appointmentId), doctorId: toDbId(doctorId) },
  });
  if (!existing) return null;

  const now = new Date();
  const data: {
    visitStatus: VisitStatus;
    checkedInAt?: Date;
    updatedAt: Date;
  } = {
    visitStatus,
    updatedAt: now,
  };

  if (
    visitStatus !== "scheduled" &&
    visitStatus !== "done" &&
    !existing.checkedInAt
  ) {
    data.checkedInAt = now;
  }

  if (visitStatus === "with_doctor") {
    await prisma.appointment.updateMany({
      where: {
        doctorId: toDbId(doctorId),
        bookingDate: existing.bookingDate ?? todayDateOnly(),
        visitStatus: "with_doctor",
        id: { not: existing.id },
      },
      data: {
        visitStatus: "done",
        updatedAt: now,
      },
    });
  }

  return prisma.appointment.update({
    where: { id: existing.id },
    data,
    include: { patient: { select: patientSelect } },
  });
}

export async function advanceAppointmentVisitStatus(
  doctorId: number,
  appointmentId: number,
  userType: "doctor" | "secretary"
) {
  const existing = await prisma.appointment.findFirst({
    where: { id: toDbId(appointmentId), doctorId: toDbId(doctorId) },
  });
  if (!existing) return null;

  const nextMap =
    userType === "secretary"
      ? SECRETARY_VISIT_STATUS_NEXT
      : DOCTOR_VISIT_STATUS_NEXT;

  const next = nextMap[existing.visitStatus as VisitStatus];
  if (!next) return null;

  return updateAppointmentVisitStatus(doctorId, appointmentId, next);
}

export async function callNextPatient(doctorId: number, date?: string) {
  const bookingDate = date ? new Date(date) : todayDateOnly();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.appointment.updateMany({
      where: {
        doctorId: toDbId(doctorId),
        bookingDate,
        visitStatus: "with_doctor",
      },
      data: {
        visitStatus: "done",
        updatedAt: now,
      },
    });

    const nextWaiting = await tx.appointment.findFirst({
      where: {
        doctorId: toDbId(doctorId),
        bookingDate,
        status: true,
        visitStatus: "waiting",
      },
      orderBy: [{ checkedInAt: "asc" }, { appointmentDatetime: "asc" }],
      include: { patient: { select: patientSelect } },
    });

    if (!nextWaiting) return { appointment: null, previousDone: true };

    const appointment = await tx.appointment.update({
      where: { id: nextWaiting.id },
      data: {
        visitStatus: "with_doctor",
        checkedInAt: nextWaiting.checkedInAt ?? now,
        updatedAt: now,
      },
      include: { patient: { select: patientSelect } },
    });

    return { appointment, previousDone: true };
  });
}

export async function listTodayQueue(doctorId: number, date?: string) {
  const bookingDate = date ? new Date(date) : todayDateOnly();

  return prisma.appointment.findMany({
    where: {
      doctorId: toDbId(doctorId),
      bookingDate,
      status: true,
    },
    include: { patient: { select: patientSelect } },
    orderBy: [{ appointmentDatetime: "asc" }],
  });
}
