BEGIN;
ALTER TABLE legacy_import_batches ADD COLUMN IF NOT EXISTS native_completed_at timestamptz;
ALTER TABLE legacy_import_batches ADD COLUMN IF NOT EXISTS native_counts jsonb;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS time_unknown boolean NOT NULL DEFAULT false;
ALTER TABLE prescription_items ADD COLUMN IF NOT EXISTS notes text;
CREATE TABLE IF NOT EXISTS legacy_native_links (
  id bigserial PRIMARY KEY,
  doctor_id bigint NOT NULL,
  batch_id bigint NOT NULL,
  source_entity varchar(64) NOT NULL,
  source_id varchar(80) NOT NULL,
  target_table varchar(64) NOT NULL,
  target_id bigint NOT NULL,
  FOREIGN KEY(batch_id,doctor_id) REFERENCES legacy_import_batches(id,doctor_id) ON DELETE CASCADE,
  UNIQUE(batch_id,source_entity,source_id,target_table),
  UNIQUE(target_table,target_id)
);
CREATE INDEX IF NOT EXISTS legacy_native_target_idx ON legacy_native_links(doctor_id,target_table,target_id);
COMMIT;
