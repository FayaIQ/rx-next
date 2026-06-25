import type { PatientFieldDto } from "@/lib/api/rx-client";

export type FieldValueRow = Array<{
  patientFieldId: number;
  value: string;
}>;

export function activePersonalFields(fields: PatientFieldDto[] | undefined) {
  return fields?.filter((f) => f.isActive && f.isPersonal) ?? [];
}

export function activeRecipeFields(fields: PatientFieldDto[] | undefined) {
  return fields?.filter((f) => f.isActive && !f.isPersonal) ?? [];
}

export function getFieldValue(
  values: FieldValueRow | undefined,
  fieldId: number
): string {
  const value = values?.find((fv) => fv.patientFieldId === fieldId)?.value?.trim();
  return value || "—";
}
