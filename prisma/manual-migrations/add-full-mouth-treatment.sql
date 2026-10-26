-- Whole-mouth treatments have no individual tooth. Existing plans are unchanged.
-- Apply before deploying this release, then regenerate Prisma.
ALTER TABLE treatment_plans ALTER COLUMN tooth_fdi DROP NOT NULL;
