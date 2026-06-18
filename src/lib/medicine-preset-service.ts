import { prisma } from "@/lib/prisma";
import { toDbId, fromDbId } from "@/lib/bigint";
import { medicineGroupKey, normalizeMedicineName } from "@/lib/medicine-utils";

export type MedicinePresetInput = {
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

function hasUsageData(item: MedicinePresetInput): boolean {
  return (
    !!normField(item.dosage) ||
    !!normField(item.quantity) ||
    !!normField(item.period) ||
    !!normField(item.timeOfUse)
  );
}

export function serializeMedicinePreset(preset: {
  id: bigint | number;
  doctorId: bigint | number;
  medicineKey: string;
  name: string;
  type: string;
  dosage: string;
  quantity: string;
  period: string;
  timeOfUse: string;
  usageCount: number;
  lastUsedAt: Date;
}) {
  return {
    id: fromDbId(preset.id),
    doctorId: fromDbId(preset.doctorId),
    medicineKey: preset.medicineKey,
    name: preset.name,
    type: preset.type,
    dosage: preset.dosage,
    quantity: preset.quantity,
    period: preset.period,
    timeOfUse: preset.timeOfUse,
    usageCount: preset.usageCount,
    lastUsedAt: preset.lastUsedAt.toISOString(),
  };
}

export async function upsertMedicinePresets(
  doctorId: number,
  items: MedicinePresetInput[]
) {
  const doctorDbId = toDbId(doctorId);
  const now = new Date();

  const normalized = items
    .map((item) => {
      const name = item.name.trim();
      if (!name || !hasUsageData(item)) return null;
      const fields = {
        type: normField(item.type),
        dosage: normField(item.dosage),
        quantity: normField(item.quantity),
        period: normField(item.period),
        timeOfUse: normField(item.timeOfUse),
      };
      return {
        name,
        medicineKey: medicineGroupKey(name),
        fields,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (normalized.length === 0) return;

  const keys = [...new Set(normalized.map((item) => item.medicineKey))];
  const names = [...new Set(normalized.map((item) => item.name))];

  const existingPresets = await prisma.medicinePreset.findMany({
    where: {
      doctorId: doctorDbId,
      OR: [
        { medicineKey: { in: keys } },
        ...names.map((name) => ({
          name: { equals: name, mode: "insensitive" as const },
        })),
      ],
    },
  });

  await prisma.$transaction(async (tx) => {
    for (const item of normalized) {
      const existing = existingPresets.find(
        (p) =>
          (p.medicineKey === item.medicineKey ||
            p.name.toLowerCase() === item.name.toLowerCase()) &&
          p.type === item.fields.type &&
          p.dosage === item.fields.dosage &&
          p.quantity === item.fields.quantity &&
          p.period === item.fields.period &&
          p.timeOfUse === item.fields.timeOfUse
      );

      if (existing) {
        await tx.medicinePreset.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            usageCount: { increment: 1 },
            lastUsedAt: now,
          },
        });
        existing.usageCount += 1;
        existing.lastUsedAt = now;
        existing.name = item.name;
      } else {
        const created = await tx.medicinePreset.create({
          data: {
            doctorId: doctorDbId,
            medicineKey: item.medicineKey,
            name: item.name,
            ...item.fields,
            usageCount: 1,
            lastUsedAt: now,
          },
        });
        existingPresets.push(created);
      }
    }
  });
}

export async function listMedicinePresets(doctorId: number) {
  const doctorDbId = toDbId(doctorId);
  const existingCount = await prisma.medicinePreset.count({
    where: { doctorId: doctorDbId },
  });

  if (existingCount === 0) {
    const items = await prisma.prescriptionItem.findMany({
      where: { prescription: { doctorId: doctorDbId } },
      select: {
        name: true,
        type: true,
        dosage: true,
        quantity: true,
        period: true,
        timeOfUse: true,
      },
      orderBy: { id: "desc" },
      take: 500,
    });
    if (items.length > 0) {
      await upsertMedicinePresets(doctorId, items);
    }
  }

  const presets = await prisma.medicinePreset.findMany({
    where: { doctorId: doctorDbId },
    orderBy: [{ usageCount: "desc" }, { lastUsedAt: "desc" }],
  });
  return presets.map(serializeMedicinePreset);
}

export async function listMedicinePresetsForMedicine(
  doctorId: number,
  name: string,
  type?: string
) {
  const medicineKey = medicineGroupKey(name);
  const normName = normalizeMedicineName(name);
  const presets = await prisma.medicinePreset.findMany({
    where: {
      doctorId: toDbId(doctorId),
      OR: [
        { medicineKey },
        { name: { equals: name, mode: "insensitive" } },
      ],
      ...(type !== undefined ? { type: normField(type) } : {}),
    },
    orderBy: [{ usageCount: "desc" }, { lastUsedAt: "desc" }],
  });
  return presets
    .filter(
      (p) =>
        p.medicineKey === medicineKey ||
        normalizeMedicineName(p.name) === normName ||
        normalizeMedicineName(p.name).includes(normName) ||
        normName.includes(normalizeMedicineName(p.name))
    )
    .map(serializeMedicinePreset);
}
