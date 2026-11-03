BEGIN;
ALTER TABLE treatment_sessions ADD COLUMN IF NOT EXISTS fee DECIMAL(12,2);
ALTER TABLE treatment_sessions ADD COLUMN IF NOT EXISTS currency VARCHAR(8) NOT NULL DEFAULT 'IQD';
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS treatment_session_id BIGINT;
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS payment_request_id VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS finance_transactions_payment_request_id_key ON finance_transactions(payment_request_id);
CREATE INDEX IF NOT EXISTS finance_transactions_treatment_session_id_idx ON finance_transactions(treatment_session_id);
CREATE INDEX IF NOT EXISTS treatment_sessions_doctor_patient_index ON treatment_sessions(doctor_id, patient_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_transactions_treatment_session_id_fkey') THEN
    ALTER TABLE finance_transactions ADD CONSTRAINT finance_transactions_treatment_session_id_fkey FOREIGN KEY (treatment_session_id) REFERENCES treatment_sessions(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatment_sessions_fee_check') THEN
    ALTER TABLE treatment_sessions ADD CONSTRAINT treatment_sessions_fee_check CHECK (fee IS NULL OR fee >= 0);
  END IF;
END $$;
COMMIT;
