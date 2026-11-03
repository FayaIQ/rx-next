import type { PatientDto } from "@/lib/api/rx-client";
import type { PrescriptionDocumentKind } from "@/lib/prescription-document-kind";
import { decryptDraft, encryptDraft, getDraftKey, type EncryptedDraft } from "@/lib/draft-encryption";

const DRAFT_STORAGE_PREFIX = "rx:prescription-draft:v2:";
const LEGACY_STORAGE_PREFIX = "rx:prescription-draft:v1:";
const pendingWrites = new Map<number, Promise<void>>();
const generations = new Map<number, number>();

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
  documentKind?: PrescriptionDocumentKind;
  messageText?: string;
  consultationFee: number;
  consultationCurrency?: string;
  consultationFeeWaived: boolean;
  items: PrescriptionDraftMedicineRow[];
  fieldValues: Record<number, string>;
  xrayImage: string | null;
  analysisImage: string | null;
};

function storageKey(doctorId: number) {
  return `${DRAFT_STORAGE_PREFIX}${doctorId}`;
}

export async function readPrescriptionDraft(
  doctorId: number
): Promise<PrescriptionComposerDraft | null> {
  if (typeof window === "undefined") return null;
  const generation = generations.get(doctorId) ?? 0;
  generations.set(doctorId, generation);
  try {
    await pendingWrites.get(doctorId);
    const raw = localStorage.getItem(storageKey(doctorId));
    const legacy = raw ? null : localStorage.getItem(`${LEGACY_STORAGE_PREFIX}${doctorId}`);
    if (!raw && !legacy) return null;
    const text = raw ? await decryptDraft(JSON.parse(raw) as EncryptedDraft, doctorId, await getDraftKey(doctorId)) : legacy!;
    const parsed = JSON.parse(text) as Partial<PrescriptionComposerDraft>;
    if (parsed.version !== 1 || parsed.doctorId !== doctorId) return null;
    if (!Array.isArray(parsed.items) || typeof parsed.prescriptionDate !== "string") {
      return null;
    }
    const draft = parsed as PrescriptionComposerDraft;
    if ((generations.get(doctorId) ?? 0) !== generation) return null;
    if (legacy) await writePrescriptionDraft(draft);
    return draft;
  } catch {
    // Do not turn a temporarily unavailable encryption key into an empty draft:
    // the composer must preserve the saved copy instead of overwriting it.
    throw new Error("Prescription draft could not be decrypted");
  }
}

export function writePrescriptionDraft(draft: PrescriptionComposerDraft): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const doctorId = draft.doctorId;
  const generation = generations.get(doctorId) ?? 0;
  const text = JSON.stringify(draft);
  const pending = (pendingWrites.get(doctorId) ?? Promise.resolve()).then(async () => {
    if ((generations.get(doctorId) ?? 0) !== generation) return;
    const encrypted = await encryptDraft(text, doctorId, await getDraftKey(doctorId));
    if ((generations.get(doctorId) ?? 0) !== generation) return;
    localStorage.setItem(storageKey(doctorId), JSON.stringify(encrypted));
    // Remove the older plaintext only after its encrypted replacement is saved.
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}${doctorId}`);
  }).catch(() => {
    // Quota/private mode must not interrupt writing or create a plaintext fallback.
  });
  pendingWrites.set(doctorId, pending);
  void pending.finally(() => { if (pendingWrites.get(doctorId) === pending) pendingWrites.delete(doctorId); });
  return pending;
}

export function clearPrescriptionDraft(doctorId: number) {
  generations.set(doctorId, (generations.get(doctorId) ?? 0) + 1);
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(doctorId));
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}${doctorId}`);
  } catch {
    // Storage may be disabled by the browser; saving must still continue.
  }
}

export function clearAllPrescriptionDrafts() {
  for (const doctorId of new Set([...generations.keys(), ...pendingWrites.keys()])) generations.set(doctorId, (generations.get(doctorId) ?? 0) + 1);
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(DRAFT_STORAGE_PREFIX) || key?.startsWith(LEGACY_STORAGE_PREFIX)) keys.push(key);
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
      draft.messageText?.trim() ||
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
