import { prisma } from "@/lib/prisma";
import { formatAge } from "@/lib/patient-utils";
import { fromDbId, toDbId } from "@/lib/bigint";

export function serializePatientLight(patient: {
  id: bigint | number;
  name: string;
  gender: string;
  birthdate: Date | null;
  diagnosis: string | null;
  phone: string | null;
  doctorId: bigint | number;
  createdAt: Date | null;
  updatedAt: Date | null;
}) {
  return {
    id: fromDbId(patient.id),
    name: patient.name,
    gender: patient.gender as "male" | "female",
    birthdate: patient.birthdate?.toISOString() ?? null,
    diagnosis: patient.diagnosis,
    phone: patient.phone,
    doctorId: fromDbId(patient.doctorId),
    age: formatAge(patient.birthdate),
    visitCount: 0,
    lastVisit: null,
    createdAt: patient.createdAt?.toISOString() ?? null,
    updatedAt: patient.updatedAt?.toISOString() ?? null,
  };
}

export async function serializePatient(patient: {
  id: bigint | number;
  name: string;
  gender: string;
  birthdate: Date | null;
  diagnosis: string | null;
  phone: string | null;
  doctorId: bigint | number;
  createdAt: Date | null;
  updatedAt: Date | null;
  _count?: { prescriptions: number };
  prescriptions?: { prescriptionDate: Date | null }[];
}) {
  const patientDbId = typeof patient.id === "bigint" ? patient.id : toDbId(patient.id);

  const visitCount =
    patient._count?.prescriptions ??
    (await prisma.prescription.count({
      where: { patientId: patientDbId },
    }));

  const lastPrescription =
    patient.prescriptions?.[0] ??
    (await prisma.prescription.findFirst({
      where: { patientId: patientDbId },
      orderBy: { prescriptionDate: "desc" },
      select: { prescriptionDate: true },
    }));

  return {
    id: fromDbId(patient.id),
    name: patient.name,
    gender: patient.gender as "male" | "female",
    birthdate: patient.birthdate?.toISOString() ?? null,
    diagnosis: patient.diagnosis,
    phone: patient.phone,
    doctorId: fromDbId(patient.doctorId),
    age: formatAge(patient.birthdate),
    visitCount,
    lastVisit: lastPrescription?.prescriptionDate?.toISOString() ?? null,
    createdAt: patient.createdAt?.toISOString() ?? null,
    updatedAt: patient.updatedAt?.toISOString() ?? null,
  };
}
