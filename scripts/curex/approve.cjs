// Administrative acceptance as-is. Original values, quality reasons and deletion flags are immutable.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { existingClinical, persistedStats } = require("./import.cjs");

async function approveAsIs(db, { doctorId, protectedDoctorId, sourceSha256, note, backupDirectory, originalAccount=false, expectedPhone }) {
  assert(Number.isSafeInteger(doctorId) && doctorId > 0 );
  assert(/^[a-f0-9]{64}$/.test(sourceSha256));
  assert(note && backupDirectory);
  const operation = randomUUID();
  await fs.mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  await fs.chmod(backupDirectory, 0o700);
  const save = async (name, value) => {
    const f = await fs.open(path.join(backupDirectory, name), "wx", 0o600);
    try { await f.writeFile(JSON.stringify(value, null, 2)); await f.sync(); } finally { await f.close(); }
  };
  await db.query("BEGIN");
  let transaction = true;
  try {
    await db.query("SET LOCAL TIME ZONE 'UTC'");
    const account = (await db.query("SELECT a.account_mode,u.active_session_id,u.phone_number,u.type FROM clinic_acquisitions a JOIN users u ON u.id=a.doctor_id WHERE a.doctor_id=$1", [doctorId])).rows[0];
    require("./target-guard.cjs").assertTarget(account, {doctorId,protectedDoctorId,originalAccount,expectedPhone});
    const batch = (await db.query("SELECT id::text,stats,metadata FROM legacy_import_batches WHERE doctor_id=$1 AND source_sha256=$2 AND status='complete' FOR UPDATE", [doctorId, sourceSha256])).rows[0];
    assert(batch, "Expected completed dataset was not found");
    const before = await existingClinical(db, doctorId);
    const beforeStats = await persistedStats(db, batch.id, doctorId);
    const pending = (await db.query("SELECT id::text FROM legacy_clinical_records WHERE doctor_id=$1 AND batch_id=$2 AND state='review' AND source_deleted=false AND review_decision IS NULL ORDER BY id", [doctorId, batch.id])).rows;
    if (!pending.length) {
      await db.query("ROLLBACK"); transaction = false;
      return { replayed: true, batchId: batch.id, approved: batch.metadata.approval?.count ?? 0 };
    }
    await save("before.json", { operation, doctorId, batchId: batch.id, sourceSha256, note, ids: pending.map((r) => r.id), stats: beforeStats, existingClinical: before });
    const changed = await db.query("UPDATE legacy_clinical_records SET review_decision='accepted_as_is',reviewed_at=CURRENT_TIMESTAMP,review_note=$3,review_operation=$4 WHERE doctor_id=$1 AND batch_id=$2 AND state='review' AND source_deleted=false AND review_decision IS NULL", [doctorId, batch.id, note, operation]);
    assert.equal(changed.rowCount, pending.length);
    const approval = (await db.query("SELECT count(*)::int AS count,max(reviewed_at)::text AS at FROM legacy_clinical_records WHERE doctor_id=$1 AND batch_id=$2 AND review_decision='accepted_as_is'", [doctorId, batch.id])).rows[0];
    await db.query("UPDATE legacy_import_batches SET metadata=jsonb_set(metadata,'{approval}',$3::jsonb) WHERE doctor_id=$1 AND id=$2", [doctorId, batch.id, JSON.stringify({ ...approval, note, decision: "accepted_as_is" })]);
    assert.deepEqual(await persistedStats(db, batch.id, doctorId), beforeStats, "Source data or classification changed");
    assert.deepEqual(await existingClinical(db, doctorId), before, "Existing clinical or financial rows changed");
    await db.query("COMMIT"); transaction = false;
    const result = { operation, doctorId, batchId: batch.id, approved: approval.count, originalRecordsUnchanged: true, existingClinicalUnchanged: true };
    await save("result.json", result);
    return result;
  } catch (error) { if (transaction) await db.query("ROLLBACK"); throw error; }
}
module.exports = { approveAsIs };
