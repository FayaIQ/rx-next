import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createManualVisit, VisitRequestConflictError } from "../visit/create-manual-visit";

test("manual visit retries save once, preserve notes and allow distinct visits", {
  skip: !process.env.RUN_DB_TESTS,
}, async () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  const rollback = new Error("Rollback regression fixtures");
  try {
    await assert.rejects(prisma.$transaction(async (tx) => {
      const doctor = await tx.user.create({ data: {
        name: "Visit regression test", type: "doctor",
        phoneNumber: `visit-test-${randomUUID()}`, password: "unused-test-value",
      } });
      const patient = await tx.patient.create({ data: {
        name: "Visit regression fixture", gender: "male", doctorId: doctor.id,
      } });
      const body = {
        doctorId: doctor.id, patientId: patient.id,
        visitDate: new Date("2026-10-04T00:00:00Z"),
        summary: "علاج جذر — جلسة 1", notes: "فتح حجرة وسبر اقنية",
        clientRequestId: randomUUID(),
      };
      const saved = await createManualVisit(tx, body);
      const retries = await Promise.all([
        createManualVisit(tx, body), createManualVisit(tx, body),
      ]);
      assert.ok(retries.every((visit) => visit.id === saved.id));
      assert.equal(await tx.patientVisit.count({ where: { patientId: patient.id } }), 1);

      await assert.rejects(createManualVisit(tx, { ...body, notes: "changed" }), VisitRequestConflictError);
      assert.equal((await tx.patientVisit.findUniqueOrThrow({ where: { id: saved.id } })).notes, body.notes);

      const next = await createManualVisit(tx, { ...body, clientRequestId: randomUUID() });
      assert.notEqual(next.id, saved.id);
      assert.equal(await tx.patientVisit.count({ where: { patientId: patient.id } }), 2);

      const otherPatient = await tx.patient.create({ data: {
        name: "Other visit fixture", gender: "male", doctorId: doctor.id,
      } });
      const other = await createManualVisit(tx, { ...body, patientId: otherPatient.id });
      assert.notEqual(other.id, saved.id);
      throw rollback;
    }, { timeout: 20000 }), (error: unknown) => error === rollback);
  } finally {
    await prisma.$disconnect();
  }
});
