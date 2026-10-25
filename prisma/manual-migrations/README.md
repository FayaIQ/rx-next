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

10. `add-session-templates-medical-summary.sql` — doctor-scoped treatment-session note templates and the patient's chronic-conditions summary. Additive and repeatable; apply before starting the updated app, then regenerate Prisma. Existing session notes stay unchanged when templates are edited or deleted. `/api/health` checks these fields and the template table before marking this release ready.
