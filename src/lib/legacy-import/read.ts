import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ArchiveBatch, ArchivePage, ArchiveRecord, ArchiveState, LegacyEntity } from "./types";

const recordColumns = Prisma.sql`id::text AS "id", entity, source_id AS "sourceId",
  source_patient_id AS "sourcePatientId", source_visit_id AS "sourceVisitId",
  source_date AS "sourceDate", to_char(event_day, 'YYYY-MM-DD') AS "eventDay",
  display_name AS "displayName", source_deleted AS "sourceDeleted", state,
  review_reasons AS "reviewReasons", (review_decision='accepted_as_is') IS TRUE AS "reviewAccepted", presentation`;

export async function listLegacyBatches(doctorId: number): Promise<ArchiveBatch[]> {
  return prisma.$queryRaw<ArchiveBatch[]>`SELECT b.id::text AS id, 'Medical records' AS "sourceName",
    source_created_at AS "sourceCreatedAt", stats, imported_at::text AS "importedAt"
    , native_completed_at::text AS "nativeCompletedAt", metadata->'approval' AS approval,
    (SELECT count(DISTINCT source_visit_id)::int FROM legacy_clinical_records r
      WHERE r.doctor_id=b.doctor_id AND r.batch_id=b.id AND r.entity='PrescribedDrugs' AND r.source_deleted=false) AS "prescriptionVisits",
    (SELECT count(*)::int FROM legacy_clinical_records r WHERE r.doctor_id=b.doctor_id AND r.batch_id=b.id AND r.entity='VitalSigns' AND r.source_deleted=false AND NOT(r.review_reasons ? 'empty_vitals')) AS "meaningfulVitals"
    FROM legacy_import_batches b WHERE b.doctor_id=${BigInt(doctorId)} AND status='complete'
    ORDER BY id DESC`;
}

export async function getLegacyBatch(doctorId: number, batchId: string) {
  const rows = await prisma.$queryRaw<ArchiveBatch[]>`SELECT id::text AS id, 'Medical records' AS "sourceName",
    source_created_at AS "sourceCreatedAt", stats, imported_at::text AS "importedAt"
    , native_completed_at::text AS "nativeCompletedAt", metadata->'approval' AS approval
    FROM legacy_import_batches WHERE doctor_id=${BigInt(doctorId)} AND id=${BigInt(batchId)} AND status='complete'`;
  return rows[0] ?? null;
}

export type ArchiveFilter = {
  entity?: LegacyEntity; patientId?: string; q?: string;
  reason?: string;
  withMedicines?: boolean; year?: number;
  state?: ArchiveState; page: number; pageSize: number;
};

