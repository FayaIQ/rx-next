"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PatientFieldDto } from "@/lib/api/rx-client";

type Props = {
  fields: PatientFieldDto[];
  values: Record<number, string>;
  onChange: (fieldId: number, value: string) => void;
  compact?: boolean;
};

export function PatientDynamicFields({
  fields,
  values,
  onChange,
  compact = false,
}: Props) {
  if (fields.length === 0) return null;

  return (
    <div
      className={
        compact
          ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
          : "grid gap-4 sm:grid-cols-2"
      }
    >
      {fields.map((field) => (
        <div key={field.id} className={compact ? "space-y-0.5" : "space-y-1"}>
          <Label className={compact ? "rx-label" : undefined}>{field.name}</Label>
          <Input
            fieldSize="compact"
            value={values[field.id] ?? ""}
            onChange={(e) => onChange(field.id, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

export function patientFieldValuesFromRecord(
  values: Record<number, string>
): Array<{ patientFieldId: number; value: string }> {
  return Object.entries(values)
    .filter(([, value]) => value.trim())
    .map(([patientFieldId, value]) => ({
      patientFieldId: Number(patientFieldId),
      value: value.trim(),
    }));
}

export function recordFromPatientFieldValues(
  fieldValues?: Array<{ patientFieldId: number; value: string }>
): Record<number, string> {
  const record: Record<number, string> = {};
  for (const fv of fieldValues ?? []) {
    if (fv.value.trim()) record[fv.patientFieldId] = fv.value;
  }
  return record;
}
