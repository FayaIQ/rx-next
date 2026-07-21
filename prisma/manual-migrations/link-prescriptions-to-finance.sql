-- Link every prescription to a snapshotted consultation fee and one ledger row.
-- Existing prescriptions retain zero because their historical fee cannot be inferred safely.

ALTER TABLE "prescriptions"
  ADD COLUMN IF NOT EXISTS "consultation_fee" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "consultation_fee_waived" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "finance_transactions"
  ADD COLUMN IF NOT EXISTS "prescription_id" BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS
  "finance_transactions_prescription_id_key"
  ON "finance_transactions" ("prescription_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'finance_transactions_prescription_id_foreign'
  ) THEN
    ALTER TABLE "finance_transactions"
      ADD CONSTRAINT "finance_transactions_prescription_id_foreign"
      FOREIGN KEY ("prescription_id")
      REFERENCES "prescriptions"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION;
  END IF;
END $$;
