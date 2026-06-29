-- Allergies, medications, patient portal

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS current_medications TEXT,
  ADD COLUMN IF NOT EXISTS portal_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS portal_instructions TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS patients_portal_token_unique
  ON patients (portal_token)
  WHERE portal_token IS NOT NULL;
