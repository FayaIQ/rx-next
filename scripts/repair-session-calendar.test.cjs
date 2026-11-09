const assert = require("node:assert/strict");
const { test } = require("node:test");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { Client } = require("pg");
const { repairSessionCalendar } = require("./repair-session-calendar.cjs");

const local = process.env.RUN_DB_TESTS === "1" && /^(localhost|127\.0\.0\.1)$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://invalid").hostname);
test("calendar repair preserves clinical data and money, is idempotent, and rolls back on failure", { skip: !local }, async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "rx-calendar-repair-test-"));
  const trigger = `repair_test_${randomUUID().replaceAll("-", "")}`;
  let doctor;
  await db.connect();
  try {
    doctor = (await db.query("INSERT INTO users(name,phone_number,password,type) VALUES('Calendar repair fixture',$1,'unused','doctor') RETURNING id", [randomUUID()])).rows[0];
    const patient = (await db.query("INSERT INTO patients(doctor_id,name,gender) VALUES($1,'Calendar repair fixture','male') RETURNING id", [doctor.id])).rows[0];
    const plan = (await db.query("INSERT INTO treatment_plans(doctor_id,patient_id,tooth_fdi,treatment_type,total_sessions) VALUES($1,$2,31,'root_canal',4) RETURNING id", [doctor.id, patient.id])).rows[0];
    const appt = (await db.query("INSERT INTO appointments(doctor_id,patient_id,appointment_datetime,booking_date,notes,status) VALUES($1,$2,'2026-11-09 14:00','2026-11-09','Keep original notes',false) RETURNING *", [doctor.id, patient.id])).rows[0];
    const first = (await db.query("INSERT INTO treatment_sessions(plan_id,doctor_id,patient_id,session_number,status,scheduled_date,scheduled_time,performed_at,appointment_id,fee,notes) VALUES($1,$2,$3,1,'completed','2026-11-09','17:00','2026-11-07 21:30',$4,100000,'Keep clinical notes') RETURNING *", [plan.id, doctor.id, patient.id, appt.id])).rows[0];
    const second = (await db.query("INSERT INTO treatment_sessions(plan_id,doctor_id,patient_id,session_number,status,performed_at) VALUES($1,$2,$3,2,'completed','2026-11-08 22:00') RETURNING *", [plan.id, doctor.id, patient.id])).rows[0];
    const planned = (await db.query("INSERT INTO treatment_sessions(plan_id,doctor_id,patient_id,session_number,status,scheduled_date) VALUES($1,$2,$3,3,'planned','2026-11-09') RETURNING *", [plan.id, doctor.id, patient.id])).rows[0];
    await db.query("INSERT INTO patient_visits(doctor_id,patient_id,treatment_session_id,appointment_id,visit_date) VALUES($1,$2,$3,$4,'2026-11-08'),($1,$2,$5,NULL,'2026-11-08')", [doctor.id, patient.id, first.id, appt.id, second.id]);
    await db.query("INSERT INTO finance_transactions(doctor_id,patient_id,treatment_session_id,appointment_id,type,category,amount,currency,transaction_date) VALUES($1,$2,$3,$4,'income','procedure',10000,'IQD','2026-11-09')", [doctor.id, patient.id, first.id, appt.id]);
    const financesBefore = (await db.query("SELECT * FROM finance_transactions WHERE doctor_id=$1 ORDER BY id", [doctor.id])).rows;
    const dry = await repairSessionCalendar(db, { doctorId: doctor.id });
    assert.equal(dry.before.completed, 2);
    assert.equal(dry.before.wrongdays, 1);
    assert.equal(dry.before.missingappointments, 1);
    const backupDirectory = path.join(directory, "apply");
    const result = await repairSessionCalendar(db, { apply: true, doctorId: doctor.id, backupDirectory });
    assert.equal(result.correctedAppointments, 1);
    assert.equal(result.createdAppointments, 1);
    assert.equal(result.alignedVisits, 1);
    assert.equal(result.after.wrongdays, 0);
    assert.equal(result.after.wrongtimes, 0);
    assert.equal(result.after.missingappointments, 0);
    const fixed = (await db.query("SELECT * FROM appointments WHERE id=$1", [appt.id])).rows[0];
    assert.equal(fixed.booking_date, "2026-11-08");
    assert.equal(fixed.appointment_datetime, "2026-11-07 21:30:00");
    assert.equal(fixed.notes, appt.notes);
    assert.equal(fixed.status, appt.status);
    const newAppointment = (await db.query("SELECT a.* FROM treatment_sessions s JOIN appointments a ON a.id=s.appointment_id WHERE s.id=$1", [second.id])).rows[0];
    assert.equal(newAppointment.booking_date, "2026-11-09");
    assert.equal(newAppointment.status, false);
    assert.equal(newAppointment.visit_status, "done");
    assert.deepEqual((await db.query("SELECT * FROM treatment_sessions WHERE id=$1", [planned.id])).rows[0], planned);
    const savedFirst = (await db.query("SELECT * FROM treatment_sessions WHERE id=$1", [first.id])).rows[0];
    assert.deepEqual(savedFirst, first);
    assert.deepEqual((await db.query("SELECT * FROM finance_transactions WHERE doctor_id=$1 ORDER BY id", [doctor.id])).rows, financesBefore);
    assert.equal((await fs.stat(path.join(backupDirectory, "before.json"))).mode & 0o777, 0o600);
    const replay = await repairSessionCalendar(db, { apply: true, doctorId: doctor.id, backupDirectory: path.join(directory, "replay") });
    assert.equal(replay.correctedAppointments, 0);
    assert.equal(replay.createdAppointments, 0);
    assert.equal(replay.alignedVisits, 0);

    // Force a failure after appointment writes to prove all changes roll back.
    await db.query("UPDATE appointments SET booking_date='2026-11-09' WHERE id=$1", [appt.id]);
    await db.query("UPDATE patient_visits SET visit_date='2026-11-08' WHERE treatment_session_id=$1", [second.id]);
    const fourth = (await db.query("INSERT INTO treatment_sessions(plan_id,doctor_id,patient_id,session_number,status,performed_at) VALUES($1,$2,$3,4,'completed','2026-11-08 22:00') RETURNING id", [plan.id, doctor.id, patient.id])).rows[0];
    await db.query(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.patient_id=${patient.id} THEN RAISE EXCEPTION 'intentional repair rollback test'; END IF; RETURN NEW; END $$`);
    await db.query(`CREATE TRIGGER ${trigger} BEFORE UPDATE ON patient_visits FOR EACH ROW EXECUTE FUNCTION ${trigger}()`);
    await assert.rejects(repairSessionCalendar(db, { apply: true, doctorId: doctor.id, backupDirectory: path.join(directory, "rollback") }), /intentional repair rollback test/);
    assert.equal((await db.query("SELECT booking_date FROM appointments WHERE id=$1", [appt.id])).rows[0].booking_date, "2026-11-09");
    assert.equal((await db.query("SELECT appointment_id FROM treatment_sessions WHERE id=$1", [fourth.id])).rows[0].appointment_id, null);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM appointments WHERE doctor_id=$1", [doctor.id])).rows[0].n, 2);
    assert.deepEqual((await db.query("SELECT * FROM finance_transactions WHERE doctor_id=$1 ORDER BY id", [doctor.id])).rows, financesBefore);
  } finally {
    await db.query(`DROP TRIGGER IF EXISTS ${trigger} ON patient_visits`);
    await db.query(`DROP FUNCTION IF EXISTS ${trigger}()`);
    if (doctor) {
      await db.query("DELETE FROM finance_transactions WHERE doctor_id=$1", [doctor.id]);
      await db.query("DELETE FROM users WHERE id=$1", [doctor.id]);
    }
    await db.end();
    await fs.rm(directory, { recursive: true, force: true });
  }
});
