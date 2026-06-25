"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MedicineDto } from "@/lib/api/rx-client";

export type MedicineFormValues = {
  name: string;
  type: string;
  dosage: string;
  quantity: string;
  period: string;
  timeOfUse: string;
};

const FIELDS: Array<{
  key: keyof MedicineFormValues;
  label: string;
  placeholder: string;
  required?: boolean;
  span?: "full";
}> = [
  { key: "name", label: "اسم الدواء", placeholder: "مثال: Augmentin 1g", required: true, span: "full" },
  { key: "type", label: "النوع", placeholder: "أقراص، شراب، حقن..." },
  { key: "dosage", label: "الجرعة", placeholder: "قرص كل 8 ساعات" },
  { key: "quantity", label: "الكمية", placeholder: "21 قرص" },
  { key: "period", label: "المدة", placeholder: "7 أيام" },
  { key: "timeOfUse", label: "وقت الاستخدام", placeholder: "بعد الأكل" },
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
        {FIELDS.map(({ key, label, placeholder, required, span }) => (
          <div
            key={key}
            className={span === "full" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}
          >
            <Label className="text-xs text-rx-muted">{label}</Label>
            <Input
              value={values[key]}
              onChange={(e) => setField(key, e.target.value)}
              placeholder={placeholder}
              required={required}
              autoFocus={key === "name" && !editing}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-rx-border/80 pt-4">
        <Button type="submit" disabled={pending || !values.name.trim()}>
          {pending ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إضافة الدواء"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          إلغاء
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
