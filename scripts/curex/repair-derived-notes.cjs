// Refresh derived display text only. Source JSON, dates and authored native edits are protected.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');
const { persistedStats } = require('./import.cjs');
async function repairDerivedNotes(db, { doctorId, sourceSha256, visitsFile, backupDirectory }) {
  await fsp.mkdir(backupDirectory,{recursive:true,mode:0o700});
  await db.query('BEGIN');
  try {
    const b=(await db.query("SELECT id FROM legacy_import_batches WHERE doctor_id=$1 AND source_sha256=$2 AND status='complete' FOR UPDATE",[doctorId,sourceSha256])).rows[0]; assert(b);
    const rawBefore=await persistedStats(db,b.id,doctorId);
    const before=(await db.query("SELECT r.id::text,r.source_id,r.raw_sha256,r.presentation->>'noteText' AS note,v.id::text AS visit_id,v.notes FROM legacy_clinical_records r LEFT JOIN legacy_native_links l ON l.batch_id=r.batch_id AND l.source_entity='Visits' AND l.source_id=r.source_id AND l.target_table='patient_visits' LEFT JOIN patient_visits v ON v.id=l.target_id AND v.doctor_id=r.doctor_id WHERE r.doctor_id=$1 AND r.batch_id=$2 AND r.entity='Visits'",[doctorId,b.id])).rows;
    await fsp.writeFile(path.join(backupDirectory,'before.json'),JSON.stringify(before),{flag:'wx',mode:0o600});
    const indexed=new Map(before.map(r=>[r.source_id,r])); let changed=0,native=0;
    for await (const line of readline.createInterface({input:fs.createReadStream(visitsFile),crlfDelay:Infinity})) {
      const r=JSON.parse(line); if(r.presentation.noteFormat!=='plain-text-v2') continue;
      const old=indexed.get(r.sourceId); assert(old);assert.equal(old.raw_sha256,r.rawSha256);
      const note=r.presentation.noteText;assert.equal(typeof note,'string');
      if(note===old.note)continue;
      assert(/^\s*\{\\u?rtf/i.test(old.note),'Only encoded RTF display text may be replaced');
      await db.query("UPDATE legacy_clinical_records SET presentation=jsonb_set(jsonb_set(presentation,'{noteText}',to_jsonb($2::text)),'{noteFormat}','\"plain-text-v2\"'),search_text=$3 WHERE id=$1",[old.id,note,r.searchText]);
      changed++;
      if(old.visit_id) {
        assert.equal(old.notes,old.note,'Native clinical edits must not be overwritten');
        native+=(await db.query('UPDATE patient_visits SET notes=$2 WHERE id=$1 AND doctor_id=$3',[old.visit_id,note||null,doctorId])).rowCount;
      }
    }
    assert.deepEqual(await persistedStats(db,b.id,doctorId),rawBefore);
    await db.query('COMMIT');
    const result={doctorId,changed,native,originalSourceUnchanged:true};
    await fsp.writeFile(path.join(backupDirectory,'result.json'),JSON.stringify(result),{flag:'wx',mode:0o600});return result;
  }catch(e){await db.query('ROLLBACK');throw e;}
}
module.exports={repairDerivedNotes};
