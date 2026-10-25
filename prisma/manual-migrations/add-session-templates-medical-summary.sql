BEGIN;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS chronic_conditions TEXT;
CREATE TABLE IF NOT EXISTS dental_session_templates (
  id BIGSERIAL PRIMARY KEY,
  doctor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  treatment_type VARCHAR(40),
  notes TEXT NOT NULL,
  created_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dental_session_templates_doctor_name_unique UNIQUE (doctor_id, name)
);
COMMIT;
