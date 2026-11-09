import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const enabled = process.env.RUN_DB_TESTS === "1" && /(?:localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL ?? "");
for (const originalAccount of [false, true]) test(`native historical records preserve dates, rollback, replay and finances (${originalAccount ? "original additive import" : "private test"})`, { skip: !enabled }, async () => {
  const { Client, types } = await import("pg");
  [1082,1114,1184].forEach(t => types.setTypeParser(t, v => v));
  const { materialize } = await import("../../../scripts/curex/materialize.cjs");
  const { existingClinical } = await import("../../../scripts/curex/import.cjs");
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const dir = await mkdtemp(path.join(os.tmpdir(), "rx-native-history-"));
  await db.connect(); let id: number | undefined;
  try {
    id = Number((await db.query("INSERT INTO users(name,phone_number,password,type,active_session_id) VALUES('Native fixture',$1,'unused','doctor',$2) RETURNING id", ["+964700"+String(Date.now()).slice(-7), randomUUID()])).rows[0].id);
    await db.query("INSERT INTO clinic_acquisitions(doctor_id,practice_type,account_mode) VALUES($1,'general','test')", [id]);
    if (originalAccount) {
      const patient=(await db.query("INSERT INTO patients(doctor_id,name,gender,created_at) VALUES($1,'Existing patient','male','2018-01-01') RETURNING id",[id])).rows[0].id;
      await db.query("INSERT INTO prescriptions(doctor_id,patient_id,prescription_date,prescription_number,consultation_fee) VALUES($1,$2,'2018-01-01',71,19)",[id,patient]);
      await db.query("INSERT INTO finance_transactions(doctor_id,patient_id,type,category,amount,currency,transaction_date) VALUES($1,$2,'income','other',19,'IQD','2018-01-01')",[id,patient]);
      await db.query("INSERT INTO medicines(doctor_id,name,type,dosage,quantity,period,time_of_use) VALUES($1,'Existing catalog','','','','','')",[id]);
    }
    const sha = createHash("sha256").update(randomUUID()).digest("hex");
    const records = [
      ["Patients","1","1",null,"2019-09-14T00:00:00.9999999",{ PersonalInformation_Sex:0, PersonalInformation_Birthdate:"1980-01-01", Mrn:"P-001" }],
      ["Visits","2","1","2","2020-01-02T23:59:59.9999999",{ CreateDate:"2020-01-02T23:59:59.9999999", SourceAppointmentId:4 }],
      ["PrescribedDrugs","3","1","2","2026-01-01",{ DrugName:"Fixture medicine", Duration:3,DurationUnit:1,Notes:"Original directions",CreateDate:"2026-01-01" }],
      ["Appointments","4","1",null,"2020-01-02",{CreateDate:"2019-12-30T22:00:00",TimeFrom:null}],
      ["DrugTemplates","5",null,null,"2020-01-01",{ DrugName:"Fixture catalog",CreateDate:"2020-01-01T00:00:00" }],
    ] as const;
    const entities = Object.fromEntries(records.map(r => [r[0], { total:1, ready:1,review:0,excluded:0 }]));
    const batchId = (await db.query("INSERT INTO legacy_import_batches(doctor_id,source_sha256,source_name,source_created_at,status,metadata,stats) VALUES($1,$2,'fixture','2026-11-05','complete',$3,$4) RETURNING id",[id,sha,JSON.stringify({enumMaps:{Sex:{1:"Male",2:"Female"},DurationUnit:{1:"Day"},RelationToMeal:{1:"AfterMeal",2:"BeforeMeal"}}}),JSON.stringify({total:5,states:{ready:5,review:0,excluded:0},entities})])).rows[0].id;
    for (const [entity, sourceId, patient, visit, date, fields] of records) {
      const raw = JSON.stringify(fields), hash = createHash("sha256").update(raw).digest("hex");
      await db.query("INSERT INTO legacy_clinical_records(doctor_id,batch_id,entity,source_id,source_patient_id,source_visit_id,source_date,display_name,state,raw_json,raw_sha256,presentation) VALUES($1,$2,$3,$4,$5,$6,$7,'Fixture','ready',$8,$9,$10)",[id,batchId,entity,sourceId,patient,visit,date,raw,hash,JSON.stringify({fields,noteText: entity === "Visits" ? "Original clinical note" : undefined})]);
    }
    const options = {doctorId:id,protectedDoctorId:originalAccount ? id : 9999999,originalAccount,expectedPhone:(await db.query("SELECT phone_number FROM users WHERE id=$1",[id])).rows[0].phone_number,sourceSha256:sha,backupDirectory:path.join(dir,"apply"),apply:true};
    const before = await existingClinical(db,id);
    await assert.rejects(materialize(db,{...options,backupDirectory:path.join(dir,"rollback"),failAfterPatients:true}), /Intentional native rollback/);
    assert.deepEqual(await existingClinical(db,id),before);
    const result = await materialize(db,options);
    assert.equal(result.counts.patient_visits,1); assert.equal(result.counts.prescriptions,originalAccount ? 2 : 1);
    assert.equal(result.counts.finance_transactions,originalAccount ? 1 : 0);
    const patient = (await db.query("SELECT gender,created_at FROM patients WHERE doctor_id=$1 AND name='Fixture'",[id])).rows[0];
    assert.equal(patient.gender,"unknown"); assert.equal(patient.created_at,"2019-09-13 21:00:00");
    assert.equal((await db.query("SELECT prescription_date FROM prescriptions WHERE doctor_id=$1 AND client_request_id IS NOT NULL",[id])).rows[0].prescription_date,"2020-01-02");
    const appointment = (await db.query("SELECT booking_date,time_unknown,visit_status FROM appointments WHERE doctor_id=$1",[id])).rows[0];
    assert.equal(appointment.booking_date,"2020-01-02"); assert.equal(appointment.time_unknown,true); assert.equal(appointment.visit_status,"archived");
    const after = await existingClinical(db,id);
    assert.equal((await materialize(db,options)).replayed,true);
    assert.deepEqual(await existingClinical(db,id),after);
    if (!originalAccount) await assert.rejects(materialize(db,{...options,protectedDoctorId:id}));
    else await assert.rejects(materialize(db,{...options,expectedPhone:"+9647000999999"}));
  } finally {
    if (id) { await db.query("DELETE FROM users WHERE id=$1",[id]); }
    await db.end(); await rm(dir,{recursive:true,force:true});
  }
});
