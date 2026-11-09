// Archives only: never invokes patient/prescription creation, billing, or calendar services.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const readline = require("node:readline");
const { createHash, randomUUID } = require("node:crypto");

const ENTITIES = new Set(["Patients", "Visits", "PrescribedDrugs", "Appointments", "LabWorkups", "VitalSigns", "Histories", "PatientChronicConditions", "PatientDiagnoses", "PatientFamilyHistories", "Attachments", "SavedFiles", "DrugTemplates", "PrescriptionListTemplates", "PrescriptionListTemplateItems", "TextTemplates", "VisitTemplates", "VisitTemplateItems", "ReferringDoctors", "HandwrittenDiagnosisCatalog", "Icd10Diagnoses"]);
const sha = (value, encoding) => createHash("sha256").update(value, encoding).digest("hex");
const phoneKey = (s) => String(s).replace(/\D/g, "").replace(/^00/, "").replace(/^964/, "").replace(/^0+/, "");
async function privateJson(dir, name, value) {
  await fsp.mkdir(dir, { recursive: true, mode: 0o700 });
  await fsp.chmod(dir, 0o700);
  const file = await fsp.open(path.join(dir, name), "wx", 0o600);
  try { await file.writeFile(JSON.stringify(value, null, 2)); await file.sync(); } finally { await file.close(); }
}
async function* rows(filename) {
  const input = fs.createReadStream(filename, { encoding: "utf8" });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  try { for await (const line of lines) if (line) yield JSON.parse(line); }
  finally { lines.close(); input.destroy(); }
}
function validateRow(row, entity) {
  assert.equal(row.entity, entity);
  assert(ENTITIES.has(row.entity));
  assert.equal(typeof row.rawJson, "string");
  assert.equal(sha(row.rawJson), row.rawSha256, "Original UTF-8 source record changed");
  assert.equal(sha(row.rawJson, "utf16le"), row.sourceUtf16Sha256, "SQL Server source text changed");
  const original = JSON.parse(row.rawJson);
  assert.equal(String(original.Id), row.sourceId, "Source ID changed");
  assert.equal(!!original.Deleted, row.sourceDeleted);
  assert(Array.isArray(row.reviewReasons));
  assert.equal(row.state, row.sourceDeleted ? "excluded" : row.reviewReasons.length ? "review" : "ready");
  assert(row.sourceDate === null || row.sourceDate === undefined || typeof row.sourceDate === "string");
  assert(!row.eventDay || /^\d{4}-\d{2}-\d{2}$/.test(row.eventDay));
  assert(row.presentation && typeof row.presentation.fields === "object");
}
async function verifyExport(directory, progress = () => {}) {
  const manifest = JSON.parse(await fsp.readFile(path.join(directory, "manifest.json"), "utf8"));
  assert.equal(manifest.formatVersion, 1);
  assert(/^[a-f0-9]{64}$/.test(manifest.sourceSha256));
  const states = { ready: 0, review: 0, excluded: 0 };
  const entities = {};
  let total = 0;
  for (const file of manifest.files) {
    const entity = file.name.replace(/\.jsonl$/, "");
    assert(ENTITIES.has(entity) && file.name === `${entity}.jsonl`, "Unrecognized export file");
    assert(!entities[entity], "Duplicate export entity");
    const filename = path.join(directory, file.name);
    const hash = createHash("sha256");
    for await (const chunk of fs.createReadStream(filename)) hash.update(chunk);
    assert.equal(hash.digest("hex"), file.sha256, "Export file checksum changed");
    assert.equal((await fsp.stat(filename)).size, file.bytes);
    const counts = { total: 0, ready: 0, review: 0, excluded: 0 };
    const ids = new Set();
    for await (const row of rows(filename)) {
      validateRow(row, entity); assert(!ids.has(row.sourceId), "Duplicate source ID"); ids.add(row.sourceId);
      counts.total++; counts[row.state]++; states[row.state]++; total++;
    }
    assert.equal(counts.total, file.records);
    assert.deepEqual(counts, manifest.stats.entities[entity]);
    entities[entity] = counts;
    progress({ stage: "verified", entity, records: counts.total });
  }
  assert.deepEqual(states, manifest.stats.states);
  assert.equal(total, manifest.stats.total);
  return manifest;
}

async function existingRows(db, doctorId) {
  const tables = ["patients", "prescriptions", "appointments", "finance_transactions", "treatment_plans", "treatment_sessions", "patient_visits", "medicines", "medicine_presets", "patient_fields", "dental_charts", "dental_tooth_images"];
  const result = {};
  for (const table of tables) {
    const { rows: values } = await db.query(`SELECT * FROM ${table} WHERE doctor_id=$1 ORDER BY id`, [doctorId]);
    result[table] = values;
  }
  const { rows: items } = await db.query("SELECT i.* FROM prescription_items i JOIN prescriptions p ON p.id=i.prescription_id WHERE p.doctor_id=$1 ORDER BY i.id", [doctorId]);
  result.prescription_items = items;
  for (const [name, query] of Object.entries({
    patient_field_values: "SELECT v.* FROM patient_field_values v JOIN patients p ON p.id=v.patient_id WHERE p.doctor_id=$1 ORDER BY v.id",
    prescription_field_values: "SELECT v.* FROM prescription_field_values v JOIN prescriptions p ON p.id=v.prescription_id WHERE p.doctor_id=$1 ORDER BY v.id",
    dental_tooth_records: "SELECT v.* FROM dental_tooth_records v JOIN dental_charts c ON c.id=v.chart_id WHERE c.doctor_id=$1 ORDER BY v.id",
  })) {
    const { rows: values } = await db.query(query, [doctorId]);
    result[name] = values;
  }
  return result;
}

