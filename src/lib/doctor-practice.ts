import {
  CLINIC_FEATURE_KEYS,
  setClinicFeatureEnabled,
  type ClinicFeatureKey,
} from "@/lib/clinic-features";
import {
  getPracticeTypeMeta,
  type DoctorPracticeType,
} from "@/lib/doctor-practice-shared";

export {
  DOCTOR_PRACTICE_TYPES,
  getPracticeTypeMeta,
  isDoctorPracticeType,
  type DoctorPracticeType,
} from "@/lib/doctor-practice-shared";

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
