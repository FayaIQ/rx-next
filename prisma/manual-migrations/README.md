# Manual SQL migrations

Run these **in order** on existing databases that were created before Prisma Migrate was adopted.
Fresh installs should use `npx prisma db push` (or `prisma migrate deploy` once migrations are formalized).

1. `add-visit-queue.sql` — visit status + checked_in_at on appointments
2. `merge-arrived-into-waiting.sql` — collapse legacy `arrived` into `waiting`
3. `link-prescriptions-to-finance.sql` — snapshot consultation fees and link each prescription to one finance transaction
4. Other files in this folder as documented in each file header

After applying SQL, always run `npx prisma generate`.
