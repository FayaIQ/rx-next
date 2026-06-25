import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { serializePatient, fetchVisitStatsMap } from "@/lib/patient-serializer";
import { serializePrescription, emptyMed } from "@/lib/prescription-service";
import { listMedicinePresets } from "@/lib/medicine-preset-service";
import { fromDbId } from "@/lib/bigint";

export async function fetchDoctorHydration(doctorId: number) {
  const doctorDbId = toDbId(doctorId);

  const [patients, medicines, appointments, fields, recipeSettings, categories, medicinePresets] =
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
  };
}

export async function fetchDoctorChanges(doctorId: number, since: Date) {
  const doctorDbId = toDbId(doctorId);

  const [patients, medicines, prescriptions, appointments, fields] =
    await Promise.all([
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
  };
}
