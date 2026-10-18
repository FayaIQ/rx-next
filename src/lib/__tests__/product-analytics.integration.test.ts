import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { acquisitionFromUrl, acquisitionSchema, measurementRoute, measurementSchema } from "../product-analytics/shared";
import { isClarityReplayPage } from "../analytics";
import { activateSubscriptionSchema } from "../validations/admin";

const localDb = process.env.DATABASE_URL?.includes("127.0.0.1:55439/rx_review");

test("attribution accepts only safe campaign dimensions and excludes self referral", () => {
  assert.deepEqual(acquisitionFromUrl("https://rx.faya.dev/?utm_source=fb&utm_medium=paid_social&utm_id=120247331069710108"), { source: "facebook", medium: "paid_social", campaign: "120247331069710108" });
  assert.equal(acquisitionFromUrl("https://rx.faya.dev/?utm_campaign=patient@example.com").campaign, null);
  assert.equal(acquisitionFromUrl("https://rx.faya.dev/", "https://rx.faya.dev/auth/signup").source, "direct");
  assert.equal(acquisitionFromUrl("https://rx.faya.dev/?gclid=private-id").source, "google");
  assert.equal(acquisitionSchema.safeParse({ source: "arbitrary private value" }).success, false);
});

test("measurements and third-party replay cannot contain patient or portal URLs", () => {
  assert.equal(measurementRoute("/patients/273/record?name=private"), "/patients/:id/record");
  assert.equal(measurementRoute("/patients/:id/record"), "/patients/:id/record");
  assert.equal(measurementRoute("/prescriptions/123/preview"), "/prescriptions/:id/preview");
  assert.equal(measurementRoute("/portal/private-token"), null);
  assert.equal(measurementRoute("/unknown/private-value"), "/other");
  assert.equal(isClarityReplayPage("/home", "?patientId=273"), false);
  assert.equal(isClarityReplayPage("/portal/private-token"), false);
  assert.equal(isClarityReplayPage("/auth/signin", "?callbackUrl=/patients/273"), false);
  assert.equal(isClarityReplayPage("/auth/signup", "?practice=dental"), true);
  assert.equal(measurementSchema.safeParse({ id: "a", route: "/home", metric: "js_error", value: 1, device: "mobile", patientName: "Private" }).success, false);
});

test("payment is never inferred from trial activation", () => {
  assert.equal(activateSubscriptionSchema.parse({ packageId: 1 }).paymentConfirmed, false);
  assert.equal(activateSubscriptionSchema.safeParse({ packageId: 1, paymentConfirmed: true }).success, false);
  assert.equal(activateSubscriptionSchema.safeParse({ duration: 30, durationUnit: "days", paymentConfirmed: true, paidAmount: 160000, paidCurrency: "IQD" }).success, true);
});

