// Dry run by default. --apply requires a durable, private before/after backup.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { randomUUID } = require("node:crypto");
const { Client, types } = require("pg");

// Prisma stores these timestamp-without-zone values as UTC. Do not let pg
// reinterpret them in the machine's local timezone when making the repair.
types.setTypeParser(1114, value => value);
types.setTypeParser(1082, value => value);

const actualDay = "((s.performed_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date";
const labels = { root_canal: "علاج جذر", crown: "تاج", filled: "حشوة", implant: "زرعة", caries: "علاج تسوس", fracture: "علاج كسر", extraction: "خلع", cleaning: "تنظيف", full_mouth_cleaning: "غسل اسنان", other: "أخرى" };

function appointmentNotes(session, plan) {
  const teeth = plan.tooth_fdis?.length ? plan.tooth_fdis : plan.tooth_fdi == null ? [] : [plan.tooth_fdi];
  const target = teeth.length > 1 ? `الأسنان ${teeth.join("، ")}` : teeth.length ? `سن ${teeth[0]}` : "الفم بالكامل";
  return `${labels[plan.treatment_type] ?? plan.treatment_type} — ${target} · جلسة ${session.session_number}${plan.total_sessions ? `/${plan.total_sessions}` : ""}`;
}

async function privateJson(directory, name, value) {
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const file = await fs.open(path.join(directory, name), "wx", 0o600);
  try { await file.writeFile(JSON.stringify(value, null, 2)); await file.sync(); }
  finally { await file.close(); }
}

async function audit(db, ids) {
  return (await db.query(`SELECT count(*)::int AS completed,
    count(*) FILTER(WHERE a.id IS NULL)::int AS missingAppointments,
    count(*) FILTER(WHERE a.id IS NOT NULL AND a.booking_date IS DISTINCT FROM ${actualDay})::int AS wrongDays,
    count(*) FILTER(WHERE a.id IS NOT NULL AND a.appointment_datetime IS DISTINCT FROM s.performed_at)::int AS wrongTimes
    FROM treatment_sessions s LEFT JOIN appointments a ON a.id=s.appointment_id
    WHERE s.id=ANY($1::bigint[])`, [ids])).rows[0];
}

async function financeFingerprint(db, doctors) {
  return (await db.query(`SELECT count(*)::text AS count,
    md5(coalesce(string_agg(md5(to_jsonb(f)::text), '' ORDER BY f.id), '')) AS digest
    FROM finance_transactions f WHERE doctor_id=ANY($1::bigint[])`, [doctors])).rows[0];
}

