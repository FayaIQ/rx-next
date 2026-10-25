import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { saveSessionNoteTemplate, deleteSessionNoteTemplate } from "../treatment/session-note-template-service";
import { appendSessionTemplate } from "../treatment/session-note-template";
import { serializePatientLight } from "../patient-serializer";
import { localPatientToDto } from "../sync/offline-store";

test("session templates isolate doctors and preserve saved patient session notes", { skip: !process.env.RUN_DB_TESTS }, async () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const rollback = new Error("Rollback feature fixtures");
  try {
    await assert.rejects(prisma.$transaction(async (tx) => {
      const doctor = await tx.user.create({ data: { name: "Templates doctor", type: "doctor", phoneNumber: randomUUID(), password: "unused" } });
      const other = await tx.user.create({ data: { name: "Other doctor", type: "doctor", phoneNumber: randomUUID(), password: "unused" } });
      const input = { name: "جلسة متابعة", treatmentType: "root_canal" as const, notes: "ملاحظات وخطوات كتبها الطبيب" };
      const created = await saveSessionNoteTemplate(tx, doctor.id, input);
      assert.ok(created);
      assert.equal(await saveSessionNoteTemplate(tx, other.id, { ...input, notes: "foreign edit" }, created.id), null);
      assert.equal(await deleteSessionNoteTemplate(tx, other.id, created.id), false);
      assert.equal(await tx.dentalSessionTemplate.count({ where: { doctorId: other.id } }), 0);
      const patient = await tx.patient.create({ data: { name: "Medical fixture", gender: "female", doctorId: doctor.id, allergies: "حساسية مسجلة", chronicConditions: "مرض مزمن مسجل", currentMedications: "دواء حالي مسجل" } });
      const savedNotes = appendSessionTemplate("ملاحظة المريض", created.notes);
      const visit = await tx.patientVisit.create({ data: { patientId: patient.id, doctorId: doctor.id, visitDate: new Date(), notes: savedNotes } });
      const updated = await saveSessionNoteTemplate(tx, doctor.id, { ...input, notes: "نص جديد" }, created.id);
      assert.equal(updated?.notes, "نص جديد");
      assert.equal(await deleteSessionNoteTemplate(tx, doctor.id, created.id), true);
      assert.equal((await tx.patientVisit.findUniqueOrThrow({ where: { id: visit.id } })).notes, savedNotes);
      const dto = serializePatientLight(patient);
      assert.equal(dto.chronicConditions, patient.chronicConditions);
      const offline = localPatientToDto({ id: "fixture", serverId: dto.id, doctorId: dto.doctorId, name: dto.name, gender: dto.gender, allergies: dto.allergies!, chronicConditions: dto.chronicConditions!, currentMedications: dto.currentMedications!, synced: true, updatedAt: new Date().toISOString() });
      assert.deepEqual([offline.allergies, offline.chronicConditions, offline.currentMedications], [dto.allergies, dto.chronicConditions, dto.currentMedications]);
      throw rollback;
    }, { timeout: 20000 }), (error: unknown) => error === rollback);
  } finally { await prisma.$disconnect(); }
});
