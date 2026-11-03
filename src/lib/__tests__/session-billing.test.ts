import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { accountTotals, sessionBalance } from "../finance/session-balance";
import { sessionBillingSchema } from "../validations/session-billing";

test("session account distinguishes unpriced, free, unpaid, partial and fully paid", () => {
  assert.equal(sessionBalance({}).status, "unpriced");
  assert.equal(sessionBalance({ fee: 0 }).status, "paid");
  assert.equal(sessionBalance({ fee: 100000 }).status, "unpaid");
  assert.deepEqual(sessionBalance({ fee: 100000, payments: [{ amount: 50000 }] }), { fee: 100000, currency: "IQD", paid: 50000, remaining: 50000, status: "partial" });
  assert.equal(sessionBalance({ fee: 0.3, currency: "USD", payments: [{ amount: 0.1 }, { amount: 0.2 }] }).status, "paid");
  assert.deepEqual(accountTotals([{ fee: 100000, payments: [{ amount: 50000 }] }, { fee: 20000 }, { fee: 12.55, currency: "USD", payments: [{ amount: 2.05 }] }, {}]), [
    { currency: "IQD", total: 120000, paid: 50000, remaining: 70000 },
    { currency: "USD", total: 12.55, paid: 2.05, remaining: 10.5 },
  ]);
});

test("billing input rejects invalid dates, negative, oversized and overprecision money", () => {
  const input = { requestId: randomUUID(), currency: "IQD", transactionDate: "2026-11-03", fee: 100000, amount: 50000 };
  assert.equal(sessionBillingSchema.safeParse(input).success, true);
  for (const patch of [{ fee: -1 }, { amount: -1 }, { amount: 1.5 }, { fee: Infinity }, { amount: 10000000000 }, { transactionDate: "2026-02-30" }, { requestId: "missing-key" }, { currency: "EUR" }]) assert.equal(sessionBillingSchema.safeParse({ ...input, ...patch }).success, false);
  assert.equal(sessionBillingSchema.safeParse({ ...input, currency: "USD", amount: 12.55 }).success, true);
  assert.equal(sessionBillingSchema.safeParse({ ...input, currency: "USD", amount: 12.555 }).success, false);
});

