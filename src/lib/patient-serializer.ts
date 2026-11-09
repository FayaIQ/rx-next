import { prisma } from "@/lib/prisma";
import { formatAge, prescriptionDayKey } from "@/lib/patient-utils";
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

  const [rows, visits] = await Promise.all([
    prisma.prescription.findMany({ where: { patientId: { in: patientIds } }, select: { patientId: true, prescriptionDate: true } }),
    prisma.patientVisit.findMany({ where: { patientId: { in: patientIds } }, select: { patientId: true, visitDate: true } }),
  ]);
  const result = buildVisitStatsMap(rows.filter((r): r is { patientId: bigint; prescriptionDate: Date } => r.prescriptionDate != null));
  const episodes = new Map<string, { count: number; dates: Set<string>; last: string }>();
  for (const visit of visits) {
    const key = visit.patientId.toString(), date = visit.visitDate.toISOString();
    const entry = episodes.get(key) ?? { count: 0, dates: new Set<string>(), last: date };
    entry.count++; entry.dates.add(prescriptionDayKey(visit.visitDate));
    if (date > entry.last) entry.last = date;
    episodes.set(key, entry);
  }
  for (const [key, entry] of episodes) {
    const additional = new Set(rows.filter(r => r.patientId.toString() === key && r.prescriptionDate && !entry.dates.has(prescriptionDayKey(r.prescriptionDate))).map(r => prescriptionDayKey(r.prescriptionDate!)));
    result.set(key, { visitCount: entry.count + additional.size, lastVisit: [entry.last, result.get(key)?.lastVisit ?? ""].sort().at(-1) ?? null });
  }
  return result;
}

export async function getPatientVisitStats(patientDbId: bigint | number): Promise<PatientVisitStats> {
  const id = typeof patientDbId === "bigint" ? patientDbId : toDbId(patientDbId);
  return (await fetchVisitStatsMap([id])).get(id.toString()) ?? { visitCount: 0, lastVisit: null };
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
    gender: patient.gender as "male" | "female" | "unknown",
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
    gender: patient.gender as "male" | "female" | "unknown",
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