export async function readLegacyRecords(doctorId: number, batchId: string, filter: ArchiveFilter): Promise<ArchivePage> {
  const scope = Prisma.sql`doctor_id=${BigInt(doctorId)} AND batch_id=${BigInt(batchId)}`;
  const where = Prisma.sql`${scope}
    ${filter.entity ? Prisma.sql`AND entity=${filter.entity}` : Prisma.empty}
    ${filter.entity === "VitalSigns" ? Prisma.sql`AND NOT (review_reasons ? 'empty_vitals')` : Prisma.empty}
    ${filter.patientId ? Prisma.sql`AND source_patient_id=${filter.patientId}` : Prisma.empty}
    ${filter.state ? Prisma.sql`AND state=${filter.state} ${filter.state === "review" ? Prisma.sql`AND review_decision IS NULL` : Prisma.empty}` : Prisma.sql`AND source_deleted=false`}
    ${filter.withMedicines ? Prisma.sql`AND EXISTS(SELECT 1 FROM legacy_clinical_records m WHERE m.doctor_id=${BigInt(doctorId)} AND m.batch_id=${BigInt(batchId)} AND m.entity='PrescribedDrugs' AND m.source_deleted=false AND m.source_visit_id=legacy_clinical_records.source_id)` : Prisma.empty}
    ${filter.year ? Prisma.sql`AND event_day >= ${`${filter.year}-01-01`}::date AND event_day < ${`${filter.year + 1}-01-01`}::date` : Prisma.empty}
    ${filter.reason ? Prisma.sql`AND review_reasons ? ${filter.reason}` : Prisma.empty}
    ${filter.q ? Prisma.sql`AND (strpos(lower(search_text), lower(${filter.q})) > 0 OR strpos(coalesce(source_date,''), ${filter.q}) > 0)` : Prisma.empty}`;
  const patientOrder = filter.entity === "Patients";
  const [rows, totals] = await Promise.all([
    prisma.$queryRaw<ArchiveRecord[]>(Prisma.sql`SELECT ${recordColumns} FROM legacy_clinical_records
      WHERE ${where} ORDER BY ${patientOrder ? Prisma.sql`display_name ASC, id ASC` : Prisma.sql`event_day DESC NULLS LAST, id DESC`}
      LIMIT ${filter.pageSize} OFFSET ${(filter.page - 1) * filter.pageSize}`),
    prisma.$queryRaw<Array<{ total: string }>>(Prisma.sql`SELECT count(*)::text AS total FROM legacy_clinical_records WHERE ${where}`),
  ]);
  const result: ArchivePage = { rows, total: Number(totals[0]?.total ?? 0), page: filter.page, pageSize: filter.pageSize };
  if (filter.entity === "Patients" && rows.length) {
    const details = await prisma.$queryRaw<Array<{ patient: string; visits: number; lastVisit: string | null }>>(Prisma.sql`SELECT source_patient_id AS patient, count(*)::int AS visits, to_char(max(event_day),'YYYY-MM-DD') AS "lastVisit"
      FROM legacy_clinical_records WHERE ${scope} AND entity='Visits' AND source_deleted=false
      AND source_patient_id IN (${Prisma.join(rows.map((r) => r.sourceId))}) GROUP BY source_patient_id`);
    result.patientStats = Object.fromEntries(details.map((r) => [r.patient, { visits: r.visits, lastVisit: r.lastVisit }]));
  }
  if (filter.patientId) {
    const [patients, counts, references] = await Promise.all([
      prisma.$queryRaw<ArchiveRecord[]>(Prisma.sql`SELECT ${recordColumns} FROM legacy_clinical_records
        WHERE ${scope} AND entity='Patients' AND source_id=${filter.patientId} LIMIT 1`),
      prisma.$queryRaw<Array<{ entity: string; n: string }>>(Prisma.sql`SELECT entity, count(*)::text AS n
        FROM legacy_clinical_records WHERE ${scope} AND source_patient_id=${filter.patientId}
        AND source_deleted=false AND (entity<>'VitalSigns' OR NOT (review_reasons ? 'empty_vitals')) GROUP BY entity`),
      prisma.$queryRaw<Array<{ entity: string; sourceId: string; presentation: ArchiveRecord["presentation"] }>>(Prisma.sql`SELECT entity, source_id AS "sourceId", presentation
        FROM legacy_clinical_records WHERE ${scope} AND entity IN ('Icd10Diagnoses','ReferringDoctors')`),
    ]);
    result.patient = patients[0];
    result.counts = Object.fromEntries(counts.map((c) => [c.entity, Number(c.n)]));
    const prescriptions = await prisma.$queryRaw<Array<{ n: number }>>(Prisma.sql`SELECT count(DISTINCT source_visit_id)::int AS n FROM legacy_clinical_records
      WHERE ${scope} AND source_patient_id=${filter.patientId} AND entity='PrescribedDrugs' AND source_deleted=false`);
    result.counts.Prescriptions = prescriptions[0]?.n ?? 0;
    result.references = Object.fromEntries(references.map((r) => [
      `${r.entity}:${r.sourceId}`, r.entity === "Icd10Diagnoses"
        ? [r.presentation.fields.Code, r.presentation.fields.Description].filter(Boolean).join(" — ")
        : String(r.presentation.fields.FullName ?? ""),
    ]));
  }
  if (filter.entity === "Visits" && rows.length) {
    const related = await prisma.$queryRaw<ArchiveRecord[]>(Prisma.sql`SELECT ${recordColumns}
      FROM legacy_clinical_records WHERE ${scope} AND entity IN ('PrescribedDrugs','VitalSigns','LabWorkups') AND source_deleted=false
      AND source_visit_id IN (${Prisma.join(rows.map((r) => r.sourceId))}) ORDER BY id`);
    result.drugs = related.filter((r) => r.entity === "PrescribedDrugs");
    result.observations = related.filter((r) => r.entity === "VitalSigns" && !r.reviewReasons.includes("empty_vitals"));
    result.labResults = related.filter((r) => r.entity === "LabWorkups");
  }
  if (filter.entity === "PrescriptionListTemplates" && rows.length) {
    result.templateItems = await prisma.$queryRaw<ArchiveRecord[]>(Prisma.sql`SELECT ${recordColumns} FROM legacy_clinical_records
      WHERE ${scope} AND entity='PrescriptionListTemplateItems' AND source_deleted=false
      AND presentation->'fields'->>'PrescriptionListTemplateId' IN (${Prisma.join(rows.map((r) => r.sourceId))}) ORDER BY id`);
  }
  return result;
}