test("server saves, replay, activation windows, currencies and clinic isolation", { skip: !localDb }, async () => {
  const { prisma } = await import("../prisma");
  const { registerDoctor } = await import("../auth-credentials");
  const { recordClinicActivity, markClinicMilestone, getClinicActivation, claimFirstValueEvent, loadAcquisitionReport, retentionWindow } = await import("../product-analytics/server");
  const { createPrescription } = await import("../prescription-service");
  const { createTreatmentPlanForPatient } = await import("../treatment/create-plan-service");
  const { syncSessionAppointment, recordSessionVisit } = await import("../treatment/session-appointment");
  const { loadFinanceSummary, parseFinanceRange } = await import("../finance/load-summary");
  const doctors: bigint[] = [];
  const visitKey = randomUUID();
  try {
    const general = await registerDoctor({ name: "Review General", phone: "+9647808880001", password: "Test-Password-987", practiceType: "general", acquisition: { source: "facebook", medium: "paid_social", campaign: "review", visitKey } }); doctors.push(general.id);
    const dental = await registerDoctor({ name: "Review Dental", phone: "+9647808880002", password: "Test-Password-987", practiceType: "dental" }); doctors.push(dental.id);
    const gp = await prisma.patient.create({ data: { name: "Fixture patient", gender: "male", doctorId: general.id } });
    const dp = await prisma.patient.create({ data: { name: "Fixture dental", gender: "female", doctorId: dental.id } });
    await markClinicMilestone(Number(general.id), "firstSigninAt"); await markClinicMilestone(Number(general.id), "onboardingAt");
    const payload = { patientId: Number(gp.id), prescriptionDate: "2026-10-18", items: [{ name: "Test medicine" }], fieldValues: [], clientRequestId: randomUUID() };
    const [rx1, rx2] = await Promise.all([createPrescription(Number(general.id), payload), createPrescription(Number(general.id), payload)]);
    assert.equal(rx1.id, rx2.id); assert.equal(await prisma.prescription.count({ where: { doctorId: general.id } }), 1);
    assert.equal(await prisma.clinicActivity.count({ where: { doctorId: general.id } }), 1);
    assert.equal((await getClinicActivation(Number(general.id)))?.firstValueCompleted, true);
    const claims = await Promise.all([claimFirstValueEvent(Number(general.id)), claimFirstValueEvent(Number(general.id))]); assert.equal(claims.filter(Boolean).length, 1);
    const payload2 = { ...payload, clientRequestId: randomUUID() }, payload3 = { ...payload, clientRequestId: randomUUID() };
    const [next1, next2] = await Promise.all([createPrescription(Number(general.id), payload2), createPrescription(Number(general.id), payload3)]); assert.notEqual(next1.prescriptionNumber, next2.prescriptionNumber);
    const planData = { toothFdi: 11, treatmentType: "root_canal", totalSessions: 3, clientRequestId: randomUUID() };
    const [plan1, plan2] = await Promise.all([createTreatmentPlanForPatient(Number(dental.id), dp.id, planData), createTreatmentPlanForPatient(Number(dental.id), dp.id, planData)]);
    assert.equal(plan1.id, plan2.id); assert.equal(await prisma.treatmentPlan.count({ where: { doctorId: dental.id } }), 1); assert.equal(await prisma.treatmentSession.count({ where: { doctorId: dental.id } }), 3);
    const session = await prisma.treatmentSession.findFirstOrThrow({ where: { doctorId: dental.id, scheduledDate: { not: null } } });
    await Promise.all([syncSessionAppointment(session.id), syncSessionAppointment(session.id)]);
    assert.equal(await prisma.appointment.count({ where: { doctorId: dental.id } }), 1);
    await prisma.treatmentSession.update({ where: { id: session.id }, data: { status: "completed", performedAt: new Date() } });
    await Promise.all([recordSessionVisit(session.id), recordSessionVisit(session.id)]);
    assert.equal(await prisma.patientVisit.count({ where: { treatmentSessionId: session.id } }), 1);
    assert.equal((await getClinicActivation(Number(dental.id)))?.firstValueCompleted, true);
    const demo = await prisma.user.create({ data: { name: "Review Demo", phoneNumber: randomUUID(), password: "unused", type: "doctor", activeSessionId: "rx-public-demo-session", clinicAcquisition: { create: { practiceType: "general" } } } }); doctors.push(demo.id);
    assert.equal(await recordClinicActivity(Number(demo.id), "prescription", 999), false);
    assert.equal(await prisma.clinicActivity.count({ where: { doctorId: demo.id } }), 0);
    const now = new Date(), registered = new Date(now.getTime() - 20 * 86400000), firstValue = new Date(registered.getTime() + 3600000);
    await prisma.clinicAcquisition.update({ where: { doctorId: general.id }, data: { registeredAt: registered, firstValueAt: firstValue } });
    const { loadVisitorFunnel } = await import("../product-analytics/funnel");
    const metric = { visitKey, route: "/", metric: "page_view", value: 1, device: "mobile", browser: "Chrome", area: "marketing", accountMode: "visitor", source: "facebook", campaign: "review-funnel", release: "review", createdAt: new Date(registered.getTime() - 1000) };
    await prisma.productMeasurement.createMany({ data: [{ ...metric, id: randomUUID() }, { ...metric, id: randomUUID() }, { ...metric, id: randomUUID(), metric: "signup_started", route: "/auth/signup", area: "auth" }] });
    const funnel = (await loadVisitorFunnel(30)).find(row => row.campaign === "review-funnel")!;
    assert.equal(funnel.qualifiedVisits, 1); assert.equal(funnel.signupVisits, 1); assert.equal(funnel.createdVisits, 1);
    await prisma.productMeasurement.create({ data: { ...metric, id: randomUUID(), accountMode: "test", userRole: "doctor" } });
    assert.equal((await loadVisitorFunnel(30)).some(row => row.campaign === "review-funnel"), false);
    const window = retentionWindow(firstValue, 7, now); assert.equal(window.eligible, true);
    await recordClinicActivity(Number(general.id), "visit", 98765, new Date(window.start.getTime() + 1000));
    let report = await loadAcquisitionReport(30, now); assert.equal(report.cohorts.filter(row => row.campaign === "review").reduce((sum, row) => sum + row.registered, 0), 1); const cohort = report.cohorts.find(row => row.campaign === "review")!; assert.equal(cohort.eligible48h, 1); assert.equal(cohort.returnedD7, 1); assert.equal(cohort.paid, 0);
    await prisma.subscription.create({ data: { userId: general.id, planType: "annual", status: "active", startsAt: now, endsAt: new Date(now.getTime() + 365 * 86400000), paymentConfirmedAt: now, paidAmount: 160000, paidCurrency: "IQD" } });
    report = await loadAcquisitionReport(30, new Date(now.getTime() + 1)); assert.equal(report.cohorts.find(row => row.campaign === "review")?.paid, 1);
    await prisma.financeTransaction.createMany({ data: [
      { doctorId: general.id, type: "income", category: "other", amount: 10.25, currency: "USD", paymentMethod: null, transactionDate: new Date("2026-10-18") },
      { doctorId: general.id, type: "income", category: "other", amount: 2.75, currency: "USD", paymentMethod: "cash", transactionDate: new Date("2026-10-18") },
      { doctorId: general.id, type: "expense", category: "rent", amount: 3, currency: "USD", paymentMethod: "cash", transactionDate: new Date("2026-10-18") },
      { doctorId: dental.id, type: "income", category: "other", amount: 999, currency: "USD", transactionDate: new Date("2026-10-18") },
    ] });
    const summary = await loadFinanceSummary(Number(general.id), "USD"); assert.equal(summary.totalIncome, 13); assert.equal(summary.totalExpenses, 3); assert.equal(summary.balance, 10); assert.equal(summary.byPaymentMethod.length, 1); assert.equal(summary.byPaymentMethod[0].count, 3);
    const { loadSpendReport, spendSchema } = await import("../product-analytics/spend");
    assert.equal(spendSchema.safeParse({ source: "facebook", campaign: "review", from: "2026-10-01", to: "2026-10-18", amount: 160000, currency: "IQD", verified: false }).success, false);
    await prisma.acquisitionSpend.create({ data: { source: "facebook", campaign: "review", fromDate: registered, toDate: now, amount: 10000, currency: "IQD", createdBy: general.id } });
    const spend = (await loadSpendReport(30)).find(row => row.campaign === "review")!;
    assert.equal(spend.accounts, 1); assert.equal(spend.costPerAccount, 10000); assert.equal(spend.costPerPaid, 10000);
    await prisma.acquisitionSpend.deleteMany({ where: { campaign: "review" } });
    assert.throws(() => parseFinanceRange(new URLSearchParams("from=2026-02-30"))); assert.throws(() => parseFinanceRange(new URLSearchParams("from=2026-10-19&to=2026-10-18")));
  } finally {
    await prisma.productMeasurement.deleteMany({ where: { visitKey } }); await prisma.acquisitionSpend.deleteMany({ where: { createdBy: { in: doctors } } }); await prisma.user.deleteMany({ where: { id: { in: doctors } } }); await prisma.$disconnect(); }
});
