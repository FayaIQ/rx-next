-- Preserve old findings and snapshot the currency previously used by each clinic.
BEGIN;
ALTER TABLE dental_tooth_records ADD COLUMN IF NOT EXISTS statuses TEXT[] NOT NULL DEFAULT '{}';
UPDATE dental_tooth_records SET statuses = ARRAY[status] WHERE cardinality(statuses) = 0;
-- Backfill only on first installation, so rerunning never relabels existing money.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance_transactions' AND column_name = 'currency') THEN
    ALTER TABLE finance_transactions ADD COLUMN currency VARCHAR(8) NOT NULL DEFAULT 'IQD';
    UPDATE finance_transactions AS t SET currency = CASE WHEN s.currency = 'USD' THEN 'USD' ELSE 'IQD' END
      FROM clinic_finance_settings AS s WHERE t.doctor_id = s.doctor_id;
  END IF;
END $$;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS consultation_currency VARCHAR(8) NOT NULL DEFAULT 'IQD';
UPDATE prescriptions AS p SET consultation_currency = t.currency
FROM finance_transactions AS t WHERE t.prescription_id = p.id AND p.consultation_currency <> t.currency;
COMMIT;
