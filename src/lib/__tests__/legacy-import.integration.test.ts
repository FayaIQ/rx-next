import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, writeFile, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const local = process.env.RUN_DB_TESTS === "1" && /(?:localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL ?? "");
test("archive import is atomic, tenant-scoped, idempotent and cannot create financial or clinical changes", { skip: !local }, async () => {
  const { Client } = await import("pg");
  const { importArchive, verifyExport, existingClinical } = await import("../../../scripts/curex/import.cjs");
  const { createPreviewAccount } = await import("../../../scripts/curex/create-preview.cjs");
  const { approveAsIs } = await import("../../../scripts/curex/approve.cjs");
  const { readLegacyRecords, listLegacyBatches } = await import("../legacy-import/read");
  const { prisma } = await import("../prisma");
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const dir = await mkdtemp(path.join(os.tmpdir(), "rx-curex-test-"));
  const hash = (s: string, encoding?: BufferEncoding) => createHash("sha256").update(s, encoding).digest("hex");
  const phone = "+964700" + String(Date.now()).slice(-7);
  await db.connect();
  const ids: string[] = [];
  try {
    for (let n = 0; n < 2; n++) {
      const id = (await db.query("INSERT INTO users(name,phone_number,password,type) VALUES('Archive fixture',$1,'unused','doctor') RETURNING id::text", [phone + n])).rows[0].id;
      ids.push(id);
      await db.query("INSERT INTO clinic_acquisitions(doctor_id,practice_type,account_mode) VALUES($1,'general','test')", [id]);
    }
    const doctorId = Number(ids[0]), otherId = Number(ids[1]);
    const patientId = (await db.query("INSERT INTO patients(name,gender,doctor_id,created_at) VALUES('Existing fixture','male',$1,'2020-01-01') RETURNING id", [doctorId])).rows[0].id;
    await db.query("INSERT INTO finance_transactions(doctor_id,patient_id,type,category,amount,currency,transaction_date) VALUES($1,$2,'income','other',17,'IQD','2020-01-01')", [doctorId, patientId]);
    const originals = [
      { Id: 1, CreateDate: "2019-09-14T00:00:00.1234567", Name: "نص  محفوظ \n \" حرف ", Optional: null, Deleted: false },
      { Id: 2, CreateDate: "4111-08-19T00:00:00", Deleted: false },
      { Id: 3, CreateDate: "2020-01-01T00:00:00", Deleted: true },
    ];
    const rows = originals.map((original, index) => {
      const rawJson = JSON.stringify(original);
      return { entity: "Patients", sourceId: String(original.Id), sourcePatientId: String(original.Id), sourceVisitId: null,
        sourceDate: original.CreateDate, eventDay: index === 1 ? null : original.CreateDate.slice(0, 10), displayName: index === 0 ? "100% fixture" : "Fixture",
        searchText: index === 0 ? "100% fixture" : "other", sourceDeleted: original.Deleted,
        state: index === 2 ? "excluded" : index === 1 ? "review" : "ready", reviewReasons: index === 1 ? ["future_date"] : [],
        rawJson, rawSha256: hash(rawJson), sourceUtf16Sha256: hash(rawJson, "utf16le"), presentation: { fields: original } };
    });
    const contents = rows.map((r) => JSON.stringify(r) + "\n").join("");
    await writeFile(path.join(dir, "Patients.jsonl"), contents);
    const stats = { total: 3, states: { ready: 1, review: 1, excluded: 1 }, entities: { Patients: { total: 3, ready: 1, review: 1, excluded: 1 } } };
    await writeFile(path.join(dir, "manifest.json"), JSON.stringify({ formatVersion: 1, sourceName: "fixture.cxbak", sourceSha256: hash(randomUUID()), sourceCreatedAt: "2026-11-05T17:00:00Z", metadata: {}, stats, files: [{ name: "Patients.jsonl", sha256: hash(contents), bytes: Buffer.byteLength(contents), records: 3 }] }));
    const opts = { directory: dir, doctorId, protectedDoctorId: otherId, expectedPhone: phone + "0" };
    const before = await existingClinical(db, doctorId);
    const loginPhone = "+964700" + String(Date.now()).slice(-7);
    const credentialsFile = path.join(dir, "credentials", "preview.json");
    const preview = await createPreviewAccount(db, { ownerId: doctorId, loginPhone, credentialsFile });
    ids.push(String(preview.doctorId));
    assert.equal(Object.hasOwn(preview, "password"), false);
    assert.equal((await stat(credentialsFile)).mode & 0o777, 0o600);
    assert.equal((await createPreviewAccount(db, { ownerId: doctorId, loginPhone, credentialsFile })).doctorId, preview.doctorId);
    await assert.rejects(createPreviewAccount(db, { ownerId: doctorId, loginPhone, credentialsFile: path.join(dir, "new-credentials.json") }), /already belongs/);
    await assert.rejects(createPreviewAccount(db, { ownerId: doctorId, loginPhone: "+9647000000000", credentialsFile: path.join(dir, "public.json") }), /Public demo/);
    assert.equal(Number((await db.query("SELECT count(*) FROM finance_transactions WHERE doctor_id=$1", [preview.doctorId])).rows[0].count), 0);
    assert.equal((await importArchive(db, opts)).mode, "dry-run");
    assert.equal((await listLegacyBatches(doctorId)).length, 0);
    await assert.rejects(importArchive(db, { ...opts, apply: true, backupDirectory: path.join(dir, "rollback"), failAfterRows: 1 }), /rollback test/);
    assert.equal((await listLegacyBatches(doctorId)).length, 0);
    assert.equal(Number((await db.query("SELECT count(*) FROM legacy_clinical_records WHERE doctor_id=$1", [doctorId])).rows[0].count), 0);
    const result = await importArchive(db, { ...opts, apply: true, backupDirectory: path.join(dir, "apply") });
    assert.equal(result.records, 3);
    assert.deepEqual(await existingClinical(db, doctorId), before);
    assert.equal((await stat(path.join(dir, "apply", "before.json"))).mode & 0o777, 0o600);
    assert.equal((await stat(path.join(dir, "apply"))).mode & 0o777, 0o700);
    assert.equal((await importArchive(db, { ...opts, apply: true, backupDirectory: path.join(dir, "replay") })).mode, "replay");
    const actual = (await db.query("SELECT raw_json,source_date,state FROM legacy_clinical_records WHERE batch_id=$1 ORDER BY source_id", [result.batchId])).rows;
    assert.deepEqual(actual.map((r: { raw_json: string }) => JSON.parse(r.raw_json)), originals);
    assert.equal(actual[0].raw_json, rows[0].rawJson);
    assert.equal(actual[0].source_date, originals[0].CreateDate);
    assert.equal(Object.hasOwn((await readLegacyRecords(doctorId, result.batchId, { entity: "Patients", page: 1, pageSize: 25 })).rows[0], "rawJson"), false);
    assert.equal((await listLegacyBatches(otherId)).length, 0);
    assert.equal((await readLegacyRecords(otherId, result.batchId, { entity: "Patients", page: 1, pageSize: 25 })).total, 0);
    assert.equal((await readLegacyRecords(doctorId, result.batchId, { entity: "Patients", q: "%", page: 1, pageSize: 25 })).total, 1);
    assert.equal((await readLegacyRecords(doctorId, result.batchId, { entity: "Patients", state: "review", page: 1, pageSize: 25 })).total, 1);
    assert.equal((await readLegacyRecords(doctorId, result.batchId, { state: "review", reason: "future_date", page: 1, pageSize: 25 })).total, 1);
    assert.equal((await readLegacyRecords(doctorId, result.batchId, { entity: "Patients", q: "2019-09-14", page: 1, pageSize: 25 })).total, 1);
    assert.equal((await readLegacyRecords(doctorId, result.batchId, { entity: "Patients", page: 1, pageSize: 25 })).total, 2);
    await assert.rejects(db.query("INSERT INTO legacy_clinical_records(doctor_id,batch_id,entity,source_id,state,raw_json,raw_sha256) VALUES($1,$2,'Patients','99','ready','{}','invalid')", [otherId, result.batchId]), /foreign key/);
    await assert.rejects(importArchive(db, { ...opts, expectedPhone: "+9647999999999" }), /identity/);
    await assert.rejects(importArchive(db, { ...opts, protectedDoctorId: doctorId }), /protected/);
    await db.query("UPDATE users SET active_session_id='rx-public-demo-session' WHERE id=$1", [doctorId]);
    await assert.rejects(importArchive(db, opts), /Public demo/);
    await db.query("UPDATE users SET active_session_id=NULL WHERE id=$1", [doctorId]);
    const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
    const approvalOptions = { doctorId, protectedDoctorId: otherId, sourceSha256: manifest.sourceSha256, note: "User requested acceptance as-is", backupDirectory: path.join(dir, "approval") };
    assert.equal((await approveAsIs(db, approvalOptions)).approved, 1);
    assert.equal((await approveAsIs(db, approvalOptions)).replayed, true);
    assert.equal((await readLegacyRecords(doctorId, result.batchId, { state: "review", page: 1, pageSize: 25 })).total, 0);
    assert.equal((await listLegacyBatches(doctorId))[0].approval?.count, 1);
    assert.deepEqual((await db.query("SELECT raw_json,source_date,state FROM legacy_clinical_records WHERE batch_id=$1 ORDER BY source_id", [result.batchId])).rows, actual);
    assert.deepEqual(await existingClinical(db, doctorId), before);
    assert.equal((await importArchive(db, opts)).mode, "replay");
    await writeFile(path.join(dir, "Patients.jsonl"), contents.replace("نص", "بديل"));
    await assert.rejects(verifyExport(dir), /checksum/);
    assert.equal(JSON.parse(await readFile(path.join(dir, "apply", "result.json"), "utf8")).existingClinicalUnchanged, true);
  } finally {
    if (ids.length) await db.query("DELETE FROM users WHERE id=ANY($1::bigint[])", [ids]);
    await db.end(); await prisma.$disconnect(); await rm(dir, { recursive: true, force: true });
  }
});
