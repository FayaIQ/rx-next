import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { phonesMatch } from "@/lib/patient-utils";

export async function findPatientWithSamePhone(
  doctorId: number,
  phone: string,
  excludePatientId?: number
) {
  const patients = await prisma.patient.findMany({
    where: {
      doctorId: toDbId(doctorId),
      phone: { not: null },
      ...(excludePatientId != null
        ? { id: { not: toDbId(excludePatientId) } }
        : {}),
    },
    select: { id: true, name: true, phone: true },
  });

  return (
    patients.find((row) => row.phone && phonesMatch(row.phone, phone)) ?? null
  );
}
