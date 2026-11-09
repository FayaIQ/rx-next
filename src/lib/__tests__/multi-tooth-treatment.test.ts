import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { treatmentPlanCreateSchema } from "../validations/treatment";
import { planIncludesTooth, treatmentPlanTeeth } from "../treatment/plan-teeth";
import { treatmentChartHref, treatmentTargetLabel } from "../treatment/constants";
import { buildTreatmentPlanMarkers } from "../dental/treatment-plan-markers";

test("shared plans validate selected teeth and preserve legacy and whole-mouth targets", () => {
  const base = { treatmentType: "root_canal", toothFdis: [11, 12, 36] };
  assert.equal(treatmentPlanCreateSchema.safeParse(base).success, true);
  assert.equal(treatmentPlanCreateSchema.safeParse({ ...base, toothFdi: 12 }).success, true);
  for (const patch of [{ toothFdis: [] }, { toothFdis: [11, 11] }, { toothFdis: [0, 11] }, { toothFdi: 13 }, { treatmentType: "full_mouth_cleaning" }]) assert.equal(treatmentPlanCreateSchema.safeParse({ ...base, ...patch }).success, false);
  assert.deepEqual(treatmentPlanTeeth({ toothFdi: 11 }), [11]);
  assert.deepEqual(treatmentPlanTeeth({ toothFdi: 11, toothFdis: [36, 12, 11] }), [11, 12, 36]);
  assert.equal(planIncludesTooth(base, 36), true);
  assert.equal(planIncludesTooth(base, 13), false);
  assert.equal(planIncludesTooth(base, null), false);
  assert.equal(planIncludesTooth({ toothFdi: null, toothFdis: [] }, null), true);
  assert.equal(treatmentTargetLabel(11, [11, 12]), "الأسنان 11، 12");
  assert.equal(treatmentChartHref(7, 11, [11, 12]), "/dental/7?teeth=11,12");
});

const localDb = process.env.RUN_BILLING_DB_TESTS && /(?:localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL ?? "");
test("three teeth share one persisted plan, session sequence, progress and balance", { skip: !localDb }, async () => {
  const { prisma } = await import("../prisma");
  const { createTreatmentPlanForPatient } = await import("../treatment/create-plan-service");
  const { loadPatientAccount, saveSessionBilling } = await import("../finance/session-billing-service");
  const { recordSessionVisit } = await import("../treatment/session-appointment");
  const { assertPlanAccess } = await import("../treatment/plan-utils");
  const { serializeTreatmentPlan } = await import("../treatment/serializer");
  const doctor = await prisma.user.create({ data: { name: "Multi tooth fixture", phoneNumber: randomUUID(), password: "unused", type: "doctor" } });
  try {
    const patient = await prisma.patient.create({ data: { doctorId: doctor.id, name: "Shared plan fixture", gender: "male" } });
    const billing = { fee: 150000, amount: 50000, currency: "IQD" as const, requestId: randomUUID(), transactionDate: "2026-11-09", paymentMethod: "cash" as const };
    const input = treatmentPlanCreateSchema.parse({ clientRequestId: randomUUID(), toothFdis: [36, 11, 12], treatmentType: "root_canal", pricingMode: "plan", billing, totalSessions: 3, sessions: [1, 2, 3].map(sessionNumber => ({ sessionNumber, scheduledDate: "2026-11-09", scheduledTime: "17:00" })) });
    const plan = await createTreatmentPlanForPatient(Number(doctor.id), patient.id, input);
    assert.deepEqual(plan.toothFdis, [11, 12, 36]);
    assert.equal(plan.toothFdi, 11);
    assert.equal((await createTreatmentPlanForPatient(Number(doctor.id), patient.id, input)).id, plan.id);
    assert.equal(await prisma.treatmentPlan.count({ where: { patientId: patient.id } }), 1);
    assert.equal(await prisma.treatmentSession.count({ where: { patientId: patient.id } }), 3);
    assert.equal(await prisma.appointment.count({ where: { patientId: patient.id } }), 3);
    assert.match((await prisma.appointment.findFirstOrThrow({ where: { patientId: patient.id } })).notes!, /الأسنان 11، 12، 36/);
    for (const toothFdi of plan.toothFdis) {
      const found = await prisma.treatmentPlan.findMany({ where: { doctorId: doctor.id, patientId: patient.id, OR: [{ toothFdi }, { toothFdis: { has: toothFdi } }] } });
      assert.deepEqual(found.map(p => Number(p.id)), [plan.id]);
    }
    const sessionId = BigInt(plan.sessions![0].id);
    await prisma.treatmentSession.update({ where: { id: sessionId }, data: { status: "completed", performedAt: new Date() } });
    await recordSessionVisit(sessionId);
    await recordSessionVisit(sessionId);
    assert.equal(await prisma.patientVisit.count({ where: { patientId: patient.id } }), 1);
    await saveSessionBilling(doctor.id, doctor.id, BigInt(plan.sessions![1].id), { ...billing, fee: undefined, requestId: randomUUID(), amount: 25000 });
    const account = await loadPatientAccount(doctor.id, patient.id);
    assert.equal(account.plans.length, 1);
    assert.deepEqual(account.plans[0].toothFdis, [11, 12, 36]);
    assert.deepEqual(account.totals, [{ currency: "IQD", total: 150000, paid: 75000, remaining: 75000 }]);
    const fresh = serializeTreatmentPlan((await assertPlanAccess(BigInt(plan.id), doctor.id))!);
    const markers = buildTreatmentPlanMarkers([fresh]);
    assert.deepEqual(markers.map(m => m.toothFdi), [11, 12, 36]);
    assert.equal(markers.every(m => m.completedSessions === 1 && m.totalSessions === 3), true);
    assert.equal(await assertPlanAccess(BigInt(plan.id), doctor.id + 1n), null);
    const separatePrices = await createTreatmentPlanForPatient(Number(doctor.id), patient.id, treatmentPlanCreateSchema.parse({ toothFdis: [21, 22], treatmentType: "root_canal", pricingMode: "per_session", sessions: [30000, 40000].map((fee, i) => ({ sessionNumber: i + 1, billing: { ...billing, fee, amount: 0, requestId: randomUUID() } })) }));
    assert.deepEqual(separatePrices.sessions?.map(s => s.billing.fee), [30000, 40000]);
    assert.deepEqual((await loadPatientAccount(doctor.id, patient.id)).totals, [{ currency: "IQD", total: 220000, paid: 75000, remaining: 145000 }]);
  } finally {
    await prisma.financeTransaction.deleteMany({ where: { doctorId: doctor.id } });
    await prisma.user.delete({ where: { id: doctor.id } });
    await prisma.$disconnect();
  }
});
