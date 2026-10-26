import { prisma } from "@/lib/prisma";
import { formatAge, countVisitsFromDates, prescriptionDayKey } from "@/lib/patient-utils";
import { fromDbId, toDbId } from "@/lib/bigint";
import { serializePatientFieldValues } from "@/lib/patient-field-value-service";

export type PatientVisitStats = {
  visitCount: number;
  lastVisit: string | null;
};

export function buildVisitStatsMap(
  rows: Array<{ patientId: bigint; prescriptionDate: Date }>
): Map<string, PatientVisitStats> {
  const grouped = new Map<string, { dates: Set<string>; lastVisit: string | null }>();

  for (const row of rows) {
    const key = row.patientId.toString();
    if (!grouped.has(key)) {
      grouped.set(key, {
        dates: new Set(),
        lastVisit: row.prescriptionDate.toISOString(),
      });
    }
    const entry = grouped.get(key)!;
    entry.dates.add(prescriptionDayKey(row.prescriptionDate));
    if (
      !entry.lastVisit ||
      row.prescriptionDate.toISOString() > entry.lastVisit
    ) {
      entry.lastVisit = row.prescriptionDate.toISOString();
    }
  }

  const result = new Map<string, PatientVisitStats>();
  for (const [key, entry] of grouped) {
    result.set(key, {
      visitCount: entry.dates.size,
      lastVisit: entry.lastVisit,
    });
  }
  return result;
}

export async function fetchVisitStatsMap(
  patientIds: bigint[]
): Promise<Map<string, PatientVisitStats>> {
  if (patientIds.length === 0) return new Map();

  const rows = await prisma.prescription.findMany({
    where: { patientId: { in: patientIds } },
    select: { patientId: true, prescriptionDate: true },
    orderBy: { prescriptionDate: "desc" },
  });

  return buildVisitStatsMap(
    rows.filter(
      (row): row is { patientId: bigint; prescriptionDate: Date } =>
        row.prescriptionDate != null
    )
  );
}

export async function getPatientVisitStats(
  patientDbId: bigint | number
): Promise<PatientVisitStats> {
  const id = typeof patientDbId === "bigint" ? patientDbId : toDbId(patientDbId);
  const prescriptions = await prisma.prescription.findMany({
    where: { patientId: id },
    select: { prescriptionDate: true },
    orderBy: { prescriptionDate: "desc" },
  });

  return {
    visitCount: countVisitsFromDates(
      prescriptions.map((p) => p.prescriptionDate)
    ),
    lastVisit: prescriptions[0]?.prescriptionDate?.toISOString() ?? null,
  };
}

export function serializePatientLight(
  patient: {
    id: bigint | number;
    name: string;
    gender: string;
    birthdate: Date | null;
    diagnosis: string | null;
    phone: string | null;
    allergies?: string | null;
    currentMedications?: string | null;
    portalInstructions?: string | null;
    doctorId: bigint | number;
    createdAt: Date | null;
    updatedAt: Date | null;
  },
  fieldValues?: Array<{
    patientFieldId: bigint | number;
    value: string | null;
  }>,
  visitStats?: PatientVisitStats
) {
  return {
    id: fromDbId(patient.id),
    name: patient.name,
    gender: patient.gender as "male" | "female",
    birthdate: patient.birthdate?.toISOString() ?? null,
    diagnosis: patient.diagnosis,
    phone: patient.phone,
    allergies: (patient as { allergies?: string | null }).allergies ?? null,
    currentMedications:
      (patient as { currentMedications?: string | null }).currentMedications ??
      null,
    portalInstructions:
      (patient as { portalInstructions?: string | null }).portalInstructions ??
      null,
    doctorId: fromDbId(patient.doctorId),
    age: formatAge(patient.birthdate),
    visitCount: visitStats?.visitCount ?? 0,
    lastVisit: visitStats?.lastVisit ?? null,
    createdAt: patient.createdAt?.toISOString() ?? null,
    updatedAt: patient.updatedAt?.toISOString() ?? null,
    fieldValues: fieldValues ? serializePatientFieldValues(fieldValues) : [],
  };
}

export async function serializePatient(
  patient: {
    id: bigint | number;
    name: string;
    gender: string;
    birthdate: Date | null;
    diagnosis: string | null;
    phone: string | null;
    allergies?: string | null;
    currentMedications?: string | null;
    portalInstructions?: string | null;
    doctorId: bigint | number;
    createdAt: Date | null;
    updatedAt: Date | null;
    fieldValues?: Array<{
      patientFieldId: bigint | number;
      value: string | null;
    }>;
  },
  visitStats?: PatientVisitStats
) {
  const patientDbId =
    typeof patient.id === "bigint" ? patient.id : toDbId(patient.id);
  const stats = visitStats ?? (await getPatientVisitStats(patientDbId));

  return {
    id: fromDbId(patient.id),
    name: patient.name,
    gender: patient.gender as "male" | "female",
    birthdate: patient.birthdate?.toISOString() ?? null,
    diagnosis: patient.diagnosis,
    phone: patient.phone,
    allergies: (patient as { allergies?: string | null }).allergies ?? null,
    currentMedications:
      (patient as { currentMedications?: string | null }).currentMedications ??
      null,
    portalInstructions:
      (patient as { portalInstructions?: string | null }).portalInstructions ??
      null,
    doctorId: fromDbId(patient.doctorId),
    age: formatAge(patient.birthdate),
    visitCount: stats.visitCount,
    lastVisit: stats.lastVisit,
    createdAt: patient.createdAt?.toISOString() ?? null,
    updatedAt: patient.updatedAt?.toISOString() ?? null,
    fieldValues: patient.fieldValues
      ? serializePatientFieldValues(patient.fieldValues)
      : [],
  };
}
