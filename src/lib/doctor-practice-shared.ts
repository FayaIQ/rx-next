import type { ClinicFeatureKey } from "@/lib/clinic-features-shared";

export const DOCTOR_PRACTICE_TYPES = [
  {
    id: "general",
    label: "طب عام وتخصصات",
    description: "وصفات، مواعيد، مرضى ومالية — بدون طبلة الأسنان",
    specialty: "طب عام",
    disabledFeatures: ["dental", "treatment"] as ClinicFeatureKey[],
  },
  {
    id: "dental",
    label: "طب أسنان",
    description: "يشمل طبلة الأسنان وخطط العلاج السني مع باقي الأدوات",
    specialty: "طب أسنان",
    disabledFeatures: [] as ClinicFeatureKey[],
  },
] as const;

export type DoctorPracticeType = (typeof DOCTOR_PRACTICE_TYPES)[number]["id"];

export function isDoctorPracticeType(value: unknown): value is DoctorPracticeType {
  return (
    typeof value === "string" &&
    DOCTOR_PRACTICE_TYPES.some((type) => type.id === value)
  );
}

export function getPracticeTypeMeta(type: DoctorPracticeType) {
  return DOCTOR_PRACTICE_TYPES.find((item) => item.id === type)!;
}