async function existingClinical(db, doctorId) {
  const rows = await existingRows(db, doctorId);
  return Object.fromEntries(Object.entries(rows).map(([k,v]) => [k,{count:v.length,sha256:sha(JSON.stringify(v))}]));
}
async function assertExistingRowsUnchanged(db, rows) {
  for (const [table, original] of Object.entries(rows)) {
    if (!original.length) continue;
    assert(/^[a-z_]+$/.test(table));
    const actual=(await db.query(`SELECT * FROM ${table} WHERE id=ANY($1::bigint[]) ORDER BY id`,[original.map(r=>r.id)])).rows;
    assert.deepEqual(actual,original,`Existing ${table} rows changed`);
  }
}

async function persistedStats(db, batchId, doctorId) {
  const records = (await db.query("SELECT entity,state,count(*)::int AS n FROM legacy_clinical_records WHERE batch_id=$1 AND doctor_id=$2 GROUP BY entity,state", [batchId, doctorId])).rows;
  const states = { ready: 0, review: 0, excluded: 0 }, entities = {};
  let total = 0;
  for (const row of records) {
    entities[row.entity] ??= { total: 0, ready: 0, review: 0, excluded: 0 };
    entities[row.entity][row.state] = row.n; entities[row.entity].total += row.n;
    states[row.state] += row.n; total += row.n;
  }
  const bad = (await db.query("SELECT count(*)::int AS n FROM legacy_clinical_records WHERE batch_id=$1 AND doctor_id=$2 AND encode(sha256(convert_to(raw_json,'UTF8')),'hex')<>raw_sha256", [batchId, doctorId])).rows[0].n;
  assert.equal(bad, 0, "Stored original records failed checksums");
  return { states, entities, total };
}

