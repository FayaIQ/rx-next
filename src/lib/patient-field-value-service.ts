import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fromDbId, toDbId } from "@/lib/bigint";

export type PatientFieldValueInput = {
  patientFieldId: number;
  value: string;
};

export function serializePatientFieldValues(
  values: Array<{
    patientFieldId: bigint | number;
    value: string | null;
  }>
): PatientFieldValueInput[] {
  return values
    .filter((fv) => (fv.value ?? "").trim())
    .map((fv) => ({
      patientFieldId: fromDbId(fv.patientFieldId),
      value: fv.value!.trim(),
    }));
}

export async function getPersonalFieldIdsForDoctor(
  doctorId: number,
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<Set<number>> {
  const fields = await tx.patientField.findMany({
    where: {
      doctorId: toDbId(doctorId),
      isActive: true,
      isPersonal: true,
    },
    select: { id: true },
  });
  return new Set(fields.map((f) => fromDbId(f.id)));
}

export async function getRecipeFieldIdsForDoctor(
  doctorId: number,
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<Set<number>> {
  const fields = await tx.patientField.findMany({
    where: {
      doctorId: toDbId(doctorId),
      isActive: true,
      isPersonal: false,
    },
    select: { id: true },
  });
  return new Set(fields.map((f) => fromDbId(f.id)));
}

export function filterFieldValuesByIds(
  fieldValues: PatientFieldValueInput[],
  allowedIds: Set<number>
): PatientFieldValueInput[] {
  return fieldValues.filter(
    (fv) => allowedIds.has(fv.patientFieldId) && fv.value.trim()
  );
}

export async function upsertPatientFieldValues(
  patientId: bigint,
  doctorId: number,
  fieldValues: PatientFieldValueInput[] | undefined,
  tx: Prisma.TransactionClient
) {
  if (!fieldValues?.length) return;

  const allowedIds = await getPersonalFieldIdsForDoctor(doctorId, tx);
  const valid = filterFieldValuesByIds(fieldValues, allowedIds);
  if (valid.length === 0) return;

  for (const fv of valid) {
    await tx.patientFieldValue.upsert({
      where: {
        patientId_patientFieldId: {
          patientId,
          patientFieldId: toDbId(fv.patientFieldId),
        },
      },
      create: {
        patientId,
        patientFieldId: toDbId(fv.patientFieldId),
        value: fv.value.trim(),
      },
      update: {
        value: fv.value.trim(),
      },
    });
  }
}
