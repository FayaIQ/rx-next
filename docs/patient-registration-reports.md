# Patient registration dates and monthly reports

Patient creation previously omitted `created_at`, while the nullable database column had no default. Monthly reports filter by this field, so undated registrations are excluded from the new-patient count.

Online registration now records the server creation time explicitly. Offline synchronization retains the original queue creation timestamp rather than the later synchronization time. Future or invalid device timestamps fall back to server receipt time. Local caches retain creation time separately from the last update. Successful saves and synchronization invalidate reports, and reopening reports fetches fresh data.

Monthly timestamp filters use Baghdad month boundaries, with an exclusive start of the next month. Date-only fields such as payment receipt dates retain calendar-date boundaries.

Apply this additive migration before deploying the updated application:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/manual-migrations/add-patient-created-at-default.sql
pnpm exec prisma generate
```

The migration only sets a default for future inserts. It does not assign dates to historical NULL records. Last modification time is not evidence of registration time; historical corrections require a verified original source.

Validation on an isolated local database:

```sh
RUN_DB_TESTS=1 pnpm exec tsx --test src/lib/__tests__/patient-registration.test.ts
```

Tests cover new registrations appearing in monthly counts, offline creation timestamps, edits to old patients not counting as new registrations, unknown historical dates, tenant isolation, and Baghdad month boundaries. Browser verification registers a test patient and observes the new-patient card increasing from zero to one.
