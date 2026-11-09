BEGIN;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(16) NOT NULL DEFAULT 'per_session';
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS fee DECIMAL(12,2);
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS currency VARCHAR(8) NOT NULL DEFAULT 'IQD';
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS treatment_plan_id BIGINT REFERENCES treatment_plans(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS finance_transactions_treatment_plan_id_idx ON finance_transactions(treatment_plan_id);
-- Existing plans and session payments retain their original accounting.
DO $$ BEGIN
  ALTER TABLE treatment_plans ADD CONSTRAINT treatment_plans_pricing_mode_check CHECK (pricing_mode IN ('per_session', 'plan'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE finance_transactions ADD CONSTRAINT finance_transactions_billing_target_check CHECK (treatment_plan_id IS NULL OR treatment_session_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMIT;
