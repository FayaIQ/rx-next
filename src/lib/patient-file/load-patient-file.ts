import { prisma } from "@/lib/prisma";
import { toDbId, fromDbId } from "@/lib/bigint";
import { serializePatient } from "@/lib/patient-serializer";
import { serializePrescription } from "@/lib/prescription-service";
import { serializeTreatmentPlan } from "@/lib/treatment/serializer";
import { serializePatientVisit } from "@/lib/visit/serializer";
import { serializeToothImage } from "@/lib/dental/tooth-image-serializer";
import { toothStatusLabel } from "@/lib/dental/constants";

export async function loadPatientFile(doctorId: number, patientId: number) {
  const doctorDbId = toDbId(doctorId);
  const patientDbId = toDbId(patientId);

  const patient = await prisma.patient.findFirst({
    where: { id: patientDbId, doctorId: doctorDbId },
    include: { fieldValues: true },
  });
  if (!patient) return null;

  const [
    prescriptions,
    appointments,
    dentalChart,
    treatmentPlans,
    visits,
    toothImages,
    financeRows,
  ] = await Promise.all([
    prisma.prescription.findMany({
      where: { patientId: patientDbId, doctorId: doctorDbId },
      include: { items: true, fieldValues: true },
      orderBy: { prescriptionDate: "desc" },
      take: 30,
    }),
    prisma.appointment.findMany({
      where: { patientId: patientDbId, doctorId: doctorDbId },
      orderBy: { appointmentDatetime: "desc" },
      take: 30,
    }),
    prisma.dentalChart.findUnique({
      where: { patientId: patientDbId },
      include: { teeth: true },
    }),
    prisma.treatmentPlan.findMany({
      where: { patientId: patientDbId, doctorId: doctorDbId },
      include: { sessions: { orderBy: { sessionNumber: "asc" } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.patientVisit.findMany({
      where: { patientId: patientDbId, doctorId: doctorDbId },
      orderBy: [{ visitDate: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.dentalToothImage.findMany({
      where: { patientId: patientDbId, doctorId: doctorDbId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.financeTransaction.findMany({
      where: { patientId: patientDbId, doctorId: doctorDbId },
      orderBy: { transactionDate: "desc" },
      take: 20,
    }),
  ]);

  const patientDto = await serializePatient(patient);

  const timeline = [
    ...visits.map((v) => ({
      kind: "visit" as const,
      date: v.visitDate.toISOString().slice(0, 10),
      title: v.summary ?? "زيارة",
      notes: v.notes,
      id: fromDbId(v.id),
    })),
    ...prescriptions.map((rx) => ({
      kind: "prescription" as const,
      date: rx.prescriptionDate?.toISOString().slice(0, 10) ?? "",
      title: `وصفة #${rx.prescriptionNumber ?? ""}`,
      notes: rx.diagnosis,
      id: fromDbId(rx.id),
    })),
    ...treatmentPlans.flatMap((plan) =>
      (plan.sessions ?? [])
        .filter((s) => s.status === "completed")
        .map((s) => ({
          kind: "session" as const,
          date:
            s.performedAt?.toISOString().slice(0, 10) ??
            s.scheduledDate?.toISOString().slice(0, 10) ??
            "",
          title: `جلسة علاج — سن ${plan.toothFdi}`,
          notes: s.notes,
          id: fromDbId(s.id),
        }))
    ),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return {
    patient: patientDto,
    prescriptions: prescriptions.map(serializePrescription),
    appointments: appointments.map((a) => ({
      id: fromDbId(a.id),
      appointmentDatetime: a.appointmentDatetime.toISOString(),
      bookingDate: a.bookingDate?.toISOString().slice(0, 10) ?? null,
      notes: a.notes,
      status: a.status,
      visitStatus: a.visitStatus,
    })),
    dentalChart: dentalChart
      ? {
          id: fromDbId(dentalChart.id),
          notes: dentalChart.notes,
          teeth: dentalChart.teeth.map((t) => ({
            toothFdi: t.toothFdi,
            status: t.status,
            statusLabel: toothStatusLabel(t.status),
            notes: t.notes,
          })),
        }
      : null,
    treatmentPlans: treatmentPlans.map(serializeTreatmentPlan),
    visits: visits.map(serializePatientVisit),
    toothImages: toothImages.map(serializeToothImage),
    finance: financeRows.map((f) => ({
      id: fromDbId(f.id),
      type: f.type,
      category: f.category,
      amount: Number(f.amount),
      transactionDate: f.transactionDate.toISOString().slice(0, 10),
      description: f.description,
    })),
    timeline,
  };
}
