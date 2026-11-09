// Creates a separate password-protected test clinic. Never resets an existing account.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { randomBytes, randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");

async function createPreviewAccount(db, { ownerId, loginPhone, credentialsFile }) {
  assert(Number.isSafeInteger(ownerId) && ownerId > 0);
  assert(/^\+964700\d{7}$/.test(loginPhone), "Use a distinct preview login identifier");
  assert(!["+9647000000000", "+9647000000001"].includes(loginPhone), "Public demo accounts are forbidden");
  const existingFile = await fs.readFile(credentialsFile, "utf8").catch((error) => { if (error.code !== "ENOENT") throw error; return null; });
  if (existingFile) {
    const saved = JSON.parse(existingFile);
    assert.equal(saved.ownerId, ownerId); assert.equal(saved.phone, loginPhone);
    const found = (await db.query("SELECT u.id::text,u.password,a.account_mode FROM users u JOIN clinic_acquisitions a ON a.doctor_id=u.id WHERE u.id=$1 AND u.phone_number=$2", [saved.doctorId, loginPhone])).rows[0];
    assert(found && found.account_mode === "test" && await bcrypt.compare(saved.password, found.password), "Saved preview identity no longer matches");
    return { doctorId: Number(found.id), credentialsFile, reused: true };
  }
  const password = randomBytes(24).toString("base64url") + "aA9!";
  const hashed = await bcrypt.hash(password, 12);
  await fs.mkdir(path.dirname(credentialsFile), { recursive: true, mode: 0o700 });
  await fs.chmod(path.dirname(credentialsFile), 0o700);
  await db.query("BEGIN");
  try {
    await db.query("SET LOCAL TIME ZONE 'UTC'");
    const owner = (await db.query("SELECT id FROM users WHERE id=$1 AND type='doctor'", [ownerId])).rows[0];
    assert(owner, "Original owner was not found");
    const existing = (await db.query("SELECT id FROM users WHERE right(regexp_replace(phone_number,'[^0-9]','','g'),10)=$1", [loginPhone.slice(-10)])).rows;
    assert.equal(existing.length, 0, "Preview login already belongs to an account; do not overwrite it");
    const doctorId = Number((await db.query("INSERT INTO users(name,phone_number,password,type,is_confirmed,created_at,updated_at,active_session_id) VALUES($1,$2,$3,'doctor',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,$4) RETURNING id", ["حساب معاينة خاص", loginPhone, hashed, randomUUID()])).rows[0].id);
    await db.query("INSERT INTO clinic_acquisitions(doctor_id,practice_type,account_mode,source,medium,registered_at,onboarding_at) VALUES($1,'general','test','direct','direct',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", [doctorId]);
    await db.query("INSERT INTO recipe_settings(doctor_id,doctor_name,doctor_specialty,onboarding_completed,font_family,font_size,opacity,color,print_phone,created_at,updated_at) VALUES($1,'حساب معاينة خاص','السجلات الطبية',true,'cairo','16',0.2,'#0F766E',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", [doctorId]);
    const expiresAt = (await db.query("INSERT INTO subscriptions(user_id,plan_type,status,starts_at,ends_at,notes,created_at,updated_at) VALUES($1,'trial','active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+INTERVAL '14 days',$2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING ends_at::text", [doctorId, `Private medical-record preview requested by owner ${ownerId}; no payment or financial transaction.`])).rows[0].ends_at;
    const credentials = { doctorId, ownerId, phone: loginPhone, password, expiresAt, archivePath: "/patients", privatePreview: true };
    const file = await fs.open(credentialsFile, "wx", 0o600);
    try { await file.writeFile(JSON.stringify(credentials, null, 2)); await file.sync(); } finally { await file.close(); }
    await db.query("COMMIT");
    return { doctorId, expiresAt, credentialsFile, reused: false };
  } catch (error) { await db.query("ROLLBACK"); throw error; }
}
module.exports = { createPreviewAccount };
if (require.main === module) {
  require("dotenv").config({ path: ".env.local", quiet: true });
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i += 2) { assert(["--owner-id", "--phone", "--credentials-file"].includes(args[i]) && args[i + 1]); options[args[i]] = args[i + 1]; }
  assert(options["--owner-id"] && options["--phone"]);
  const credentialsFile = options["--credentials-file"] ?? path.join(os.homedir(), ".codex", "backups", "rx-curex-preview-credentials", `account-${randomUUID()}.json`);
  const { Client } = require("pg");
  const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  (async () => { await db.connect(); try { console.log(JSON.stringify(await createPreviewAccount(db, { ownerId: Number(options["--owner-id"]), loginPhone: options["--phone"], credentialsFile }))); } finally { await db.end(); } })().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
