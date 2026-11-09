import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { treatmentPlanCreateSchema } from "../validations/treatment";

const payment = (fee: number, amount = 0) => ({ fee, amount, currency: "IQD" as const, requestId: randomUUID(), transactionDate: "2026-11-09", paymentMethod: "cash" as const });

test("plan pricing rejects mixed accounts and mismatched or duplicate sessions", () => {
  const base = { toothFdi: 11, treatmentType: "root_canal", totalSessions: 2, sessions: [{ sessionNumber: 1 }, { sessionNumber: 2 }] };
  assert.equal(treatmentPlanCreateSchema.safeParse({ ...base, pricingMode: "plan", billing: payment(100000) }).success, true);
  assert.equal(treatmentPlanCreateSchema.safeParse({ ...base, pricingMode: "per_session", sessions: base.sessions.map(s => ({ ...s, billing: payment(50000) })) }).success, true);
  assert.equal(treatmentPlanCreateSchema.safeParse({ ...base, pricingMode: "per_session", billing: payment(100000) }).success, false);
  assert.equal(treatmentPlanCreateSchema.safeParse({ ...base, pricingMode: "plan", sessions: [{ sessionNumber: 1, billing: payment(100000) }, { sessionNumber: 2 }] }).success, false);
  assert.equal(treatmentPlanCreateSchema.safeParse({ ...base, sessions: [{ sessionNumber: 1 }, { sessionNumber: 1 }] }).success, false);
  assert.equal(treatmentPlanCreateSchema.safeParse({ ...base, totalSessions: 3 }).success, false);
});

