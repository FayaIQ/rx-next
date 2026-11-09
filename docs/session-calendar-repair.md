# Repair historical session calendar entries

Completed sessions use `performed_at` as the authoritative instant. Their appointment's `booking_date` is that instant's calendar day in `Asia/Baghdad`; `appointment_datetime` remains the UTC timestamp stored by Prisma.

Run the inspection first:

```sh
node scripts/repair-session-calendar.cjs
```

The script uses `DATABASE_URL` when set, otherwise the project `.env.local`. An optional `--doctor-id ID` restricts the repair to one clinic. Apply the reviewed repair with:

```sh
node scripts/repair-session-calendar.cjs --apply
```

The script locks the relevant records, checks clinic/patient ownership, and writes private, durable `before.json` and `after.json` backups under `~/.codex/backups/rx-session-calendar/` before committing. `result.json` records successful completion. These backups contain clinical records and are kept outside Git with directory mode `0700` and file mode `0600`.

The transaction corrects existing appointment dates/times, creates and links missing historical appointments, and aligns existing clinical visit dates/links. New historical appointments are inactive and marked `done` so they do not enter the waiting queue. Existing appointment notes and statuses, original session schedules and completion timestamps, and all financial records remain unchanged. Related plan timestamps are refreshed for offline synchronization. No extra clinical visits or analytics events are created. An ambiguous matching orphan appointment or ownership conflict stops the operation before writes; any failure during the transaction rolls it back.

The repair is idempotent. After applying, run the inspection again: `wrongdays`, `wrongtimes`, and `missingappointments` should be zero. Reload the calendar to fetch the corrected records. Deploy the application date fix separately to prevent later session synchronization from restoring the old scheduled date.

The database regression uses only an isolated local PostgreSQL database:

```sh
RUN_DB_TESTS=1 node --test scripts/repair-session-calendar.test.cjs
```

It verifies midnight conversion, preservation of clinical/financial records, idempotency, private backups, and rollback after a forced failure following appointment writes.
