-- Doctor onboarding and the academic prescription header.
-- Safe to run on databases that may already contain some or all columns.
ALTER TABLE recipe_settings
  ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS professional_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS license_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS services TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT TRUE;
