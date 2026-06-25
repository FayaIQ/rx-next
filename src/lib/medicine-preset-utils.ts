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

export type MedicineFillField =
  | "type"
  | "dosage"
  | "quantity"
  | "period"
  | "timeOfUse";

export const MEDICINE_FILL_FIELD_ORDER: MedicineFillField[] = [
  "type",
  "dosage",
  "quantity",
  "period",
  "timeOfUse",
];

export type MedicineFieldOption = {
  value: string;
  usageCount: number;
};

type UsageRow = {
  name: string;
  type: string;
  dosage: string;
  quantity: string;
  period: string;
  timeOfUse: string;
};

function matchesFilledFieldsBefore(
  source: {
    type?: string | null;
    dosage?: string | null;
    quantity?: string | null;
    period?: string | null;
    timeOfUse?: string | null;
  },
  row: UsageRow,
  field: MedicineFillField
): boolean {
  const fieldIndex = MEDICINE_FILL_FIELD_ORDER.indexOf(field);
  for (let i = 0; i < fieldIndex; i++) {
    const key = MEDICINE_FILL_FIELD_ORDER[i]!;
    const rowVal = row[key].trim();
    if (!rowVal) continue;
    if ((source[key] ?? "").trim() !== rowVal) return false;
  }
  return true;
}

/** Unique stored values for one medicine row field (presets + catalog variants). */
export function getMedicineFieldOptions(
  field: MedicineFillField,
  row: UsageRow,
  groups: MedicineGroup[],
  presets: MedicinePresetDto[]
): MedicineFieldOption[] {
  const name = row.name.trim();
  if (!name) return [];

  const values = new Map<string, number>();

  for (const preset of filterPresetsForMedicine(presets, name)) {
    if (!matchesFilledFieldsBefore(preset, row, field)) continue;
    const value = (preset[field] ?? "").trim();
    if (!value) continue;
    values.set(value, Math.max(values.get(value) ?? 0, preset.usageCount));
  }

  const group = findGroupForQuery(groups, name);
  if (group) {
    for (const variant of group.variants) {
      if (!matchesFilledFieldsBefore(variant, row, field)) continue;
      const value = (variant[field]?.trim() ?? "");
      if (!value) continue;
      values.set(value, values.get(value) ?? 0);
    }
  }

  return [...values.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ar"))
    .map(([value, usageCount]) => ({ value, usageCount }));
}

/** Stored value for a single medicine row field (preset or catalog variant). */
export function resolveMedicineFieldValue(
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
  field: MedicineFillField
): string | null {
  const name = row.name.trim();
  if (!name) return null;

  const preset = pickAutoFillPreset(presets, name, row.type);
  if (preset) {
    const fromPreset = (preset[field] ?? "").trim();
    if (fromPreset) return fromPreset;
  }

  const group = findGroupForQuery(groups, name);
  if (!group) return null;

  const variant =
    row.type.trim() !== ""
      ? findVariant(group.variants, row.type)
      : group.variants.length === 1
        ? group.variants[0]
        : undefined;

  if (!variant) return null;

  const fromVariant = (variant[field]?.trim() ?? "") || null;
  return fromVariant || null;
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
