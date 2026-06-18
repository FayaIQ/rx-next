import { useMemo } from "react";
import type { MedicineDto } from "@/lib/api/rx-client";

export type MedicineGroup = {
  /** Stable key for grouping */
  key: string;
  /** Shortest / canonical display name */
  name: string;
  variants: MedicineDto[];
};

/** Normalize for comparison — collapse spaces, lowercase. */
export function normalizeMedicineName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Extract primary drug name (first word) so
 * "Dexamethasone", "Dexamethasone phosphate" → same group.
 */
export function medicineGroupKey(name: string): string {
  const normalized = normalizeMedicineName(name);
  const match = normalized.match(/[a-z\u0600-\u06FF][a-z0-9\u0600-\u06FF.-]*/i);
  return match?.[0] ?? normalized;
}

function pickDisplayName(variants: MedicineDto[]): string {
  const names = [...new Set(variants.map((v) => v.name.trim()))].filter(Boolean);
  if (names.length === 0) return "";
  return names.sort((a, b) => a.length - b.length)[0]!;
}

/** Group medicines — one entry per primary name, types as variants. */
export function groupMedicinesByName(medicines: MedicineDto[]): MedicineGroup[] {
  const map = new Map<string, MedicineGroup>();

  for (const medicine of medicines) {
    const key = medicineGroupKey(medicine.name);
    if (!key) continue;

    const existing = map.get(key);
    if (existing) {
      // Avoid duplicate variants (same name + type + dosage)
      const dup = existing.variants.some(
        (v) =>
          normalizeMedicineName(v.name) === normalizeMedicineName(medicine.name) &&
          (v.type?.trim() ?? "") === (medicine.type?.trim() ?? "") &&
          (v.dosage?.trim() ?? "") === (medicine.dosage?.trim() ?? "")
      );
      if (!dup) existing.variants.push(medicine);
    } else {
      map.set(key, {
        key,
        name: medicine.name.trim(),
        variants: [medicine],
      });
    }
  }

  for (const group of map.values()) {
    group.name = pickDisplayName(group.variants);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "ar")
  );
}

export function filterMedicineGroups(
  groups: MedicineGroup[],
  query: string
): MedicineGroup[] {
  const q = normalizeMedicineName(query);
  if (!q) return groups.slice(0, 15);
  return groups
    .filter(
      (g) =>
        normalizeMedicineName(g.name).includes(q) ||
        g.key.includes(q) ||
        g.variants.some((v) => normalizeMedicineName(v.name).includes(q))
    )
    .slice(0, 15);
}

export function findMedicineGroup(
  groups: MedicineGroup[],
  name: string
): MedicineGroup | undefined {
  const key = medicineGroupKey(name);
  return groups.find((g) => g.key === key);
}

export function findGroupForQuery(
  groups: MedicineGroup[],
  query: string
): MedicineGroup | undefined {
  const q = normalizeMedicineName(query);
  if (!q) return undefined;

  for (const group of groups) {
    if (normalizeMedicineName(group.name) === q) return group;
    for (const variant of group.variants) {
      if (normalizeMedicineName(variant.name) === q) return group;
    }
  }

  const partial = groups.find(
    (g) =>
      normalizeMedicineName(g.name).includes(q) ||
      g.variants.some((v) => normalizeMedicineName(v.name).includes(q))
  );
  if (partial) return partial;

  return findMedicineGroup(groups, query);
}

export function uniqueTypes(variants: MedicineDto[]): string[] {
  const types = new Set<string>();
  for (const v of variants) {
    types.add(v.type?.trim() ?? "");
  }
  return Array.from(types).sort((a, b) => a.localeCompare(b, "ar"));
}

export function findVariant(
  variants: MedicineDto[],
  type: string
): MedicineDto | undefined {
  const normalized = type.trim();
  return variants.find((v) => (v.type?.trim() ?? "") === normalized);
}

export function useMedicineGroups(medicines: MedicineDto[]) {
  return useMemo(() => groupMedicinesByName(medicines), [medicines]);
}
