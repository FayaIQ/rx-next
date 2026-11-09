BEGIN;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS tooth_fdis INTEGER[] NOT NULL DEFAULT '{}';
-- Keep the primary tooth for older clients and populate the complete selection.
UPDATE treatment_plans SET tooth_fdis = ARRAY[tooth_fdi]
WHERE tooth_fdi IS NOT NULL AND cardinality(tooth_fdis) = 0;
CREATE INDEX IF NOT EXISTS treatment_plans_tooth_fdis_idx ON treatment_plans USING GIN(tooth_fdis);
COMMIT;
