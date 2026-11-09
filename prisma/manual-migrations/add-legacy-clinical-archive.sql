-- Immutable source records. This migration does not change clinical or financial rows.
BEGIN;
CREATE TABLE IF NOT EXISTS legacy_import_batches (
  id bigserial PRIMARY KEY,
  doctor_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_sha256 varchar(64) NOT NULL,
  source_name varchar(255) NOT NULL,
  source_created_at varchar(40),
  status varchar(16) NOT NULL DEFAULT 'staging' CHECK (status IN ('staging', 'complete')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (doctor_id, source_sha256),
  UNIQUE (id, doctor_id)
);
CREATE TABLE IF NOT EXISTS legacy_clinical_records (
  id bigserial PRIMARY KEY,
  doctor_id bigint NOT NULL,
  batch_id bigint NOT NULL,
  entity varchar(64) NOT NULL,
  source_id varchar(80) NOT NULL,
  source_patient_id varchar(80),
  source_visit_id varchar(80),
  source_date varchar(40),
  event_day date,
  display_name text NOT NULL DEFAULT '',
  search_text text NOT NULL DEFAULT '',
  source_deleted boolean NOT NULL DEFAULT false,
  state varchar(16) NOT NULL CHECK (state IN ('ready', 'review', 'excluded')),
  review_reasons jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(review_reasons) = 'array'),
  raw_json text NOT NULL CHECK (jsonb_typeof(raw_json::jsonb) = 'object'),
  raw_sha256 varchar(64) NOT NULL,
  presentation jsonb NOT NULL DEFAULT '{}'::jsonb,
  FOREIGN KEY (batch_id, doctor_id) REFERENCES legacy_import_batches(id, doctor_id) ON DELETE CASCADE,
  UNIQUE (batch_id, entity, source_id)
);
ALTER TABLE legacy_clinical_records ADD COLUMN IF NOT EXISTS review_decision varchar(32);
ALTER TABLE legacy_clinical_records ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE legacy_clinical_records ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE legacy_clinical_records ADD COLUMN IF NOT EXISTS review_operation varchar(36);
CREATE INDEX IF NOT EXISTS legacy_archive_patient_idx ON legacy_clinical_records
  (doctor_id, batch_id, entity, source_patient_id, event_day DESC, id);
CREATE INDEX IF NOT EXISTS legacy_archive_visit_idx ON legacy_clinical_records
  (doctor_id, batch_id, entity, source_visit_id);
CREATE INDEX IF NOT EXISTS legacy_archive_state_idx ON legacy_clinical_records
  (doctor_id, batch_id, state, entity, id);
CREATE INDEX IF NOT EXISTS legacy_archive_name_idx ON legacy_clinical_records
  (doctor_id, batch_id, entity, display_name, id);
COMMIT;