test("partial session debts, later settlement, tenant isolation, concurrency and income", { skip: !process.env.RUN_BILLING_DB_TESTS }, async () => {
  const { prisma } = await import("../prisma");
  const { saveSessionBilling, saveSessionBillingInTransaction, getSessionBilling, loadPatientAccount, loadPatientDebtMap, deleteSessionPayment, deleteUnbilledPlan, deleteUnbilledSession, deleteUnbilledPatient } = await import("../finance/session-billing-service");
  const { createTreatmentPlanForPatient } = await import("../treatment/create-plan-service");
  const { loadFinanceSummary } = await import("../finance/load-summary");
  const { serializeTreatmentPlan } = await import("../treatment/serializer");
  const doctor = await prisma.user.create({ data: { name: "Billing fixture", phoneNumber: randomUUID(), password: "unused", type: "doctor" } });
  const other = await prisma.user.create({ data: { name: "Other clinic", phoneNumber: randomUUID(), password: "unused", type: "doctor" } });
  try {
    const patient = await prisma.patient.create({ data: { doctorId: doctor.id, name: "Billing fixture", gender: "male" } });
    const plan = await prisma.treatmentPlan.create({ data: { doctorId: doctor.id, patientId: patient.id, toothFdi: 11, treatmentType: "root_canal", sessions: { create: [1, 2, 3, 4].map(sessionNumber => ({ doctorId: doctor.id, patientId: patient.id, sessionNumber })) } }, include: { sessions: { orderBy: { sessionNumber: "asc" } } } });
    const [first, second, usd, racing] = plan.sessions;
    const input = { requestId: randomUUID(), currency: "IQD" as const, transactionDate: "2026-11-03", fee: 100000, amount: 50000, paymentMethod: "cash" as const };
    assert.equal((await getSessionBilling(doctor.id, first.id))?.billing.status, "unpriced");
    await saveSessionBilling(doctor.id, doctor.id, first.id, input);
    await Promise.all([saveSessionBilling(doctor.id, doctor.id, first.id, input), saveSessionBilling(doctor.id, doctor.id, first.id, input)]);
    assert.equal((await getSessionBilling(doctor.id, first.id))?.payments.length, 1);
    assert.equal((await loadPatientAccount(doctor.id, patient.id)).totals[0].remaining, 50000);
    assert.equal((await loadFinanceSummary(Number(doctor.id), "IQD")).totalIncome, 50000);
    assert.equal(await getSessionBilling(other.id, first.id), null);
    await assert.rejects(saveSessionBilling(other.id, other.id, first.id, input), /الجلسة غير موجودة/);
    await assert.rejects(saveSessionBilling(doctor.id, doctor.id, first.id, { ...input, amount: 40000 }), /طلب الدفع/);
    await assert.rejects(saveSessionBilling(doctor.id, doctor.id, first.id, { ...input, requestId: randomUUID(), amount: 50001 }), /يتجاوز/);
    await assert.rejects(saveSessionBilling(doctor.id, doctor.id, first.id, { ...input, requestId: randomUUID(), amount: 0, fee: 40000 }), /يتجاوز/);
    await assert.rejects(saveSessionBilling(doctor.id, doctor.id, first.id, { ...input, requestId: randomUUID(), amount: 0, fee: null }), /حدد سعر/);
    await assert.rejects(saveSessionBilling(doctor.id, doctor.id, first.id, { ...input, requestId: randomUUID(), amount: 0, currency: "USD" }), /تغيير العملة/);
    await assert.rejects(deleteUnbilledSession(doctor.id, first.id), /لا يمكن حذف/);
    await assert.rejects(deleteUnbilledPlan(doctor.id, plan.id), /لا يمكن حذف/);
    await assert.rejects(deleteUnbilledPatient(doctor.id, patient.id), /لا يمكن حذف/);

    await prisma.treatmentSession.update({ where: { id: first.id }, data: { status: "completed" } });
    await saveSessionBilling(doctor.id, doctor.id, second.id, { ...input, requestId: randomUUID(), fee: 80000, amount: 0 });
    // A new session does not consume or reset the earlier debt.
    assert.deepEqual((await loadPatientAccount(doctor.id, patient.id)).totals, [{ currency: "IQD", total: 180000, paid: 50000, remaining: 130000 }]);
    await saveSessionBilling(doctor.id, doctor.id, first.id, { ...input, requestId: randomUUID(), fee: undefined, transactionDate: "2026-11-10", amount: 50000 });
    const settled = await getSessionBilling(doctor.id, first.id);
    assert.equal(settled?.billing.status, "paid");
    assert.equal(settled?.payments.length, 2);
    const november3 = await loadFinanceSummary(Number(doctor.id), "IQD", { gte: new Date("2026-11-03"), lte: new Date("2026-11-03") });
    assert.equal(november3.totalIncome, 50000);
    assert.equal((await loadFinanceSummary(Number(doctor.id), "IQD")).totalIncome, 100000);
    await saveSessionBilling(doctor.id, doctor.id, usd.id, { ...input, requestId: randomUUID(), currency: "USD", fee: 12.55, amount: 2.05 });
    const map = await loadPatientDebtMap(doctor.id, [patient.id]);
    assert.deepEqual(map.get(Number(patient.id)), [{ currency: "IQD", total: 180000, paid: 100000, remaining: 80000 }, { currency: "USD", total: 12.55, paid: 2.05, remaining: 10.5 }]);
    const serializedPlan = serializeTreatmentPlan(await prisma.treatmentPlan.findUniqueOrThrow({ where: { id: plan.id }, include: { sessions: { orderBy: { sessionNumber: "asc" }, include: { payments: true } } } }));
    assert.equal(serializedPlan.sessions?.[0].billing.remaining, 0);

    await saveSessionBilling(doctor.id, doctor.id, racing.id, { ...input, requestId: randomUUID(), fee: 100, amount: 0 });
    const results = await Promise.allSettled([1, 2].map(() => saveSessionBilling(doctor.id, doctor.id, racing.id, { ...input, fee: undefined, requestId: randomUUID(), amount: 60 })));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal((await getSessionBilling(doctor.id, racing.id))?.billing.remaining, 40);
    const duplicate = { ...input, fee: undefined, requestId: randomUUID(), amount: 40 };
    await Promise.all([1, 2].map(() => saveSessionBilling(doctor.id, doctor.id, racing.id, duplicate)));
    assert.equal((await getSessionBilling(doctor.id, racing.id))?.billing.paid, 100);

    await deleteSessionPayment(doctor.id, first.id, BigInt(settled!.payments[0].id));
    assert.equal((await getSessionBilling(doctor.id, first.id))?.billing.remaining, 50000);
    assert.equal((await loadFinanceSummary(Number(doctor.id), "IQD")).totalIncome, 50100);
    await assert.rejects(deleteSessionPayment(other.id, first.id, BigInt(settled!.payments[1].id)), /الجلسة غير موجودة/);

    // Pricing/receiving money while creating a plan records income once, even on replay.
    const planInput = { clientRequestId: randomUUID(), toothFdi: 12, treatmentType: "cleaning", sessions: [{ sessionNumber: 1, billing: { ...input, requestId: randomUUID(), fee: 30000, amount: 15000 } }] };
    const created = await createTreatmentPlanForPatient(Number(doctor.id), patient.id, planInput);
    const replayed = await createTreatmentPlanForPatient(Number(doctor.id), patient.id, planInput);
    assert.equal(created.id, replayed.id);
    assert.equal(replayed.sessions?.[0].billing.remaining, 15000);
    assert.equal((await loadFinanceSummary(Number(doctor.id), "IQD")).totalIncome, 65100);
    const createdId = BigInt(created.sessions![0].id);
    // Clinical completion and receipt either both commit or both roll back.
    await assert.rejects(prisma.$transaction(async tx => {
      await tx.treatmentSession.update({ where: { id: createdId }, data: { status: "completed" } });
      await saveSessionBillingInTransaction(tx, doctor.id, doctor.id, createdId, { ...input, requestId: randomUUID(), fee: 30000, amount: 16000 });
    }), /يتجاوز/);
    assert.equal((await prisma.treatmentSession.findUniqueOrThrow({ where: { id: createdId } })).status, "planned");
    const completion = { ...input, requestId: randomUUID(), fee: 30000, amount: 15000 };
    for (let retry = 0; retry < 2; retry++) await prisma.$transaction(async tx => {
      await saveSessionBillingInTransaction(tx, doctor.id, doctor.id, createdId, completion);
      await tx.treatmentSession.update({ where: { id: createdId }, data: { status: "completed" } });
    });
    assert.equal((await getSessionBilling(doctor.id, createdId))?.billing.status, "paid");
    assert.equal((await loadFinanceSummary(Number(doctor.id), "IQD")).totalIncome, 80100);
  } finally {
    await prisma.financeTransaction.deleteMany({ where: { doctorId: doctor.id } });
    await prisma.user.deleteMany({ where: { id: { in: [doctor.id, other.id] } } });
    await prisma.$disconnect();
  }
});
