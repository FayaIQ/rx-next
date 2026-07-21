"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MedicineDto } from "@/lib/api/rx-client";
import { useLocale } from "@/i18n/locale-provider";

export type MedicineFormValues = {
  name: string;
  type: string;
  dosage: string;
  quantity: string;
  period: string;
  timeOfUse: string;
};

const FIELD_KEYS: Array<{
  key: keyof MedicineFormValues;
  labelKey: string;
  placeholderKey: string;
  required?: boolean;
  span?: "full";
}> = [
  {
    key: "name",
    labelKey: "medicines.fieldName",
    placeholderKey: "medicines.phName",
    required: true,
    span: "full",
  },
  {
    key: "type",
    labelKey: "medicines.fieldType",
    placeholderKey: "medicines.phType",
  },
  {
    key: "dosage",
    labelKey: "medicines.fieldDosage",
    placeholderKey: "medicines.phDosage",
  },
  {
    key: "quantity",
    labelKey: "medicines.fieldQuantity",
    placeholderKey: "medicines.phQuantity",
  },
  {
    key: "period",
    labelKey: "medicines.fieldPeriod",
    placeholderKey: "medicines.phPeriod",
  },
  {
    key: "timeOfUse",
    labelKey: "medicines.fieldTimeOfUse",
    placeholderKey: "medicines.phTimeOfUse",
  },
];

type Props = {
  values: MedicineFormValues;
  onChange: (values: MedicineFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
  editing?: MedicineDto | null;
  pending?: boolean;
};

export function MedicineForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  editing,
  pending,
}: Props) {
  const { t } = useLocale();

  function setField(key: keyof MedicineFormValues, value: string) {
    onChange({ ...values, [key]: value });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELD_KEYS.map(({ key, labelKey, placeholderKey, required, span }) => (
          <div
            key={key}
            className={
              span === "full" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"
            }
          >
            <Label className="text-xs text-rx-muted">{t(labelKey)}</Label>
            <Input
              value={values[key]}
              onChange={(e) => setField(key, e.target.value)}
              placeholder={t(placeholderKey)}
              required={required}
              autoFocus={key === "name" && !editing}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-rx-border/80 pt-4">
        <Button type="submit" disabled={pending || !values.name.trim()}>
          {pending
            ? t("common.saving")
            : editing
              ? t("medicines.saveEdits")
              : t("medicines.submitAdd")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

export const emptyMedicineForm: MedicineFormValues = {
  name: "",
  type: "",
  dosage: "",
  quantity: "",
  period: "",
  timeOfUse: "",
};

export function medicineToFormValues(medicine: MedicineDto): MedicineFormValues {
  return {
    name: medicine.name,
    type: medicine.type ?? "",
    dosage: medicine.dosage ?? "",
    quantity: medicine.quantity ?? "",
    period: medicine.period ?? "",
    timeOfUse: medicine.timeOfUse ?? "",
  };
}
