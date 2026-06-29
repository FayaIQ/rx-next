-- Session ↔ appointment link, visit log, tooth images

ALTER TABLE treatment_sessions
  ADD COLUMN IF NOT EXISTS appointment_id BIGINT UNIQUE;

DO $$ BEGIN
  ALTER TABLE treatment_sessions
    ADD CONSTRAINT treatment_sessions_appointment_id_foreign
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS patient_visits (
  id BIGSERIAL PRIMARY KEY,
  doctor_id BIGINT NOT NULL,
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  summary VARCHAR(500),
  notes TEXT,
  appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
  prescription_id BIGINT REFERENCES prescriptions(id) ON DELETE SET NULL,
  treatment_session_id BIGINT UNIQUE REFERENCES treatment_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP(0) DEFAULT NOW(),
  updated_at TIMESTAMP(0) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS patient_visits_doctor_patient_date_index
  ON patient_visits (doctor_id, patient_id, visit_date DESC);

CREATE TABLE IF NOT EXISTS dental_tooth_images (
  id BIGSERIAL PRIMARY KEY,
  doctor_id BIGINT NOT NULL,
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tooth_fdi INT NOT NULL,
  image_url VARCHAR(512) NOT NULL,
  image_type VARCHAR(32) NOT NULL DEFAULT 'photo',
  caption TEXT,
  created_at TIMESTAMP(0) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dental_tooth_images_patient_tooth_index
  ON dental_tooth_images (patient_id, tooth_fdi);
