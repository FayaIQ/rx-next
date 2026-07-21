-- Clinic finances: default fees + income/expense ledger
CREATE TABLE IF NOT EXISTS clinic_finance_settings (
  id BIGSERIAL PRIMARY KEY,
  doctor_id BIGINT NOT NULL UNIQUE,
  consultation_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  follow_up_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  procedure_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'IQD',
  created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT clinic_finance_settings_doctor_id_foreign
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id BIGSERIAL PRIMARY KEY,
  doctor_id BIGINT NOT NULL,
  patient_id BIGINT NULL,
  appointment_id BIGINT NULL,
  type VARCHAR(16) NOT NULL,
  category VARCHAR(64) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(32) NULL,
  description TEXT NULL,
  transaction_date DATE NOT NULL,
  created_by_id BIGINT NULL,
  created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT finance_transactions_doctor_id_foreign
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT finance_transactions_patient_id_foreign
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  CONSTRAINT finance_transactions_appointment_id_foreign
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT finance_transactions_created_by_id_foreign
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS finance_transactions_doctor_date_index
  ON finance_transactions (doctor_id, transaction_date);

CREATE INDEX IF NOT EXISTS finance_transactions_doctor_type_index
  ON finance_transactions (doctor_id, type);
