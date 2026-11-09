# Treatment plan pricing

New plans offer one price for the whole plan (the default in the UI), or independent prices and optional initial payments for each session. Blank prices remain unpriced; zero is a free treatment.

For whole-plan pricing, `treatment_plans.fee` is the single charge and receipts reference `finance_transactions.treatment_plan_id`. Sessions carry no separate charges. Billing from any session, including clinical completion, uses the same plan account. Adding or completing a session does not add another charge. Completion defaults to no payment for these plans; the clinician chooses an actual receipt explicitly.

For independent pricing, each session retains its own fee and receipts. Existing plans default to `per_session`; their fees and receipts are unchanged. This release does not convert historical plans or change a saved plan's pricing mode.

Patient accounts, debt badges, clinic debt totals, and payment allocation include both account types. Receipts are income only when money is received. Amount/currency checks, request IDs, parent row locks, and deletion guards apply to plan payments too. Financial writes require an internet connection.

## Release order

Apply the additive migration **before** starting the updated application:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/manual-migrations/add-plan-billing.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/manual-migrations/add-multi-tooth-plans.sql
pnpm exec prisma generate
pnpm build
```

The migration can be replayed. No historical accounting values are rewritten. Keep the added columns if rolling application code back, so new plan receipts are preserved.

## Verification

On an isolated local PostgreSQL database with the current schema:

```sh
RUN_BILLING_DB_TESTS=1 pnpm exec tsx --test src/lib/__tests__/session-billing.test.ts src/lib/__tests__/plan-billing.test.ts src/lib/__tests__/multi-tooth-treatment.test.ts
pnpm exec tsc --noEmit
pnpm lint
```

`DATABASE_URL` must point to the test database. The plan integration test requires a localhost address. Tests cover shared balances, per-session prices, repeat requests, competing receipts, tenant isolation, account totals, income, protected deletion, payment removal, and transaction rollback.

## Shared plans for multiple teeth

The chart offers **Select multiple teeth**. Every clicked tooth is highlighted; the selected set appears beside the chart with removable chips. Creating a plan from this selection stores one plan, one session sequence, and one account for the entire group. Both pricing modes apply to this one sequence; prices are not multiplied by the tooth count.

`tooth_fdis` stores the full selection. `tooth_fdi` retains a primary tooth for older clients. Single-tooth plans are backfilled by the additive `add-multi-tooth-plans.sql` migration; whole-mouth plans keep an empty array and a null primary tooth. Old cached plans fall back to the primary tooth. Fetching any included tooth returns the same shared plan. Chart markers, completion progress, patient files, appointment notes, and account labels show every included tooth. Shared chart links use `?teeth=11,12,13`.

## Actual completion dates in the calendar

Completed sessions use `performedAt` for the linked appointment timestamp and its Baghdad calendar day. The original `scheduledDate` and `scheduledTime` remain available on the session. A completed session without a prior scheduled appointment gets one calendar entry on its actual day. Updating the completion timestamp, including via offline synchronization, refreshes the same appointment and clinic visit. Payment receipt dates remain independent.

The completion input, calendar times, today indicator, and clinical timeline consistently use Baghdad time. The regression reproduces a session scheduled on November 9 but performed on November 8 at 00:30 Baghdad: its calendar entry and visit date must be November 8, while the original planned date remains November 9. It also covers edited timestamps, replay, and previously unscheduled completion. Existing historical rows are not rewritten by deploying this code; they need a separate verified resynchronization.
