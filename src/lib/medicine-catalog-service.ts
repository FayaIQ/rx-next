import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";

const EMPTY_MED = {
  type: "",
  dosage: "",
  quantity: "",
  period: "",
  timeOfUse: "",
};

export type MedicineCatalogInput = {
  name: string;
  type?: string | null;
  dosage?: string | null;
  quantity?: string | null;
  period?: string | null;
  timeOfUse?: string | null;
};

function normField(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function catalogFields(item: MedicineCatalogInput) {
  return {
    type: normField(item.type) || EMPTY_MED.type,
    dosage: normField(item.dosage) || EMPTY_MED.dosage,
    quantity: normField(item.quantity) || EMPTY_MED.quantity,
    period: normField(item.period) || EMPTY_MED.period,
    timeOfUse: normField(item.timeOfUse) || EMPTY_MED.timeOfUse,
  };
}

function matchesCatalogItem(
  existing: {
    name: string;
    type: string;
    dosage: string;
    quantity: string;
    period: string;
    timeOfUse: string;
  },
  item: { name: string } & ReturnType<typeof catalogFields>
) {
  return (
    existing.name.toLowerCase() === item.name.toLowerCase() &&
    existing.type === item.type &&
    existing.dosage === item.dosage &&
    existing.quantity === item.quantity &&
    existing.period === item.period &&
    existing.timeOfUse === item.timeOfUse
  );
}

/** Add prescription medicines to the doctor's medicine library when missing. */
export async function upsertMedicinesFromPrescription(
  doctorId: number,
  items: MedicineCatalogInput[]
) {
  const doctorDbId = toDbId(doctorId);

  const normalized = items
    .map((item) => {
      const name = item.name.trim();
      if (!name) return null;
      return { name, ...catalogFields(item) };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (normalized.length === 0) return;

  const names = [...new Set(normalized.map((item) => item.name))];
  const existing = await prisma.medicine.findMany({
    where: {
      doctorId: doctorDbId,
      OR: names.map((name) => ({
        name: { equals: name, mode: "insensitive" as const },
      })),
    },
  });

  const toCreate = normalized.filter(
    (item) => !existing.some((row) => matchesCatalogItem(row, item))
  );

  if (toCreate.length === 0) return;

  await prisma.medicine.createMany({
    data: toCreate.map((item) => ({
      doctorId: doctorDbId,
      name: item.name,
      type: item.type,
      dosage: item.dosage,
      quantity: item.quantity,
      period: item.period,
      timeOfUse: item.timeOfUse,
    })),
  });
}
