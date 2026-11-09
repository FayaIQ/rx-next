# Manual SQL migrations

Run these **in order** on existing databases that were created before Prisma Migrate was adopted.
Fresh installs should use `npx prisma db push` (or `prisma migrate deploy` once migrations are formalized).

1. `add-visit-queue.sql` — visit status + checked_in_at on appointments
2. `merge-arrived-into-waiting.sql` — collapse legacy `arrived` into `waiting`
3. `link-prescriptions-to-finance.sql` — snapshot consultation fees and link each prescription to one finance transaction
4. Other files in this folder as documented in each file header
5. `add-clinic-tasks.sql` — internal task assignments, comments, and activity history
6. `add-doctor-onboarding-fields.sql` — doctor onboarding data and academic prescription header fields

After applying SQL, always run `npx prisma generate`.

7. `add-dental-findings-and-finance-currency.sql` — multiple tooth findings and currency snapshots for transactions/prescriptions. Apply before starting the updated app, then regenerate Prisma. Monetary reports group or filter by currency; no exchange-rate conversion is performed.
8. `add-session-scheduled-time.sql` — editable treatment-session times. Requires the treatment tables and appointment links. Apply before starting the updated app, then regenerate Prisma. Existing linked appointments keep their Baghdad clock times; new sessions default to the current time.

9. `add-product-measurement.sql` — acquisition and anonymous visit funnels, real clinical activation and retention, explicitly confirmed payments, verified campaign spend, performance measurements, supporting indexes, and treatment-plan request idempotency. Additive and repeatable; apply before starting this version, then regenerate Prisma. Existing accounts and subscriptions are not backfilled with invented activity or payment. Keep `RX_ANALYTICS_TEST_MODE` unset in production; it is only for isolated local QA. New data appears in `/dashboard/acquisition`. Builds assign a deterministic source fingerprint to performance measurements. After deployment, `/api/health` must return HTTP 200 with the expected release fingerprint; it checks the required schema without returning account or clinical data.

10. `add-full-mouth-treatment.sql` — allow whole-mouth cleaning plans without an individual tooth. Only relaxes nullability; existing plans and sessions remain unchanged. Apply before deploying, then regenerate Prisma.

11. `add-session-billing.sql` — session prices and partial/full payments linked to income transactions. Apply before deploying and regenerate Prisma. Existing session prices stay NULL (unpriced), with no invented debts or historical payments. Debt is all-time, separated by currency; only actual payment transactions count as income. Priced sessions and plans cannot be deleted until their financial account is resolved. Recording a price explicitly adds the charge regardless of the clinical completion status. Payments require an online connection and a unique request ID, reused on retry.

12. `add-plan-billing.sql` — whole-plan pricing and plan receipts. Existing plans retain independent session pricing and all existing charges/payments. Apply before deploying the updated app.
13. `add-multi-tooth-plans.sql` — shared plans for selected teeth. Backfills each existing single-tooth plan's selection from its primary tooth; whole-mouth plans retain an empty selection.
14. `add-patient-created-at-default.sql` — default registration timestamps for future patients. Historical NULL registration dates remain unknown and are not backfilled from modification dates.

Regenerate Prisma after these migrations. Operational repair of historical session calendar entries is documented in `docs/session-calendar-repair.md`; it is a separate backed-up transaction, not an automatic deployment migration.
