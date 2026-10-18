import {
  CLINIC_FEATURE_KEYS,
  ensureClinicFeaturesReady,
  invalidateClinicFeatureCache,
  type ClinicFeatureKey,
} from "@/lib/clinic-features";
import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
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

  await ensureClinicFeaturesReady();
  const id = toDbId(doctorId);
  await prisma.$transaction(async tx => {
    await tx.clinicFeatureToggle.createMany({ data: CLINIC_FEATURE_KEYS.map(key => ({ doctorId: id, key, enabled: !disabled.has(key) })), skipDuplicates: true });
    await tx.clinicFeatureToggle.updateMany({ where: { doctorId: id, key: { in: CLINIC_FEATURE_KEYS.filter(key => disabled.has(key)) } }, data: { enabled: false } });
    await tx.clinicFeatureToggle.updateMany({ where: { doctorId: id, key: { in: CLINIC_FEATURE_KEYS.filter(key => !disabled.has(key)) } }, data: { enabled: true } });
  });
  invalidateClinicFeatureCache(doctorId);
}
