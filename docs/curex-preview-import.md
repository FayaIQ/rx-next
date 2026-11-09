# Private historical medical-data import

Preview defaults to a separate password-protected test clinic. A subsequent explicitly authorized original-account import requires the original-account option, the exact doctor ID and phone identity, an additive merge, a durable existing-row snapshot, collision checks, and verification that all previous rows are unchanged. Public demo accounts are rejected.

## Preservation and acceptance

The source backup remains untouched. Exported JSON preserves original values, NULLs, decimal strings, XML notes, timestamps and deletion flags. SQL Server UTF-16 hashes, export UTF-8 hashes and file hashes are checked before import, then stored record hashes and counts are verified inside the transaction. Original JSON is private preservation data; the product displays curated medical fields without source branding, raw JSON or technical enum codes.

`export.py` reads only the restored source. `import.cjs` first stores the immutable snapshot. `approve.cjs` records explicit administrative acceptance in separate columns, keeping original quality flags and values unchanged. Acceptance never fabricates missing or invalid information.

## Native records

After explicit authorization, `materialize.cjs` converts an accepted snapshot into ordinary patients, visits, prescriptions, medicines and historical appointments in an **empty private test clinic**, or additively in an explicitly authorized original clinic. It does not invoke billing services. Existing clinical rows are never overwritten. Source-deleted records remain excluded. Prescription chronology uses the parent visit date, rather than a later medicine migration timestamp.

Original local wall-clock timestamps are interpreted in Asia/Baghdad and stored as UTC. Date-only birthdays, visit dates and appointment booking dates retain their original calendar day. Seven-digit fractions are retained in the immutable source; canonical timestamps are truncated before PostgreSQL conversion to avoid rounding into the next day. Unknown sex stays unspecified; invalid contact placeholders are not used as real contact numbers; original values remain preserved. Missing appointment times are marked unknown and shown without a fabricated clock time. Historical appointment status makes no claim about attendance or cancellation and is excluded from cancellation reports.

Native links associate every generated record with its original record. Labs, vital signs, longitudinal notes, chronic conditions, diagnoses and full paginated visit details appear inside the native patient file. Prescription templates and source-only information remain available in the curated medical-record view. No subscription payment, revenue, debt, treatment plan or treatment session is created by materialization. Existing rows remain unchanged.

## Operations

Apply the two additive SQL migrations before deployment:

- `prisma/manual-migrations/add-legacy-clinical-archive.sql`
- `prisma/manual-migrations/add-native-history-import.sql`

Run `create-preview.cjs` with a distinct test-login identifier and a protected original owner. Random credentials and operation backups must be stored outside Git in private directories (0700), with files mode 0600. The preview receives a normal 14-day test trial. Import defaults to dry-run, checks target identity and an explicit protected original-doctor ID, and applies atomically. Replays do not create duplicates. Each phase saves private before/verification/result receipts. For an original account, pass `originalAccount: true`, set `protectedDoctorId` to the same explicitly authorized original doctor ID, and provide `expectedPhone` in every operation. Source patients that might match existing names or phone numbers stop materialization for review; no automatic patient merge or overwrite is allowed. Existing prescription numbers are preserved and new numbers start after the current maximum. Never commit source files, clinical exports or credentials.

Offline rich-text preparation uses `decode-rich-notes.swift` and the platform RTF reader to decode embedded legacy rich text, including Unicode, font tables and paragraph breaks. `repair-derived-notes.cjs` can refresh only derived display text and matching unedited native notes, with before backups and immutable source-hash verification. Original documents are never changed.

The regular `/patients` page shows native patients after materialization. `/patients/imports` remains a curated source-history view with no raw-data disclosure or mutation API. All reads require an authenticated subscribed clinic, scope queries to that clinic, and use private uncached responses.

## Verification

Run `RUN_DB_TESTS=1 DATABASE_URL=LOCAL_TEST_URL pnpm test:curex`, lint, type checking and the normal test/build checks. Tests cover source integrity, XML decoding, wrong-tenant access, protected targets, public-demo rejection, rollback, replay safety, unknown values, precise historical calendar days, and unchanged finances. Rehearse the complete dataset locally, verify actual browser/API/database behavior, then apply to the specifically authorized hosted account and verify all prior rows remain unchanged.