const localDb = process.env.RUN_BILLING_DB_TESTS && /(?:localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL ?? "");
test("whole-plan payments share one balance across sessions, while individual prices stay independent", { skip: !localDb }, async () => {
  const { prisma } = await import("../prisma");
  const { createTreatmentPlanForPatient } = await import("../treatment/create-plan-service");
  const { savePlanBilling, getPlanBilling, getSessionBilling, saveSessionBilling, saveSessionBillingInTransaction, loadPatientAccount, loadPatientDebtMap, deletePlanPayment, deleteUnbilledPlan, deleteUnbilledPatient } = await import("../finance/session-billing-service");
  const { loadFinanceSummary } = await import("../finance/load-summary");
  const { loadDoctorReports } = await import("../reports/load-reports");
  const { assertPlanAccess } = await import("../treatment/plan-utils");
  const { serializeTreatmentPlan } = await import("../treatment/serializer");
  const doctor = await prisma.user.create({ data: { name: "Plan billing fixture", phoneNumber: randomUUID(), password: "unused", type: "doctor" } });
  const other = await prisma.user.create({ data: { name: "Other clinic", phoneNumber: randomUUID(), password: "unused", type: "doctor" } });
  try {
    const patient = await prisma.patient.create({ data: { doctorId: doctor.id, name: "Plan pricing fixture", gender: "male" } });
    const input = treatmentPlanCreateSchema.parse({ clientRequestId: randomUUID(), pricingMode: "plan", billing: payment(100000, 20000), toothFdi: 11, treatmentType: "root_canal", totalSessions: 3, sessions: [1, 2, 3].map(sessionNumber => ({ sessionNumber })) });
    const plan = await createTreatmentPlanForPatient(Number(doctor.id), patient.id, input);
    assert.equal((await createTreatmentPlanForPatient(Number(doctor.id), patient.id, input)).id, plan.id);
    assert.equal(plan.billing?.remaining, 80000);
    assert.equal(plan.sessions?.[1].billing.scope, "plan");
    assert.equal((await prisma.treatmentSession.findMany({ where: { planId: BigInt(plan.id) } })).every(s => s.fee === null), true);
    const [first, second] = plan.sessions!;
    assert.equal((await getSessionBilling(doctor.id, BigInt(second.id)))?.billing.remaining, 80000);
    assert.deepEqual((await loadPatientAccount(doctor.id, patient.id)).totals, [{ currency: "IQD", total: 100000, paid: 20000, remaining: 80000 }]);
    assert.equal((await loadPatientAccount(doctor.id, patient.id)).sessions.length, 0);
    assert.equal((await loadFinanceSummary(Number(doctor.id), "IQD")).totalIncome, 20000);
    assert.equal(await getPlanBilling(other.id, BigInt(plan.id)), null);
    await assert.rejects(savePlanBilling(other.id, other.id, BigInt(plan.id), payment(100000, 1)), /غير موجودة/);
    await assert.rejects(deleteUnbilledPlan(doctor.id, BigInt(plan.id)), /لا يمكن حذف/);
    await assert.rejects(deleteUnbilledPatient(doctor.id, patient.id), /لا يمكن حذف/);
    await assert.rejects(savePlanBilling(doctor.id, doctor.id, BigInt(plan.id), { ...payment(100000), currency: "USD" }), /تغيير العملة/);
    await assert.rejects(savePlanBilling(doctor.id, doctor.id, BigInt(plan.id), payment(10000)), /يتجاوز/);

    // Different sessions of the same plan serialize against one account.
    const races = await Promise.allSettled([first, second].map(s => saveSessionBilling(doctor.id, doctor.id, BigInt(s.id), payment(100000, 50000))));
    assert.equal(races.filter(r => r.status === "fulfilled").length, 1);
    assert.equal((await getPlanBilling(doctor.id, BigInt(plan.id)))?.billing.remaining, 30000);
    const settlement = payment(100000, 30000);
    await Promise.all([first, second].map(s => saveSessionBilling(doctor.id, doctor.id, BigInt(s.id), settlement)));
    assert.equal((await getPlanBilling(doctor.id, BigInt(plan.id)))?.billing.paid, 100000);
    assert.equal((await getPlanBilling(doctor.id, BigInt(plan.id)))?.payments.length, 3);
    await assert.rejects(saveSessionBilling(doctor.id, doctor.id, BigInt(second.id), { ...settlement, amount: 1 }), /طلب الدفع/);

    await prisma.treatmentSession.create({ data: { planId: BigInt(plan.id), doctorId: doctor.id, patientId: patient.id, sessionNumber: 4 } });
    await prisma.treatmentSession.update({ where: { id: BigInt(first.id) }, data: { status: "completed" } });
    assert.equal((await getSessionBilling(doctor.id, BigInt(first.id)))?.billing.remaining, 0);
    assert.equal((await loadPatientAccount(doctor.id, patient.id)).totals[0].total, 100000);
    const serialized = serializeTreatmentPlan((await assertPlanAccess(BigInt(plan.id), doctor.id))!);
    assert.equal(serialized.billing?.paid, 100000);
    assert.equal(serialized.sessions?.[3].billing.scope, "plan");

    const receipt = (await getPlanBilling(doctor.id, BigInt(plan.id)))!.payments.find(p => p.amount === 30000)!;
    await assert.rejects(deletePlanPayment(other.id, BigInt(plan.id), BigInt(receipt.id)), /غير موجودة/);
    await deletePlanPayment(doctor.id, BigInt(plan.id), BigInt(receipt.id));
    assert.equal((await getSessionBilling(doctor.id, BigInt(second.id)))?.billing.remaining, 30000);
    await assert.rejects(prisma.$transaction(async tx => {
      await tx.treatmentSession.update({ where: { id: BigInt(second.id) }, data: { status: "completed" } });
      await saveSessionBillingInTransaction(tx, doctor.id, doctor.id, BigInt(second.id), payment(100000, 30001));
    }), /يتجاوز/);
    assert.equal((await prisma.treatmentSession.findUniqueOrThrow({ where: { id: BigInt(second.id) } })).status, "planned");

    const perSession = await createTreatmentPlanForPatient(Number(doctor.id), patient.id, treatmentPlanCreateSchema.parse({ toothFdi: 12, treatmentType: "root_canal", pricingMode: "per_session", sessions: [{ sessionNumber: 1, billing: payment(10000, 5000) }, { sessionNumber: 2, billing: payment(20000) }, { sessionNumber: 3 }] }));
    assert.deepEqual(perSession.sessions?.map(s => s.billing.fee), [10000, 20000, null]);
    assert.equal((await getSessionBilling(doctor.id, BigInt(perSession.sessions![1].id)))?.billing.remaining, 20000);
    await assert.rejects(savePlanBilling(doctor.id, doctor.id, BigInt(perSession.id), payment(1)), /مستقل/);
    assert.deepEqual((await loadPatientAccount(doctor.id, patient.id)).totals, [{ currency: "IQD", total: 130000, paid: 75000, remaining: 55000 }]);
    assert.deepEqual((await loadPatientDebtMap(doctor.id, [patient.id])).get(Number(patient.id)), [{ currency: "IQD", total: 130000, paid: 75000, remaining: 55000 }]);
    assert.equal((await loadFinanceSummary(Number(doctor.id), "IQD")).totalIncome, 75000);
    assert.equal((await loadPatientDebtMap(other.id, [patient.id])).size, 0);
    assert.deepEqual((await loadDoctorReports(Number(doctor.id), "2026-11")).summary.sessionAccount, [{ currency: "IQD", total: 130000, paid: 75000, remaining: 55000 }]);
    // A failure in a later session rolls back the whole plan and earlier receipts.
    const count = await prisma.treatmentPlan.count({ where: { patientId: patient.id } });
    await assert.rejects(createTreatmentPlanForPatient(Number(doctor.id), patient.id, treatmentPlanCreateSchema.parse({ toothFdi: 13, treatmentType: "root_canal", pricingMode: "per_session", sessions: [{ sessionNumber: 1, billing: payment(10000, 5000) }, { sessionNumber: 2, billing: payment(10000, 10001) }] })), /يتجاوز/);
    assert.equal(await prisma.treatmentPlan.count({ where: { patientId: patient.id } }), count);
    assert.equal((await loadFinanceSummary(Number(doctor.id), "IQD")).totalIncome, 75000);
    const unpriced = await createTreatmentPlanForPatient(Number(doctor.id), patient.id, { toothFdi: 14, treatmentType: "cleaning", pricingMode: "plan" });
    assert.equal(unpriced.billing?.status, "unpriced");
    assert.equal((await savePlanBilling(doctor.id, doctor.id, BigInt(unpriced.id), payment(0)))?.billing.status, "paid");
    const usd = await createTreatmentPlanForPatient(Number(doctor.id), patient.id, treatmentPlanCreateSchema.parse({ toothFdi: 15, treatmentType: "cleaning", pricingMode: "plan", billing: { ...payment(12.55, 2.05), currency: "USD" } }));
    assert.equal(usd.billing?.remaining, 10.5);
    assert.deepEqual((await loadPatientAccount(doctor.id, patient.id)).totals, [{ currency: "IQD", total: 130000, paid: 75000, remaining: 55000 }, { currency: "USD", total: 12.55, paid: 2.05, remaining: 10.5 }]);
  } finally {
    await prisma.financeTransaction.deleteMany({ where: { doctorId: doctor.id } });
    await prisma.user.deleteMany({ where: { id: { in: [doctor.id, other.id] } } });
    await prisma.$disconnect();
  }
});
