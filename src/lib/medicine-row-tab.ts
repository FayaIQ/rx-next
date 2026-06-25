import type { MedicineRowData } from "@/components/prescription/medicine-row-editor";

export const MEDICINE_FIELD_ORDER = [
  "name",
  "type",
  "dosage",
  "quantity",
  "period",
  "timeOfUse",
] as const;

export type MedicineFieldName = (typeof MEDICINE_FIELD_ORDER)[number];

export function medicineFieldSelector(
  rowKey: string,
  field: MedicineFieldName
): string {
  return `[data-rx-medicine-row="${rowKey}"][data-rx-medicine-field="${field}"]`;
}

export function focusMedicineField(rowKey: string, field: MedicineFieldName) {
  const el = document.querySelector<HTMLElement>(
    medicineFieldSelector(rowKey, field)
  );
  if (!el) return;
  el.focus();
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.select?.();
  }
}

export function listMedicineNameInputs(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      'input[data-rx-medicine-field="name"]'
    )
  ).filter((el) => el.getClientRects().length > 0);
}

export function focusNextMedicineName(
  currentRowKey: string,
  onAddRow?: () => void
): boolean {
  const names = listMedicineNameInputs();
  const idx = names.findIndex((el) => el.dataset.rxMedicineRow === currentRowKey);
  if (idx >= 0 && idx < names.length - 1) {
    names[idx + 1]?.focus();
    names[idx + 1]?.select?.();
    return true;
  }
  if (onAddRow) {
    onAddRow();
    requestAnimationFrame(() => {
      const fresh = listMedicineNameInputs();
      const last = fresh[fresh.length - 1];
      last?.focus();
      last?.select?.();
    });
    return true;
  }
  return false;
}

export function focusPreviousMedicineName(currentRowKey: string): boolean {
  const names = listMedicineNameInputs();
  const idx = names.findIndex((el) => el.dataset.rxMedicineRow === currentRowKey);
  if (idx > 0) {
    names[idx - 1]?.focus();
    names[idx - 1]?.select?.();
    return true;
  }
  return false;
}

export function needsMedicineType(row: MedicineRowData, hasTypeOptions: boolean) {
  return hasTypeOptions && !row.type.trim();
}

export function isMedicineRowComplete(
  row: MedicineRowData,
  hasTypeOptions: boolean
) {
  if (!row.name.trim()) return false;
  if (needsMedicineType(row, hasTypeOptions)) return false;
  return !!(row.dosage || row.quantity || row.period || row.timeOfUse);
}

export function nextEmptyMedicineField(
  row: MedicineRowData,
  hasTypeOptions: boolean,
  from: MedicineFieldName
): MedicineFieldName | null {
  const start = MEDICINE_FIELD_ORDER.indexOf(from) + 1;
  for (let i = start; i < MEDICINE_FIELD_ORDER.length; i++) {
    const field = MEDICINE_FIELD_ORDER[i]!;
    if (field === "type") {
      if (needsMedicineType(row, hasTypeOptions)) return "type";
      continue;
    }
    const value = row[field];
    if (!String(value ?? "").trim()) return field;
  }
  return null;
}

export function previousMedicineField(
  from: MedicineFieldName
): MedicineFieldName | null {
  const idx = MEDICINE_FIELD_ORDER.indexOf(from);
  if (idx <= 0) return null;
  return MEDICINE_FIELD_ORDER[idx - 1] ?? null;
}
