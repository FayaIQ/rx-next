import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { serializePatient, fetchVisitStatsMap } from "@/lib/patient-serializer";
import { serializePrescription, emptyMed } from "@/lib/prescription-service";
import { listMedicinePresets } from "@/lib/medicine-preset-service";
import { fromDbId } from "@/lib/bigint";
import { serializeDentalChart } from "@/lib/dental/serializer";
import { serializeTreatmentPlan } from "@/lib/treatment/serializer";

export async function fetchSecretaryHydration(doctorId: number) {
  const doctorDbId = toDbId(doctorId);

  const [patients, appointments, fields] = await Promise.all([
    prisma.patient.findMany({
      where: { doctorId: doctorDbId },
      include: { fieldValues: true },
    }),
    prisma.appointment.findMany({
      where: { doctorId: doctorDbId },
      orderBy: { appointmentDatetime: "desc" },
      take: 200,
    }),
    prisma.patientField.findMany({
      where: { doctorId: doctorDbId, isActive: true },
    }),
  ]);

  const visitStatsMap = await fetchVisitStatsMap(patients.map((p) => p.id));

  return {
    patients: await Promise.all(
      patients.map((patient) =>
        serializePatient(patient, visitStatsMap.get(patient.id.toString()))
      )
    ),
    appointments: appointments.map((a) => ({
      id: fromDbId(a.id),
      doctorId: fromDbId(a.doctorId),
      patientId: fromDbId(a.patientId),
      appointmentDatetime: a.appointmentDatetime.toISOString(),
      bookingDate: a.bookingDate?.toISOString() ?? null,
      notes: a.notes,
      status: a.status,
      visitStatus: a.visitStatus ?? "scheduled",
      checkedInAt: a.checkedInAt?.toISOString() ?? null,
      updatedAt: a.updatedAt?.toISOString() ?? new Date().toISOString(),
    })),
    fields: fields.map((f) => ({
      id: fromDbId(f.id),
      doctorId: fromDbId(f.doctorId),
      name: f.name,
      size: f.size,
      isActive: f.isActive,
      isPrintable: f.isPrintable,
      isPersonal: f.isPersonal,
    })),
    medicines: [],
    prescriptions: [],
    defaultMedicines: [],
    medicinePresets: [],
    dentalCharts: [],
    treatmentPlans: [],
    recipeSettings: null,
  };
}

export async function fetchSecretaryChanges(doctorId: number, since: Date) {
  const doctorDbId = toDbId(doctorId);

  const [patients, appointments, fields] = await Promise.all([
    prisma.patient.findMany({
      where: { doctorId: doctorDbId, updatedAt: { gt: since } },
      include: { fieldValues: true },
    }),
    prisma.appointment.findMany({
      where: { doctorId: doctorDbId, updatedAt: { gt: since } },
    }),
    prisma.patientField.findMany({
      where: { doctorId: doctorDbId, updatedAt: { gt: since } },
    }),
  ]);

  const visitStatsMap = await fetchVisitStatsMap(patients.map((p) => p.id));

  return {
    patients: await Promise.all(
      patients.map((patient) =>
        serializePatient(patient, visitStatsMap.get(patient.id.toString()))
      )
    ),
    appointments: appointments.map((a) => ({
      id: fromDbId(a.id),
      doctorId: fromDbId(a.doctorId),
      patientId: fromDbId(a.patientId),
      appointmentDatetime: a.appointmentDatetime.toISOString(),
      bookingDate: a.bookingDate?.toISOString() ?? null,
      notes: a.notes,
      status: a.status,
      visitStatus: a.visitStatus ?? "scheduled",
      checkedInAt: a.checkedInAt?.toISOString() ?? null,
      updatedAt: a.updatedAt?.toISOString() ?? new Date().toISOString(),
    })),
    fields: fields.map((f) => ({
      id: fromDbId(f.id),
      doctorId: fromDbId(f.doctorId),
      name: f.name,
      size: f.size,
      isActive: f.isActive,
      isPrintable: f.isPrintable,
      isPersonal: f.isPersonal,
      updatedAt: f.updatedAt?.toISOString() ?? new Date().toISOString(),
    })),
    medicines: [],
    prescriptions: [],
  };
}

