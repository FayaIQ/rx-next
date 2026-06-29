import { prisma } from "@/lib/prisma";
import { toDbId, fromDbId } from "@/lib/bigint";
import { treatmentTypeLabel } from "@/lib/treatment/constants";

export async function loadPatientQueueSummary(
  doctorId: number,
  patientId: number
) {
  const doctorDbId = toDbId(doctorId);
  const patientDbId = toDbId(patientId);

  const patient = await prisma.patient.findFirst({
    where: { id: patientDbId, doctorId: doctorDbId },
    select: {
      id: true,
      name: true,
      allergies: true,
      currentMedications: true,
      diagnosis: true,
    },
  });
  if (!patient) return null;

  const [lastRx, activePlans, nextAppointment, finance] = await Promise.all([
    prisma.prescription.findFirst({
      where: { patientId: patientDbId, doctorId: doctorDbId },
      orderBy: { prescriptionDate: "desc" },
      select: {
        id: true,
        prescriptionNumber: true,
        prescriptionDate: true,
        diagnosis: true,
      },
    }),
    prisma.treatmentPlan.findMany({
      where: { patientId: patientDbId, doctorId: doctorDbId, status: "active" },
      include: {
        sessions: { orderBy: { sessionNumber: "asc" } },
      },
      take: 3,
    }),
    prisma.appointment.findFirst({
      where: {
        patientId: patientDbId,
        doctorId: doctorDbId,
        status: true,
        bookingDate: { gte: new Date(new Date().toISOString().slice(0, 10)) },
      },
      orderBy: { bookingDate: "asc" },
    }),
    prisma.financeTransaction.groupBy({
      by: ["type"],
      where: { patientId: patientDbId, doctorId: doctorDbId },
      _sum: { amount: true },
    }),
  ]);

  let balance = 0;
  for (const row of finance) {
    const amount = Number(row._sum.amount ?? 0);
    balance += row.type === "income" ? amount : -amount;
  }

  const nextSession = await prisma.treatmentSession.findFirst({
    where: {
      patientId: patientDbId,
      doctorId: doctorDbId,
      status: "planned",
      scheduledDate: { not: null },
    },
    include: { plan: { select: { toothFdi: true, treatmentType: true } } },
    orderBy: { scheduledDate: "asc" },
  });

  return {
    patient: {
      id: fromDbId(patient.id),
      name: patient.name,
      allergies: patient.allergies,
      currentMedications: patient.currentMedications,
      diagnosis: patient.diagnosis,
    },
    lastPrescription: lastRx
      ? {
          id: fromDbId(lastRx.id),
          prescriptionNumber: lastRx.prescriptionNumber,
          date: lastRx.prescriptionDate?.toISOString().slice(0, 10) ?? null,
          diagnosis: lastRx.diagnosis,
        }
      : null,
    activeTreatments: activePlans.map((p) => ({
      id: fromDbId(p.id),
      toothFdi: p.toothFdi,
      label: treatmentTypeLabel(p.treatmentType),
      completed: p.sessions.filter((s) => s.status === "completed").length,
      total: p.totalSessions ?? p.sessions.length,
    })),
    nextSession: nextSession
      ? {
          id: fromDbId(nextSession.id),
          sessionNumber: nextSession.sessionNumber,
          scheduledDate: nextSession.scheduledDate?.toISOString().slice(0, 10) ?? null,
          toothFdi: nextSession.plan.toothFdi,
          label: treatmentTypeLabel(nextSession.plan.treatmentType),
        }
      : null,
    nextAppointment: nextAppointment
      ? {
          id: fromDbId(nextAppointment.id),
          datetime: nextAppointment.appointmentDatetime.toISOString(),
          notes: nextAppointment.notes,
        }
      : null,
    financeBalance: balance,
  };
}
