import {
  CLINIC_FEATURE_KEYS,
  setClinicFeatureEnabled,
  type ClinicFeatureKey,
} from "@/lib/clinic-features";

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
    DOCTOR_PRACTICE_TYPES.some((t) => t.id === value)
  );
}

export function getPracticeTypeMeta(type: DoctorPracticeType) {
  return DOCTOR_PRACTICE_TYPES.find((t) => t.id === type)!;
}

/** Seed per-doctor page toggles from the practice type chosen at signup. */
export async function applyPracticeTypeFeatures(
  doctorId: number,
  practiceType: DoctorPracticeType
) {
  const meta = getPracticeTypeMeta(practiceType);
  const disabled = new Set<ClinicFeatureKey>(meta.disabledFeatures);

  for (const key of CLINIC_FEATURE_KEYS) {
    await setClinicFeatureEnabled(doctorId, key, !disabled.has(key));
  }
}
