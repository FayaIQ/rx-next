import type { PatientFieldDto } from "@/lib/api/rx-client";

export type FieldValueRow = Array<{
  patientFieldId: number;
  value: string;
}>;

export function normalizePatientFieldsArray(
  fields: PatientFieldDto[] | { fields: PatientFieldDto[] } | undefined | null
): PatientFieldDto[] {
  if (!fields) return [];
  if (Array.isArray(fields)) return fields;
  if (Array.isArray(fields.fields)) return fields.fields;
  return [];
}

export function activePersonalFields(
  fields: PatientFieldDto[] | { fields: PatientFieldDto[] } | undefined
) {
  return normalizePatientFieldsArray(fields).filter(
    (f) => f.isActive && f.isPersonal
  );
}

export function activeRecipeFields(
  fields: PatientFieldDto[] | { fields: PatientFieldDto[] } | undefined
) {
  return normalizePatientFieldsArray(fields).filter(
    (f) => f.isActive && !f.isPersonal
  );
}

export function getFieldValue(
  values: FieldValueRow | undefined,
  fieldId: number
): string {
  const value = values?.find((fv) => fv.patientFieldId === fieldId)?.value?.trim();
  return value || "—";
}
