export const LEGACY_ENTITIES = [
  "Patients", "Visits", "PrescribedDrugs", "Appointments", "LabWorkups",
  "VitalSigns", "Histories", "PatientChronicConditions", "PatientDiagnoses",
  "PatientFamilyHistories", "Attachments", "SavedFiles", "DrugTemplates",
  "PrescriptionListTemplates", "PrescriptionListTemplateItems", "TextTemplates",
  "VisitTemplates", "VisitTemplateItems", "ReferringDoctors", "HandwrittenDiagnosisCatalog",
  "Icd10Diagnoses",
] as const;
export type LegacyEntity = typeof LEGACY_ENTITIES[number];
export type ArchiveState = "ready" | "review" | "excluded";
export type ArchiveBatch = {
  id: string; sourceName: string; sourceCreatedAt: string | null;
  stats: { total: number; states: Record<ArchiveState, number>; entities: Record<string, { total: number; ready: number; review: number; excluded: number }> };
  importedAt: string;
  nativeCompletedAt?: string | null;
  approval?: { count: number; at: string } | null;
  prescriptionVisits?: number;
  meaningfulVitals?: number;
};
export type ArchiveRecord = {
  id: string; entity: LegacyEntity; sourceId: string; sourcePatientId: string | null;
  sourceVisitId: string | null; sourceDate: string | null; eventDay: string | null;
  displayName: string; sourceDeleted: boolean; state: ArchiveState; reviewReasons: string[];
  reviewAccepted?: boolean;
  presentation: { fields: Record<string, unknown>; noteText?: string; [key: string]: unknown };
};
export type ArchivePage = {
  rows: ArchiveRecord[]; total: number; page: number; pageSize: number;
  patient?: ArchiveRecord; counts?: Record<string, number>; drugs?: ArchiveRecord[];
  references?: Record<string, string>;
  patientStats?: Record<string, { visits: number; lastVisit: string | null }>;
  observations?: ArchiveRecord[];
  labResults?: ArchiveRecord[];
  templateItems?: ArchiveRecord[];
};