export async function fetchDoctorHydration(doctorId: number) {
  const doctorDbId = toDbId(doctorId);

  const [patients, medicines, appointments, fields, recipeSettings, categories, medicinePresets, dentalCharts, treatmentPlans] =
    await Promise.all([
      prisma.patient.findMany({
        where: { doctorId: doctorDbId },
        include: {
          fieldValues: true,
        },
      }),
      prisma.medicine.findMany({ where: { doctorId: doctorDbId } }),
      prisma.appointment.findMany({
        where: { doctorId: doctorDbId },
        orderBy: { appointmentDatetime: "desc" },
        take: 200,
      }),
      prisma.patientField.findMany({ where: { doctorId: doctorDbId } }),
      prisma.recipeSettings.findFirst({ where: { doctorId: doctorDbId } }),
      prisma.defaultMedicineCategory.findMany({
        include: { default_medicines: true },
      }),
      listMedicinePresets(doctorId),
      prisma.dentalChart.findMany({
        where: { doctorId: doctorDbId },
        include: { teeth: true, patient: { select: { id: true, name: true } } },
      }),
      prisma.treatmentPlan.findMany({
        where: { doctorId: doctorDbId },
        include: { sessions: { orderBy: { sessionNumber: "asc" } } },
        orderBy: { updatedAt: "desc" },
        take: 500,
      }),
    ]);

  const prescriptions = await prisma.prescription.findMany({
    where: { doctorId: doctorDbId },
    include: { items: true, fieldValues: true },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  const visitStatsMap = await fetchVisitStatsMap(patients.map((p) => p.id));

  return {
    patients: await Promise.all(
      patients.map((patient) =>
        serializePatient(patient, visitStatsMap.get(patient.id.toString()))
      )
    ),
    medicines: medicines.map((m) => ({
      id: fromDbId(m.id),
      doctorId: fromDbId(m.doctorId),
      name: m.name,
      type: m.type || null,
      dosage: m.dosage || null,
      quantity: m.quantity || null,
      period: m.period || null,
      timeOfUse: m.timeOfUse || null,
      createdAt: m.createdAt?.toISOString() ?? null,
      updatedAt: m.updatedAt?.toISOString() ?? null,
    })),
    appointments: appointments.map((a) => ({
      id: fromDbId(a.id),
      doctorId: fromDbId(a.doctorId),
      patientId: fromDbId(a.patientId),
      appointmentDatetime: a.appointmentDatetime.toISOString(),
      bookingDate: a.bookingDate?.toISOString() ?? null,
      notes: a.notes,
      status: a.status,
      visitStatus: a.visitStatus ?? "scheduled",
      checkedInAt: a.checkedInAt?.toISOString() ?? null,
      updatedAt: a.updatedAt?.toISOString() ?? new Date().toISOString(),
    })),
    fields: fields.map((f) => ({
      id: fromDbId(f.id),
      doctorId: fromDbId(f.doctorId),
      name: f.name,
      size: f.size,
      isActive: f.isActive,
      isPrintable: f.isPrintable,
      isPersonal: f.isPersonal,
    })),
    recipeSettings: recipeSettings
      ? {
          doctorId: fromDbId(recipeSettings.doctorId),
          data: recipeSettings,
        }
      : null,
    prescriptions: prescriptions.map(serializePrescription),
    defaultMedicines: categories.flatMap((c) =>
      c.default_medicines.map((m) => ({
        id: fromDbId(m.id),
        categoryId: fromDbId(m.default_medicine_category_id),
        name: m.name,
        type: m.type ?? undefined,
        dosage: m.dosage ?? undefined,
      }))
    ),
    medicinePresets,
    dentalCharts: dentalCharts.map((c) => ({
      patientId: fromDbId(c.patientId),
      patientName: c.patient.name,
      chart: serializeDentalChart(c),
    })),
    treatmentPlans: treatmentPlans.map(serializeTreatmentPlan),
  };
}

export async function fetchDoctorChanges(doctorId: number, since: Date) {
  const doctorDbId = toDbId(doctorId);

  const [
    patients,
    medicines,
    prescriptions,
    appointments,
    fields,
    dentalCharts,
    treatmentPlans,
  ] = await Promise.all([
    prisma.patient.findMany({
      where: { doctorId: doctorDbId, updatedAt: { gt: since } },
      include: {
        fieldValues: true,
      },
    }),
    prisma.medicine.findMany({
      where: { doctorId: doctorDbId, updatedAt: { gt: since } },
    }),
    prisma.prescription.findMany({
      where: { doctorId: doctorDbId, updatedAt: { gt: since } },
      include: { items: true, fieldValues: true },
    }),
    prisma.appointment.findMany({
      where: { doctorId: doctorDbId, updatedAt: { gt: since } },
    }),
    prisma.patientField.findMany({
      where: { doctorId: doctorDbId, updatedAt: { gt: since } },
    }),
    prisma.dentalChart.findMany({
      where: { doctorId: doctorDbId, updatedAt: { gt: since } },
      include: { teeth: true, patient: { select: { id: true, name: true } } },
    }),
    prisma.treatmentPlan.findMany({
      where: { doctorId: doctorDbId, updatedAt: { gt: since } },
      include: { sessions: { orderBy: { sessionNumber: "asc" } } },
    }),
  ]);

  const visitStatsMap = await fetchVisitStatsMap(patients.map((p) => p.id));

  return {
    patients: await Promise.all(
      patients.map((patient) =>
        serializePatient(patient, visitStatsMap.get(patient.id.toString()))
      )
    ),
    medicines: medicines.map((m) => ({
      id: fromDbId(m.id),
      doctorId: fromDbId(m.doctorId),
      name: m.name,
      type: m.type || emptyMed.type,
      dosage: m.dosage || null,
      quantity: m.quantity || null,
      period: m.period || null,
      timeOfUse: m.timeOfUse || null,
      updatedAt: m.updatedAt?.toISOString() ?? new Date().toISOString(),
    })),
    prescriptions: prescriptions.map(serializePrescription),
    appointments: appointments.map((a) => ({
      id: fromDbId(a.id),
      doctorId: fromDbId(a.doctorId),
      patientId: fromDbId(a.patientId),
      appointmentDatetime: a.appointmentDatetime.toISOString(),
      bookingDate: a.bookingDate?.toISOString() ?? null,
      notes: a.notes,
      status: a.status,
      visitStatus: a.visitStatus ?? "scheduled",
      checkedInAt: a.checkedInAt?.toISOString() ?? null,
      updatedAt: a.updatedAt?.toISOString() ?? new Date().toISOString(),
    })),
    fields: fields.map((f) => ({
      id: fromDbId(f.id),
      doctorId: fromDbId(f.doctorId),
      name: f.name,
      size: f.size,
      isActive: f.isActive,
      isPrintable: f.isPrintable,
      isPersonal: f.isPersonal,
      updatedAt: f.updatedAt?.toISOString() ?? new Date().toISOString(),
    })),
    dentalCharts: dentalCharts.map((c) => ({
      patientId: fromDbId(c.patientId),
      patientName: c.patient.name,
      chart: serializeDentalChart(c),
    })),
    treatmentPlans: treatmentPlans.map(serializeTreatmentPlan),
  };
}
