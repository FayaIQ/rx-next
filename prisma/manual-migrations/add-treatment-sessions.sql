-- Multi-session treatment plans per tooth (e.g. root canal in 3 visits)
CREATE TABLE IF NOT EXISTS treatment_plans (
  id BIGSERIAL PRIMARY KEY,
  doctor_id BIGINT NOT NULL,
  patient_id BIGINT NOT NULL,
  tooth_fdi INT NOT NULL,
  treatment_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NULL,
  total_sessions INT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT treatment_plans_patient_id_foreign
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS treatment_sessions (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT NOT NULL,
  doctor_id BIGINT NOT NULL,
  patient_id BIGINT NOT NULL,
  session_number INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'planned',
  scheduled_date DATE NULL,
  performed_at TIMESTAMP(0) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT treatment_sessions_plan_id_foreign
    FOREIGN KEY (plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE,
  CONSTRAINT treatment_sessions_patient_id_foreign
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT treatment_sessions_plan_session_unique UNIQUE (plan_id, session_number)
);

CREATE INDEX IF NOT EXISTS treatment_plans_doctor_patient_index
  ON treatment_plans (doctor_id, patient_id);

CREATE INDEX IF NOT EXISTS treatment_plans_patient_tooth_index
  ON treatment_plans (patient_id, tooth_fdi);

CREATE INDEX IF NOT EXISTS treatment_sessions_doctor_scheduled_index
  ON treatment_sessions (doctor_id, scheduled_date);

CREATE INDEX IF NOT EXISTS treatment_sessions_doctor_status_index
  ON treatment_sessions (doctor_id, status);
