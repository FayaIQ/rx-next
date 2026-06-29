import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { toDbId, fromDbId } from "@/lib/bigint";
import { treatmentTypeLabel } from "@/lib/treatment/constants";

export function generatePortalToken(): string {
  return randomBytes(24).toString("hex");
}

export async function ensurePatientPortalToken(patientId: number, doctorId: number) {
  const patient = await prisma.patient.findFirst({
    where: { id: toDbId(patientId), doctorId: toDbId(doctorId) },
    select: { portalToken: true },
  });
  if (!patient) return null;
  if (patient.portalToken) return patient.portalToken;

  const token = generatePortalToken();
  await prisma.patient.update({
    where: { id: toDbId(patientId) },
    data: { portalToken: token },
  });
  return token;
}

export async function loadPatientPortalByToken(token: string) {
  const patient = await prisma.patient.findFirst({
    where: { portalToken: token },
    include: {
      doctor: { select: { name: true, phoneNumber: true } },
    },
  });
  if (!patient) return null;

  const patientDbId = patient.id;
  const doctorDbId = patient.doctorId;
  const today = new Date(new Date().toISOString().slice(0, 10));

  const [appointments, sessions] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        patientId: patientDbId,
        doctorId: doctorDbId,
        status: true,
        bookingDate: { gte: today },
      },
      orderBy: { bookingDate: "asc" },
      take: 8,
    }),
    prisma.treatmentSession.findMany({
      where: {
        patientId: patientDbId,
        doctorId: doctorDbId,
        status: "planned",
        scheduledDate: { gte: today },
      },
      include: { plan: { select: { toothFdi: true, treatmentType: true } } },
      orderBy: { scheduledDate: "asc" },
      take: 8,
    }),
  ]);

  return {
    patientName: patient.name,
    clinicName: patient.doctor.name,
    clinicPhone: patient.doctor.phoneNumber,
    instructions: patient.portalInstructions,
    appointments: appointments.map((a) => ({
      id: fromDbId(a.id),
      date: a.bookingDate?.toISOString().slice(0, 10) ?? null,
      time: a.appointmentDatetime.toISOString(),
      notes: a.notes,
    })),
    treatmentSessions: sessions.map((s) => ({
      id: fromDbId(s.id),
      sessionNumber: s.sessionNumber,
      date: s.scheduledDate?.toISOString().slice(0, 10) ?? null,
      toothFdi: s.plan.toothFdi,
      label: treatmentTypeLabel(s.plan.treatmentType),
    })),
  };
}
