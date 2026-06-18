import type { MedicinePresetDto } from "@/lib/api/rx-client";
import {
  findGroupForQuery,
  findVariant,
  medicineGroupKey,
  normalizeMedicineName,
  type MedicineGroup,
} from "@/lib/medicine-utils";
import type { MedicineDto } from "@/lib/api/rx-client";

function sortPresets(presets: MedicinePresetDto[]): MedicinePresetDto[] {
  return [...presets].sort(
    (a, b) =>
      b.usageCount - a.usageCount ||
      new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  );
}

/** Match presets by group key or exact normalized name. */
export function filterPresetsForMedicine(
  presets: MedicinePresetDto[],
  name: string,
  type?: string
): MedicinePresetDto[] {
  const key = medicineGroupKey(name);
  const normName = normalizeMedicineName(name);
  const normType = type !== undefined ? type.trim() : undefined;

  return sortPresets(
    presets.filter((p) => {
      const nameMatch =
        p.medicineKey === key ||
        normalizeMedicineName(p.name) === normName ||
        normalizeMedicineName(p.name).includes(normName) ||
        normName.includes(normalizeMedicineName(p.name));

      if (!nameMatch) return false;
      if (normType !== undefined) return (p.type ?? "").trim() === normType;
      return true;
    })
  );
}

export function pickAutoFillPreset(
  presets: MedicinePresetDto[],
  name: string,
  type?: string
): MedicinePresetDto | undefined {
  if (type !== undefined) {
    const typed = filterPresetsForMedicine(presets, name, type);
    if (typed.length > 0) return typed[0];
    // نوع محدد بدون إعداد محفوظ — لا نرجع لنوع آخر
    if (type.trim() !== "") return undefined;
  }

  const anyType = filterPresetsForMedicine(presets, name);
  return anyType[0];
}

export function resolveMedicineFill(
  row: {
    name: string;
    type: string;
    dosage: string;
    quantity: string;
    period: string;
    timeOfUse: string;
  },
  groups: MedicineGroup[],
  presets: MedicinePresetDto[],
  preferredName?: string
): typeof row | null {
  const name = (preferredName ?? row.name).trim();
  if (!name) return null;

  const preset = pickAutoFillPreset(presets, name, row.type);
  if (preset) {
    return {
      ...row,
      name: preset.name,
      type: preset.type,
      dosage: preset.dosage,
      quantity: preset.quantity,
      period: preset.period,
      timeOfUse: preset.timeOfUse,
    };
  }

  const group = findGroupForQuery(groups, name);
  if (!group) return null;

  if (group.variants.length === 1) {
    const variant = group.variants[0]!;
    return applyVariantFields(row, variant, name);
  }

  if (row.type) {
    const variant = findVariant(group.variants, row.type);
    if (variant) return applyVariantFields(row, variant, variant.name.trim());
  }

  return {
    ...row,
    name: group.name,
  };
}

function applyVariantFields(
  row: {
    name: string;
    type: string;
    dosage: string;
    quantity: string;
    period: string;
    timeOfUse: string;
  },
  variant: MedicineDto,
  displayName: string
): typeof row {
  return {
    ...row,
    name: displayName,
    type: variant.type?.trim() ?? "",
    dosage: variant.dosage?.trim() ?? "",
    quantity: variant.quantity?.trim() ?? "",
    period: variant.period?.trim() ?? "",
    timeOfUse: variant.timeOfUse?.trim() ?? "",
  };
}

export function hasUsageFields(row: {
  dosage: string;
  quantity: string;
  period: string;
  timeOfUse: string;
}): boolean {
  return !!(row.dosage || row.quantity || row.period || row.timeOfUse);
}

export function formatPresetLabel(preset: MedicinePresetDto): string {
  const typeLabel = preset.type ? `[${preset.type}] ` : "";
  const parts = [preset.dosage, preset.quantity, preset.period, preset.timeOfUse].filter(
    Boolean
  );
  const usage =
    preset.usageCount > 1 ? ` (${preset.usageCount}×)` : "";
  return `${typeLabel}${parts.join(" · ") || "إعداد محفوظ"}${usage}`;
}

export function presetOptionKey(preset: MedicinePresetDto, index = 0): string {
  return String(preset.id || `${preset.medicineKey}-${preset.type}-${index}`);
}

type PresetItemInput = {
  name: string;
  type?: string | null;
  dosage?: string | null;
  quantity?: string | null;
  period?: string | null;
  timeOfUse?: string | null;
};

function presetFieldsMatch(
  preset: MedicinePresetDto,
  fields: {
    type: string;
    dosage: string;
    quantity: string;
    period: string;
    timeOfUse: string;
  }
) {
  return (
    (preset.type ?? "").trim() === fields.type &&
    (preset.dosage ?? "").trim() === fields.dosage &&
    (preset.quantity ?? "").trim() === fields.quantity &&
    (preset.period ?? "").trim() === fields.period &&
    (preset.timeOfUse ?? "").trim() === fields.timeOfUse
  );
}

/** تحديث فوري للكاش بعد الحفظ بدون انتظار السيرفر */
export function mergePresetsFromItems(
  presets: MedicinePresetDto[],
  items: PresetItemInput[],
  doctorId = 0
): MedicinePresetDto[] {
  const now = new Date().toISOString();
  const next = [...presets];

  for (const item of items) {
    const name = item.name.trim();
    const fields = {
      type: (item.type ?? "").trim(),
      dosage: (item.dosage ?? "").trim(),
      quantity: (item.quantity ?? "").trim(),
      period: (item.period ?? "").trim(),
      timeOfUse: (item.timeOfUse ?? "").trim(),
    };
    if (
      !name ||
      (!fields.dosage &&
        !fields.quantity &&
        !fields.period &&
        !fields.timeOfUse)
    ) {
      continue;
    }

    const medicineKey = medicineGroupKey(name);
    const idx = next.findIndex(
      (preset) =>
        (preset.medicineKey === medicineKey ||
          preset.name.trim().toLowerCase() === name.toLowerCase()) &&
        presetFieldsMatch(preset, fields)
    );

    if (idx >= 0) {
      const preset = next[idx];
      next[idx] = {
        ...preset,
        name,
        usageCount: preset.usageCount + 1,
        lastUsedAt: now,
      };
    } else {
      next.push({
        id: 0,
        doctorId,
        medicineKey,
        name,
        type: fields.type,
        dosage: fields.dosage,
        quantity: fields.quantity,
        period: fields.period,
        timeOfUse: fields.timeOfUse,
        usageCount: 1,
        lastUsedAt: now,
      });
    }
  }

  return sortPresets(next);
}
