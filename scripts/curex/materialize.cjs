// Creates ordinary clinic records from an accepted snapshot. No billing services are invoked.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { existingClinical, persistedStats, existingRows, assertExistingRowsUnchanged } = require("./import.cjs");

async function materialize(db, { doctorId, protectedDoctorId, sourceSha256, backupDirectory, apply = false, progress = () => {}, failAfterPatients = false, originalAccount = false, expectedPhone }) {
  assert(Number.isSafeInteger(protectedDoctorId) && protectedDoctorId > 0);
  assert(Number.isSafeInteger(doctorId) && doctorId > 0 );
  assert(/^[a-f0-9]{64}$/.test(sourceSha256));
  const save = async (name, value) => {
    await fs.mkdir(backupDirectory, { recursive: true, mode: 0o700 });
    await fs.chmod(backupDirectory, 0o700);
    const f = await fs.open(path.join(backupDirectory, name), "wx", 0o600);
    try { await f.writeFile(JSON.stringify(value, null, 2)); await f.sync(); } finally { await f.close(); }
  };
  await db.query("BEGIN"); let transaction = true;
  try {
    await db.query("SET LOCAL TIME ZONE 'UTC'");
    await db.query("SET LOCAL statement_timeout='180s'");
    await db.query("SET LOCAL lock_timeout='5s'");
    const target = (await db.query("SELECT u.type,u.active_session_id,u.phone_number,a.account_mode FROM users u JOIN clinic_acquisitions a ON a.doctor_id=u.id WHERE u.id=$1 FOR UPDATE OF u", [doctorId])).rows[0];
    require("./target-guard.cjs").assertTarget(target,{doctorId,protectedDoctorId,expectedPhone,originalAccount});
    assert(!["+9647000000000", "+9647000000001"].includes(target.phone_number));
    const batch = (await db.query("SELECT * FROM legacy_import_batches WHERE doctor_id=$1 AND source_sha256=$2 AND status='complete' FOR UPDATE", [doctorId, sourceSha256])).rows[0];
    assert(batch, "Completed snapshot was not found");
    if (batch.native_completed_at) {
      await db.query("ROLLBACK"); transaction = false;
      return { replayed: true, doctorId, batchId: String(batch.id), counts: batch.native_counts };
    }
    assert.equal(batch.metadata.approval?.count ?? 0, batch.stats.states.review, "All flagged rows must be explicitly accepted first");
    const rawBefore = await persistedStats(db, batch.id, doctorId);
    const before = await existingClinical(db, doctorId);
    const originalRows = originalAccount ? await existingRows(db,doctorId) : {};
    if (!originalAccount) for (const table of ["patients", "prescriptions", "appointments", "patient_visits", "medicines", "medicine_presets", "patient_fields"]) assert.equal(before[table].count, 0, "Rehearsal target must start empty; existing records will never be overwritten");
    const expected = Object.fromEntries(Object.entries(batch.stats.entities).map(([k, v]) => [k, v.ready + v.review]));
    if (!apply) { await db.query("ROLLBACK"); transaction = false; return { dryRun: true, doctorId, expected }; }
    assert(backupDirectory);
    await save("before.json", { doctorId, batchId: String(batch.id), sourceSha256, before, rawBefore, originalRows });
    assert.equal(batch.metadata.enumMaps.Sex["1"], "Male");
    assert.equal(batch.metadata.enumMaps.Sex["2"], "Female");
    assert.equal(batch.metadata.enumMaps.DurationUnit["1"], "Day");
    assert.equal(batch.metadata.enumMaps.RelationToMeal["1"], "AfterMeal");
    assert.equal(batch.metadata.enumMaps.RelationToMeal["2"], "BeforeMeal");
    await db.query(`CREATE TEMP TABLE import_records ON COMMIT DROP AS
      SELECT entity,source_id,source_patient_id,source_visit_id,source_date,display_name,presentation->'fields' AS f,presentation->>'noteText' AS note
      FROM legacy_clinical_records WHERE doctor_id=$1 AND batch_id=$2 AND source_deleted=false`, [doctorId, batch.id]);
    await db.query(`CREATE INDEX ON import_records(entity,source_id);
      CREATE INDEX ON import_records(entity,source_patient_id);
      CREATE INDEX ON import_records(entity,source_visit_id);`);
    if (originalAccount) {
      const collisions=(await db.query(`SELECT count(*)::int AS n FROM import_records r JOIN patients p ON p.doctor_id=$1 AND (lower(trim(p.name))=lower(trim(r.display_name)) OR (nullif(p.phone,'') IS NOT NULL AND regexp_replace(p.phone,'[^0-9]','','g')=regexp_replace(r.f->>'PersonalInformation_PhoneNumber','[^0-9]','','g'))) WHERE r.entity='Patients'`,[doctorId])).rows[0].n;
      assert.equal(collisions,0,"Possible existing patient matches need review; no automatic merge allowed");
    }
    const numberOffset=Number((await db.query('SELECT coalesce(max(prescription_number),0)::int AS n FROM prescriptions WHERE doctor_id=$1',[doctorId])).rows[0].n);
    await db.query(`CREATE FUNCTION pg_temp.original_utc(t text) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$
      SELECT ((left(t,19)::timestamp AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'UTC') $$;
      CREATE FUNCTION pg_temp.original_dose(f jsonb) RETURNS text LANGUAGE sql IMMUTABLE AS $$
      SELECT nullif(trim(concat_ws(' ',nullif(f->>'Dose',''),nullif(f->>'DoseUnit',''))),'') $$;
      CREATE FUNCTION pg_temp.original_frequency(f jsonb) RETURNS text LANGUAGE sql IMMUTABLE AS $$
      SELECT CASE WHEN f->>'FrequencyStart' ~ '^[0-9.]+$' AND f->>'FrequencyEnd' ~ '^[0-9.]+$'
      AND (f->>'FrequencyStart')::numeric>0 AND (f->>'FrequencyEnd')::numeric>0
      THEN (f->>'FrequencyStart') || ' × ' || (f->>'FrequencyEnd') END $$;
      CREATE FUNCTION pg_temp.original_period(f jsonb) RETURNS text LANGUAGE sql IMMUTABLE AS $$
      SELECT CASE WHEN nullif(f->>'Duration','') IS NULL THEN NULL WHEN f->>'DurationUnit'='1' THEN (f->>'Duration')||' يوم'
      WHEN f->>'DurationUnit' IS NULL THEN f->>'Duration' END $$;
      CREATE FUNCTION pg_temp.original_timing(f jsonb) RETURNS text LANGUAGE sql IMMUTABLE AS $$
      SELECT CASE f->>'RelationToMeal' WHEN '1' THEN 'بعد الطعام' WHEN '2' THEN 'قبل الطعام' END $$;`);
    await db.query(`CREATE TEMP TABLE import_patients ON COMMIT DROP AS SELECT source_id,nextval(pg_get_serial_sequence('patients','id')) AS target_id,f,source_date,display_name FROM import_records WHERE entity='Patients';
      CREATE UNIQUE INDEX ON import_patients(source_id);`);
    await db.query(`INSERT INTO patients(id,doctor_id,name,gender,birthdate,phone,allergies,current_medications,created_at,updated_at)
      SELECT p.target_id,$1,ltrim(p.display_name,'| '),CASE p.f->>'PersonalInformation_Sex' WHEN '1' THEN 'male' WHEN '2' THEN 'female' ELSE 'unknown' END,
      CASE WHEN left(p.f->>'PersonalInformation_Birthdate',10)<=$2 THEN left(p.f->>'PersonalInformation_Birthdate',10)::date END,
      CASE WHEN NOT (r.review_reasons ?| array['phone_placeholder','phone_format']) THEN nullif(p.f->>'PersonalInformation_PhoneNumber','') END,
      nullif(p.f->>'Allergies',''),nullif(p.f->>'ChronicDrugs',''),pg_temp.original_utc(p.source_date),NULL
      FROM import_patients p JOIN legacy_clinical_records r ON r.doctor_id=$1 AND r.batch_id=$3 AND r.entity='Patients' AND r.source_id=p.source_id`, [doctorId, String(batch.source_created_at).slice(0, 10), batch.id]);
    if (failAfterPatients) throw new Error("Intentional native rollback test");
    progress({ stage: "patients", records: expected.Patients });
    await db.query(`CREATE TEMP TABLE import_visits ON COMMIT DROP AS SELECT s.*,p.target_id AS patient_id,nextval(pg_get_serial_sequence('patient_visits','id')) AS target_id FROM import_records s JOIN import_patients p ON p.source_id=s.source_patient_id WHERE s.entity='Visits';
      CREATE UNIQUE INDEX ON import_visits(source_id);
      CREATE TEMP TABLE import_prescriptions ON COMMIT DROP AS SELECT v.*,nextval(pg_get_serial_sequence('prescriptions','id')) AS prescription_id,
      row_number() OVER(ORDER BY v.source_date,v.source_id::bigint)::int AS number FROM import_visits v
      WHERE EXISTS(SELECT 1 FROM import_records d WHERE d.entity='PrescribedDrugs' AND d.source_visit_id=v.source_id);
      CREATE UNIQUE INDEX ON import_prescriptions(source_id);`);
    await db.query(`INSERT INTO prescriptions(id,doctor_id,patient_id,prescription_date,diagnosis,consultation_fee,consultation_fee_waived,consultation_currency,client_request_id,prescription_number,additional_info,created_at,updated_at)
      SELECT prescription_id,$1,patient_id,left(source_date,10)::date,nullif(f->>'DiagnosisHandwrittenText',''),0,false,'IQD',
      'history:'||$2||':visit:'||source_id,(number+$3::int),jsonb_build_object('documentKind','prescription'),pg_temp.original_utc(source_date),NULL FROM import_prescriptions`, [doctorId, String(batch.id), numberOffset]);
    await db.query(`CREATE TEMP TABLE import_items ON COMMIT DROP AS SELECT d.*,p.prescription_id,nextval(pg_get_serial_sequence('prescription_items','id')) AS target_id,p.source_date AS visit_date
      FROM import_records d JOIN import_prescriptions p ON p.source_id=d.source_visit_id WHERE d.entity='PrescribedDrugs';
      INSERT INTO prescription_items(id,prescription_id,name,type,dosage,quantity,period,time_of_use,notes,created_at,updated_at)
      SELECT target_id,prescription_id,f->>'DrugName',nullif(f->>'DosageForm',''),pg_temp.original_dose(f),pg_temp.original_frequency(f),pg_temp.original_period(f),nullif(concat_ws(' — ',pg_temp.original_timing(f),nullif(f->>'Notes','')),''),nullif(f->>'Notes',''),pg_temp.original_utc(visit_date),NULL FROM import_items;`);
    progress({ stage: "prescriptions", records: expected.PrescribedDrugs });
    await db.query(`CREATE TEMP TABLE import_appointments ON COMMIT DROP AS SELECT a.*,p.target_id AS patient_id,nextval(pg_get_serial_sequence('appointments','id')) AS target_id FROM import_records a JOIN import_patients p ON p.source_id=a.source_patient_id WHERE a.entity='Appointments';
      CREATE UNIQUE INDEX ON import_appointments(source_id);`);
    await db.query(`INSERT INTO appointments(id,doctor_id,patient_id,appointment_datetime,booking_date,notes,status,visit_status,time_unknown,created_at,updated_at)
      SELECT target_id,$1,patient_id,pg_temp.original_utc(left(source_date,10)||'T'||coalesce(nullif(f->>'TimeFrom',''),'00:00:00')),left(source_date,10)::date,
      nullif(f->>'Notes',''),false,'archived',nullif(f->>'TimeFrom','') IS NULL,pg_temp.original_utc(f->>'CreateDate'),NULL FROM import_appointments`, [doctorId]);
    await db.query(`INSERT INTO patient_visits(id,doctor_id,patient_id,visit_date,summary,notes,appointment_id,prescription_id,client_request_id,created_at,updated_at)
      SELECT v.target_id,$1,v.patient_id,left(v.source_date,10)::date,'زيارة طبية',nullif(v.note,''),a.target_id,p.prescription_id,
      'history:'||$2||':visit:'||v.source_id,pg_temp.original_utc(v.f->>'CreateDate'),NULL
      FROM import_visits v LEFT JOIN import_prescriptions p ON p.source_id=v.source_id LEFT JOIN import_appointments a ON a.source_id=v.f->>'SourceAppointmentId'`, [doctorId, String(batch.id)]);
    await db.query(`CREATE TEMP TABLE import_medicines ON COMMIT DROP AS SELECT d.*,nextval(pg_get_serial_sequence('medicines','id')) AS target_id FROM import_records d WHERE entity='DrugTemplates'`);
    await db.query(`INSERT INTO medicines(id,doctor_id,name,type,dosage,quantity,period,time_of_use,created_at,updated_at)
      SELECT target_id,$1,f->>'DrugName',coalesce(f->>'DosageForm',''),coalesce(pg_temp.original_dose(f),''),coalesce(pg_temp.original_frequency(f),''),coalesce(pg_temp.original_period(f),''),coalesce(pg_temp.original_timing(f),''),pg_temp.original_utc(f->>'CreateDate'),NULL FROM import_medicines`, [doctorId]);
    // Extra personal fields use native field/value tables; long clinical notes remain in the linked medical history.
    const fieldDefs = [["Mrn", "رقم الملف"], ["PersonalInformation_Address", "العنوان"], ["PersonalInformation_Occupation", "المهنة"], ["PersonalInformation_NationalId", "رقم الهوية"]];
    for (const [key, label] of fieldDefs) {
      const existingField=(await db.query("SELECT id FROM patient_fields WHERE doctor_id=$1 AND name=$2 AND is_personal=true AND is_active=true",[doctorId,label])).rows;
      assert(existingField.length<=1,"Ambiguous personal field; manual review required");
      const id = existingField[0]?.id ?? (await db.query("INSERT INTO patient_fields(doctor_id,name,size,is_active,is_personal,is_printable,created_at) VALUES($1,$2,'medium',true,true,false,CURRENT_TIMESTAMP) RETURNING id", [doctorId, label])).rows[0].id;
      await db.query("INSERT INTO patient_field_values(patient_id,patient_field_id,value,created_at) SELECT target_id,$1,f->>$2,pg_temp.original_utc(source_date) FROM import_patients WHERE nullif(f->>$2,'') IS NOT NULL AND length(f->>$2)<=255", [id, key]);
    }
    for (const [temp, sourceEntity, targetTable, id] of [["import_patients", "Patients", "patients", "target_id"], ["import_visits", "Visits", "patient_visits", "target_id"], ["import_prescriptions", "Visits", "prescriptions", "prescription_id"], ["import_items", "PrescribedDrugs", "prescription_items", "target_id"], ["import_appointments", "Appointments", "appointments", "target_id"], ["import_medicines", "DrugTemplates", "medicines", "target_id"]]) {
      await db.query(`INSERT INTO legacy_native_links(doctor_id,batch_id,source_entity,source_id,target_table,target_id) SELECT $1,$2,$3,source_id,$4,${id} FROM ${temp}`, [doctorId, batch.id, sourceEntity, targetTable]);
    }
    const counts = (await existingClinical(db, doctorId));
    assert.equal(counts.patients.count, before.patients.count + expected.Patients);
    assert.equal(counts.patient_visits.count, before.patient_visits.count + expected.Visits);
    assert.equal(counts.appointments.count, before.appointments.count + expected.Appointments);
    assert.equal(counts.prescription_items.count, before.prescription_items.count + expected.PrescribedDrugs);
    assert.equal(counts.medicines.count, before.medicines.count + expected.DrugTemplates);
    await assertExistingRowsUnchanged(db,originalRows);
    assert.deepEqual(counts.finance_transactions, before.finance_transactions, "Financial ledger changed");
    assert.deepEqual(await persistedStats(db, batch.id, doctorId), rawBefore, "Original snapshot changed");
    const totals = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v.count]));
    await db.query("UPDATE legacy_import_batches SET native_completed_at=CURRENT_TIMESTAMP,native_counts=$3 WHERE id=$1 AND doctor_id=$2", [batch.id, doctorId, JSON.stringify(totals)]);
    await save("verified.json", { doctorId, batchId: String(batch.id), counts: totals, noFinancialChanges: true, rawSnapshotUnchanged: true });
    await db.query("COMMIT"); transaction = false;
    await save("result.json", { doctorId, batchId: String(batch.id), counts: totals, committedAt: new Date().toISOString() });
    return { doctorId, batchId: String(batch.id), counts: totals };
  } catch (error) { if (transaction) await db.query("ROLLBACK"); throw error; }
}
module.exports = { materialize };
