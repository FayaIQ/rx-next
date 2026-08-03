import type { PatientDto } from "@/lib/api/rx-client";

const DRAFT_STORAGE_PREFIX = "rx:prescription-draft:v1:";

export type NewPatientDraft = {
  name: string;
  gender: "male" | "female";
  birthdateInput: string;
  phone: string;
  diagnosis: string;
  allergies: string;
  currentMedications: string;
  dynamicFieldValues: Record<number, string>;
};

export type PrescriptionDraftMedicineRow = {
  id?: number;
  key: string;
  name: string;
  type: string;
  dosage: string;
  quantity: string;
  period: string;
  timeOfUse: string;
};

export type PrescriptionComposerDraft = {
  version: 1;
  doctorId: number;
  savedAt: string;
  currentPrescriptionId: number | null;
  prescriptionNumber: number | null;
  prescriptionDate: string;
  patientSearch: string;
  selectedPatient: PatientDto | null;
  showNewPatient: boolean;
  newPatientInitialName: string;
  newPatientDraft: NewPatientDraft | null;
  diagnosis: string;
  consultationFee: number;
  consultationFeeWaived: boolean;
  items: PrescriptionDraftMedicineRow[];
  fieldValues: Record<number, string>;
  xrayImage: string | null;
  analysisImage: string | null;
};

function storageKey(doctorId: number) {
  return `${DRAFT_STORAGE_PREFIX}${doctorId}`;
}

export function readPrescriptionDraft(
  doctorId: number
): PrescriptionComposerDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(doctorId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PrescriptionComposerDraft>;
    if (parsed.version !== 1 || parsed.doctorId !== doctorId) return null;
    if (!Array.isArray(parsed.items) || typeof parsed.prescriptionDate !== "string") {
      return null;
    }
    return parsed as PrescriptionComposerDraft;
  } catch {
    return null;
  }
}

export function writePrescriptionDraft(draft: PrescriptionComposerDraft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(draft.doctorId), JSON.stringify(draft));
  } catch {
    // A draft should never interrupt prescription writing (quota/private mode).
  }
}

export function clearPrescriptionDraft(doctorId: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(doctorId));
  } catch {
    // Storage may be disabled by the browser; saving must still continue.
  }
}

export function clearAllPrescriptionDrafts() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(DRAFT_STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Account deletion must not be blocked when browser storage is unavailable.
  }
}

export function prescriptionDraftHasContent(draft: PrescriptionComposerDraft) {
  const patientDraft = draft.newPatientDraft;
  return Boolean(
    draft.currentPrescriptionId ||
      draft.selectedPatient ||
      draft.patientSearch.trim() ||
      draft.diagnosis.trim() ||
      draft.items.some((item) =>
        [
          item.name,
          item.type,
          item.dosage,
          item.quantity,
          item.period,
          item.timeOfUse,
        ].some((value) => value.trim())
      ) ||
      Object.values(draft.fieldValues).some((value) => value.trim()) ||
      (patientDraft &&
        [
          patientDraft.name,
          patientDraft.birthdateInput,
          patientDraft.phone,
          patientDraft.diagnosis,
          patientDraft.allergies,
          patientDraft.currentMedications,
        ].some((value) => value.trim()))
  );
}