async function repairSessionCalendar(db, { apply = false, doctorId = null, backupDirectory } = {}) {
  await db.query(apply ? "BEGIN ISOLATION LEVEL REPEATABLE READ" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  let committed = false;
  try {
    await db.query("SET LOCAL statement_timeout='20s'");
    await db.query("SET LOCAL lock_timeout='5s'");
    if (apply) {
      assert(backupDirectory, "A backup directory is required before applying changes");
      const lock = (await db.query("SELECT pg_try_advisory_xact_lock(hashtext('rx:repair-session-calendar')) AS locked")).rows[0];
      assert(lock.locked, "Another calendar repair is running");
    }
    const filter = "s.status='completed' AND s.performed_at IS NOT NULL AND ($1::bigint IS NULL OR s.doctor_id=$1::bigint)";
    const plans = (await db.query(`SELECT p.* FROM treatment_plans p WHERE p.id IN (SELECT s.plan_id FROM treatment_sessions s WHERE ${filter}) ORDER BY p.id ${apply ? "FOR UPDATE" : ""}`, [doctorId])).rows;
    const sessions = (await db.query(`SELECT s.*, ${actualDay} AS expected_day FROM treatment_sessions s WHERE ${filter} ORDER BY s.id ${apply ? "FOR UPDATE" : ""}`, [doctorId])).rows;
    const ids = sessions.map(s => s.id);
    const appointmentIds = sessions.map(s => s.appointment_id).filter(Boolean);
    const appointments = (await db.query(`SELECT * FROM appointments WHERE id=ANY($1::bigint[]) ORDER BY id ${apply ? "FOR UPDATE" : ""}`, [appointmentIds])).rows;
    const visits = (await db.query(`SELECT * FROM patient_visits WHERE treatment_session_id=ANY($1::bigint[]) ORDER BY id ${apply ? "FOR UPDATE" : ""}`, [ids])).rows;
    const appts = new Map(appointments.map(a => [a.id, a]));
    const planMap = new Map(plans.map(p => [p.id, p]));
    const sessionMap = new Map(sessions.map(s => [s.id, s]));
    for (const session of sessions) {
      assert(/^\d{4}-\d{2}-\d{2}$/.test(session.expected_day), "A completion timestamp has no valid calendar day");
      const plan = planMap.get(session.plan_id);
      assert(plan && plan.doctor_id === session.doctor_id && plan.patient_id === session.patient_id, "Session ownership conflicts with its plan");
      const appointment = appts.get(session.appointment_id);
      assert(!session.appointment_id || appointment, "A linked appointment is missing");
      assert(!appointment || (appointment.doctor_id === session.doctor_id && appointment.patient_id === session.patient_id), "Session ownership conflicts with its appointment");
    }
    for (const visit of visits) {
      const session = sessionMap.get(visit.treatment_session_id);
      assert(visit.doctor_id === session.doctor_id && visit.patient_id === session.patient_id, "Visit ownership conflicts with its session");
      assert(!visit.appointment_id || visit.appointment_id === session.appointment_id, "A clinical visit references a different appointment");
    }
    const beforeAudit = await audit(db, ids);
    const missing = sessions.filter(s => !s.appointment_id);
    // Never silently duplicate an orphaned session appointment with the same
    // patient, procedure and actual/planned day. Ambiguous matches need review.
    for (const session of missing) {
      const matches = await db.query(`SELECT id FROM appointments a WHERE doctor_id=$1 AND patient_id=$2 AND notes=$3
        AND (appointment_datetime=$4::timestamp OR booking_date=$5::date OR booking_date=$6::date)
        AND NOT EXISTS(SELECT 1 FROM treatment_sessions linked WHERE linked.appointment_id=a.id)`,
      [session.doctor_id, session.patient_id, appointmentNotes(session, planMap.get(session.plan_id)), session.performed_at, session.expected_day, session.scheduled_date]);
      assert.equal(matches.rowCount, 0, "An unlinked matching appointment needs review before creating a replacement");
    }
    const summary = { ...beforeAudit, visitsToAlign: visits.filter(v => {
      const s = sessionMap.get(v.treatment_session_id);
      return v.visit_date !== s.expected_day || v.appointment_id !== s.appointment_id || !s.appointment_id;
    }).length };
    if (!apply) { await db.query("ROLLBACK"); return { mode: "dry-run", before: summary }; }
    const doctors = [...new Set(sessions.map(s => s.doctor_id))];
    const beforeFinance = await financeFingerprint(db, doctors);
    const { database } = (await db.query("SELECT current_database() AS database")).rows[0];
    await privateJson(backupDirectory, "before.json", { database, savedAt: new Date().toISOString(), summary, plans, sessions, appointments, visits, finance: beforeFinance });

    const corrected = await db.query(`UPDATE appointments a SET appointment_datetime=s.performed_at,
      booking_date=${actualDay}, updated_at=(clock_timestamp() AT TIME ZONE 'UTC')
      FROM treatment_sessions s WHERE s.id=ANY($1::bigint[]) AND a.id=s.appointment_id
      AND (a.appointment_datetime IS DISTINCT FROM s.performed_at OR a.booking_date IS DISTINCT FROM ${actualDay}) RETURNING a.id`, [ids]);
    const created = [];
    for (const session of missing) {
      const appointment = (await db.query(`INSERT INTO appointments
        (doctor_id,patient_id,appointment_datetime,booking_date,notes,status,visit_status,created_at,updated_at)
        VALUES($1,$2,$3::timestamp,$4::date,$5,false,'done',clock_timestamp() AT TIME ZONE 'UTC',clock_timestamp() AT TIME ZONE 'UTC') RETURNING id`,
      [session.doctor_id, session.patient_id, session.performed_at, session.expected_day, appointmentNotes(session, planMap.get(session.plan_id))])).rows[0];
      await db.query("UPDATE treatment_sessions SET appointment_id=$2,updated_at=clock_timestamp() AT TIME ZONE 'UTC' WHERE id=$1", [session.id, appointment.id]);
      created.push({ sessionId: session.id, appointmentId: appointment.id });
    }
    const changedVisits = await db.query(`UPDATE patient_visits v SET visit_date=${actualDay},appointment_id=s.appointment_id,
      updated_at=clock_timestamp() AT TIME ZONE 'UTC' FROM treatment_sessions s
      WHERE s.id=ANY($1::bigint[]) AND v.treatment_session_id=s.id
      AND (v.visit_date IS DISTINCT FROM ${actualDay} OR v.appointment_id IS DISTINCT FROM s.appointment_id) RETURNING v.id`, [ids]);
    const touchedPlans = [...new Set(missing.map(s => s.plan_id))];
    if (touchedPlans.length) await db.query("UPDATE treatment_plans SET updated_at=clock_timestamp() AT TIME ZONE 'UTC' WHERE id=ANY($1::bigint[])", [touchedPlans]);
    const afterAudit = await audit(db, ids);
    assert.equal(afterAudit.missingappointments, 0, "Calendar entries are still missing");
    assert.equal(afterAudit.wrongdays, 0, "Calendar days still differ from actual completion");
    assert.equal(afterAudit.wrongtimes, 0, "Calendar times still differ from actual completion");
    assert.deepEqual(await financeFingerprint(db, doctors), beforeFinance, "Financial records changed unexpectedly");
    const afterSessions = (await db.query("SELECT * FROM treatment_sessions WHERE id=ANY($1::bigint[]) ORDER BY id", [ids])).rows;
    const clinical = row => Object.fromEntries(Object.entries(row).filter(([key]) => !["appointment_id", "updated_at", "expected_day"].includes(key)));
    assert.deepEqual(afterSessions.map(clinical), sessions.map(clinical), "Clinical session data changed unexpectedly");
    const result = { mode: "apply", before: summary, correctedAppointments: corrected.rowCount, createdAppointments: created.length, alignedVisits: changedVisits.rowCount, after: afterAudit, financeUnchanged: true };
    const afterAppointments = (await db.query("SELECT * FROM appointments WHERE id=ANY($1::bigint[]) ORDER BY id", [[...appointmentIds, ...created.map(c => c.appointmentId)]])).rows;
    const afterVisits = (await db.query("SELECT * FROM patient_visits WHERE treatment_session_id=ANY($1::bigint[]) ORDER BY id", [ids])).rows;
    await privateJson(backupDirectory, "after.json", { result, created, sessions: afterSessions, appointments: afterAppointments, visits: afterVisits });
    await db.query("COMMIT");
    committed = true;
    await privateJson(backupDirectory, "result.json", { ...result, committedAt: new Date().toISOString() });
    return result;
  } catch (error) {
    if (!committed) await db.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  assert(args.every((arg, i) => ["--apply", "--doctor-id", "--backup-dir"].includes(arg) || ["--doctor-id", "--backup-dir"].includes(args[i - 1])), "Unknown argument");
  const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const doctorId = option("--doctor-id");
  assert(!doctorId || /^\d+$/.test(doctorId), "Invalid doctor ID");
  const env = require("dotenv").parse(await fs.readFile(path.join(__dirname, "..", ".env.local")));
  const db = new Client({ connectionString: process.env.DATABASE_URL ?? env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  const backupDirectory = option("--backup-dir") ?? path.join(os.homedir(), ".codex", "backups", "rx-session-calendar", `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`);
  try {
    await db.connect();
    const result = await repairSessionCalendar(db, { apply: args.includes("--apply"), doctorId, backupDirectory });
    console.log(JSON.stringify({ ...result, ...(args.includes("--apply") ? { backupDirectory } : {}) }));
  } finally { await db.end(); }
}

module.exports = { repairSessionCalendar };
if (require.main === module) main().catch(error => {
  console.error(JSON.stringify({ failed: true, code: error.code ?? error.name, ...(error instanceof assert.AssertionError ? { message: error.message.split("\n")[0] } : {}) }));
  process.exitCode = 1;
});