async function importArchive(db, { directory, doctorId, expectedPhone, protectedDoctorId, apply = false, backupDirectory, progress = () => {}, failAfterRows = null, originalAccount = false }) {
  assert(Number.isSafeInteger(doctorId) && doctorId > 0);

  assert(expectedPhone, "An exact target account identity is required");
  const manifest = await verifyExport(directory, progress);
  let inTransaction = false;
  try {
    await db.query("BEGIN"); inTransaction = true;
    await db.query("SET LOCAL TIME ZONE 'UTC'");
    await db.query("SET LOCAL lock_timeout='5s'");
    await db.query("SET LOCAL statement_timeout='90s'");
    const account = (await db.query("SELECT u.id::text,u.type,u.phone_number,u.active_session_id,a.account_mode FROM users u LEFT JOIN clinic_acquisitions a ON a.doctor_id=u.id WHERE u.id=$1 FOR UPDATE OF u", [doctorId])).rows[0];
    assert(account && account.type === "doctor" && phoneKey(account.phone_number) === phoneKey(expectedPhone), "Target identity does not match");
    require("./target-guard.cjs").assertTarget(account, { doctorId, protectedDoctorId, expectedPhone, originalAccount });
    assert(account.active_session_id !== "rx-public-demo-session" && !["7000000000", "7000000001"].includes(phoneKey(account.phone_number)), "Public demo accounts are forbidden");
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`curex-preview:${doctorId}:${manifest.sourceSha256}`]);
    const before = await existingClinical(db, doctorId);
    const existing = (await db.query("SELECT id::text,status FROM legacy_import_batches WHERE doctor_id=$1 AND source_sha256=$2", [doctorId, manifest.sourceSha256])).rows[0];
    if (existing?.status === "complete") {
      const actual = await persistedStats(db, existing.id, doctorId);
      assert.deepEqual(actual.states, manifest.stats.states); assert.equal(actual.total, manifest.stats.total);
      for (const [entity, counts] of Object.entries(manifest.stats.entities)) assert.deepEqual(actual.entities[entity] ?? { total: 0, ready: 0, review: 0, excluded: 0 }, counts);
      await db.query("ROLLBACK"); inTransaction = false;
      return { mode: "replay", batchId: existing.id, doctorId, records: actual.total, stats: actual, existingClinicalUnchanged: true };
    }
    assert(!existing, "An incomplete batch needs operator review");
    if (!apply) {
      await db.query("ROLLBACK"); inTransaction = false;
      return { mode: "dry-run", doctorId, records: manifest.stats.total, stats: manifest.stats };
    }
    assert(backupDirectory, "A private durable backup directory is required");
    await privateJson(backupDirectory, "before.json", { doctorId, account, sourceSha256: manifest.sourceSha256, existingClinical: before, at: new Date().toISOString() });
    const batchId = (await db.query("INSERT INTO legacy_import_batches(doctor_id,source_sha256,source_name,source_created_at,metadata,stats) VALUES($1,$2,$3,$4,$5,$6) RETURNING id::text", [doctorId, manifest.sourceSha256, manifest.sourceName, manifest.sourceCreatedAt, JSON.stringify(manifest.metadata), JSON.stringify(manifest.stats)])).rows[0].id;
    let inserted = 0;
    const flush = async (chunk) => {
      if (!chunk.length) return;
      await db.query(`INSERT INTO legacy_clinical_records
        (doctor_id,batch_id,entity,source_id,source_patient_id,source_visit_id,source_date,event_day,display_name,search_text,source_deleted,state,review_reasons,raw_json,raw_sha256,presentation)
        SELECT $1,$2,r.entity,r."sourceId",r."sourcePatientId",r."sourceVisitId",r."sourceDate",r."eventDay"::date,r."displayName",r."searchText",r."sourceDeleted",r.state,r."reviewReasons",r."rawJson",r."rawSha256",r.presentation
        FROM jsonb_to_recordset($3::jsonb) AS r(entity text,"sourceId" text,"sourcePatientId" text,"sourceVisitId" text,"sourceDate" text,"eventDay" text,"displayName" text,"searchText" text,"sourceDeleted" boolean,state text,"reviewReasons" jsonb,"rawJson" text,"rawSha256" text,presentation jsonb)`, [doctorId, batchId, JSON.stringify(chunk)]);
      inserted += chunk.length;
      if (failAfterRows !== null && inserted >= failAfterRows) throw new Error("Intentional import rollback test");
    };
    for (const file of manifest.files) {
      let chunk = [];
      for await (const row of rows(path.join(directory, file.name))) {
        validateRow(row, file.name.replace(/\.jsonl$/, ""));
        chunk.push(row);
        if (chunk.length >= 250) { await flush(chunk); chunk = []; }
      }
      await flush(chunk); progress({ stage: "stored", entity: file.name.replace(/\.jsonl$/, ""), inserted });
    }
    const actual = await persistedStats(db, batchId, doctorId);
    assert.equal(actual.total, manifest.stats.total); assert.deepEqual(actual.states, manifest.stats.states);
    for (const [entity, counts] of Object.entries(manifest.stats.entities)) assert.deepEqual(actual.entities[entity] ?? { total: 0, ready: 0, review: 0, excluded: 0 }, counts);
    assert.deepEqual(await existingClinical(db, doctorId), before, "Existing clinical or financial data changed");
    await db.query("UPDATE legacy_import_batches SET status='complete' WHERE id=$1 AND doctor_id=$2", [batchId, doctorId]);
    const result = { mode: "applied", batchId, doctorId, records: actual.total, stats: actual, existingClinicalUnchanged: true, sourceSha256: manifest.sourceSha256 };
    await privateJson(backupDirectory, "verified-before-commit.json", result);
    await db.query("COMMIT"); inTransaction = false;
    await privateJson(backupDirectory, "result.json", { ...result, committedAt: new Date().toISOString() });
    return result;
  } catch (error) {
    if (inTransaction) await db.query("ROLLBACK");
    throw error;
  }
}

module.exports = { existingRows, assertExistingRowsUnchanged, importArchive, verifyExport, existingClinical, persistedStats, validateRow };
if (require.main === module) {
  require("dotenv").config({ path: ".env.local", quiet: true });
  const args = process.argv.slice(2);
  const option = (name) => args[args.indexOf(name) + 1];
  const allowed = ["--export-dir", "--doctor-id", "--phone", "--protect-doctor-id", "--backup-dir"];
  for (let i = 0; i < args.length; i++) { if (["--apply", "--original-account"].includes(args[i])) continue; assert(allowed.includes(args[i]) && args[i + 1], "Unknown or incomplete argument"); i++; }
  assert(args.includes("--export-dir") && args.includes("--doctor-id") && args.includes("--phone") && args.includes("--protect-doctor-id"));
  const { Client, types } = require("pg");
  for (const id of [1082, 1114, 1184]) types.setTypeParser(id, (s) => s);
  const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  const backupDirectory = args.includes("--backup-dir") ? option("--backup-dir") : path.join(os.homedir(), ".codex", "backups", "rx-curex-import", `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`);
  (async () => {
    await db.connect();
    try {
      const result = await importArchive(db, { directory: option("--export-dir"), doctorId: Number(option("--doctor-id")), expectedPhone: option("--phone"), protectedDoctorId: Number(option("--protect-doctor-id")), apply: args.includes("--apply"), originalAccount: args.includes("--original-account"), backupDirectory,
        progress: (value) => console.log(JSON.stringify(value)) });
      console.log(JSON.stringify({ ...result, backupDirectory: args.includes("--apply") ? backupDirectory : undefined }));
    } finally { await db.end(); }
  })().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
