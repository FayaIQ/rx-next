import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { sessionBillingSchema } from "@/lib/validations/session-billing";
import { accountTotals, sessionBalance } from "./session-balance";
import { serializeFinanceTransaction } from "./serializer";

export const sessionPaymentsInclude = { payments: { select: { amount: true } } } as const;

export class BillingError extends Error {}

async function lockBillingPlan(tx: Prisma.TransactionClient, doctorId: bigint, planId: bigint) {
  const rows = await tx.$queryRaw<Array<{ id: bigint }>>`SELECT id FROM treatment_plans WHERE id = ${planId} AND doctor_id = ${doctorId} FOR UPDATE`;
  if (!rows.length) throw new BillingError("خطة العلاج غير موجودة");
  return tx.treatmentPlan.findUniqueOrThrow({ where: { id: planId }, include: { payments: true } });
}

// Always lock the parent before the session, including payment deletion.
export async function lockBillingSession(tx: Prisma.TransactionClient, doctorId: bigint, sessionId: bigint) {
  const target = await tx.treatmentSession.findFirst({ where: { id: sessionId, doctorId }, select: { planId: true } });
  if (!target) throw new BillingError("الجلسة غير موجودة");
  await lockBillingPlan(tx, doctorId, target.planId);
  const rows = await tx.$queryRaw<Array<{ id: bigint }>>`SELECT id FROM treatment_sessions WHERE id = ${sessionId} AND doctor_id = ${doctorId} FOR UPDATE`;
  if (!rows.length) throw new BillingError("الجلسة غير موجودة");
  return tx.treatmentSession.findUniqueOrThrow({ where: { id: sessionId }, include: { payments: true, plan: true } });
}

export async function getPlanBilling(doctorId: bigint, planId: bigint) {
  const plan = await prisma.treatmentPlan.findFirst({ where: { id: planId, doctorId }, include: { payments: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }] } } });
  if (!plan) return null;
  if (plan.pricingMode !== "plan") throw new BillingError("هذه الخطة مسعّرة لكل جلسة بشكل مستقل");
  return { billing: { ...sessionBalance(plan), scope: "plan" as const }, payments: plan.payments.map(serializeFinanceTransaction) };
}

export async function savePlanBillingInTransaction(tx: Prisma.TransactionClient, doctorId: bigint, userId: bigint, planId: bigint, input: z.input<typeof sessionBillingSchema>) {
  const data = sessionBillingSchema.parse(input);
  const plan = await lockBillingPlan(tx, doctorId, planId);
  if (plan.pricingMode !== "plan") throw new BillingError("هذه الخطة مسعّرة لكل جلسة بشكل مستقل");
  const previous = await tx.financeTransaction.findUnique({ where: { paymentRequestId: data.requestId } });
  if (previous) {
    if (previous.doctorId !== doctorId || previous.treatmentPlanId !== planId || Number(previous.amount) !== data.amount || previous.currency !== data.currency || previous.paymentMethod !== data.paymentMethod || previous.transactionDate.toISOString().slice(0, 10) !== data.transactionDate) throw new BillingError("طلب الدفع مستخدم لدفعة أخرى؛ حدّث الصفحة وحاول مجدداً");
    return;
  }
  const bill = sessionBalance(plan);
  const fee = data.fee === undefined ? bill.fee : data.fee;
  if (bill.paid > 0 && data.currency !== plan.currency) throw new BillingError("لا يمكن تغيير العملة بعد تسجيل دفعات");
  if (fee === null && (bill.paid > 0 || data.amount > 0)) throw new BillingError("حدد سعر الخطة قبل تسجيل الدفعة");
  if (fee !== null && Math.round((bill.paid + data.amount) * 100) > Math.round(fee * 100)) throw new BillingError("مجموع المدفوعات لا يمكن أن يتجاوز سعر الخطة");
  await tx.treatmentPlan.update({ where: { id: planId }, data: { fee, currency: data.currency, updatedAt: new Date() } });
  if (data.amount > 0) await tx.financeTransaction.create({ data: {
    doctorId, patientId: plan.patientId, treatmentPlanId: planId,
    paymentRequestId: data.requestId, type: "income", category: "procedure",
    amount: data.amount, currency: data.currency, paymentMethod: data.paymentMethod,
    description: data.description || `دفعة خطة علاج — ${plan.title ?? plan.treatmentType}`,
    transactionDate: new Date(`${data.transactionDate}T00:00:00Z`), createdById: userId,
  } });
  await tx.patient.update({ where: { id: plan.patientId }, data: { updatedAt: new Date() } });
}

export async function savePlanBilling(doctorId: bigint, userId: bigint, planId: bigint, input: z.input<typeof sessionBillingSchema>) {
  await prisma.$transaction(tx => savePlanBillingInTransaction(tx, doctorId, userId, planId, input));
  return getPlanBilling(doctorId, planId);
}

export async function deletePlanPayment(doctorId: bigint, planId: bigint, paymentId: bigint) {
  await prisma.$transaction(async tx => {
    const plan = await lockBillingPlan(tx, doctorId, planId);
    const payment = await tx.financeTransaction.findFirst({ where: { id: paymentId, doctorId, treatmentPlanId: planId } });
    if (!payment) throw new BillingError("الدفعة غير موجودة");
    await tx.financeTransaction.delete({ where: { id: paymentId } });
    await tx.treatmentPlan.update({ where: { id: planId }, data: { updatedAt: new Date() } });
    await tx.patient.update({ where: { id: plan.patientId }, data: { updatedAt: new Date() } });
  });
}

export async function getSessionBilling(doctorId: bigint, sessionId: bigint) {
  const session = await prisma.treatmentSession.findFirst({
    where: { id: sessionId, doctorId },
    include: { plan: true, payments: { orderBy: [{ transactionDate: "desc" }, { id: "desc" }] } },
  });
  if (!session) return null;
  if (session.plan.pricingMode === "plan") return getPlanBilling(doctorId, session.planId);
  return { billing: sessionBalance(session), payments: session.payments.map(serializeFinanceTransaction) };
}

export async function saveSessionBillingInTransaction(tx: Prisma.TransactionClient, doctorId: bigint, userId: bigint, sessionId: bigint, input: z.input<typeof sessionBillingSchema>) {
    const data = sessionBillingSchema.parse(input);
    const session = await lockBillingSession(tx, doctorId, sessionId);
    if (session.plan.pricingMode === "plan") return savePlanBillingInTransaction(tx, doctorId, userId, session.planId, data);
    const previous = await tx.financeTransaction.findUnique({ where: { paymentRequestId: data.requestId } });
    if (previous) {
      if (previous.doctorId !== doctorId || previous.treatmentSessionId !== sessionId || Number(previous.amount) !== data.amount || previous.currency !== data.currency || previous.paymentMethod !== data.paymentMethod || previous.transactionDate.toISOString().slice(0, 10) !== data.transactionDate) {
        throw new BillingError("طلب الدفع مستخدم لدفعة أخرى؛ حدّث الصفحة وحاول مجدداً");
      }
      return;
    }
    const bill = sessionBalance(session);
    const fee = data.fee === undefined ? bill.fee : data.fee;
    if (bill.paid > 0 && data.currency !== session.currency) throw new BillingError("لا يمكن تغيير العملة بعد تسجيل دفعات");
    if (fee === null && (bill.paid > 0 || data.amount > 0)) throw new BillingError("حدد سعر الجلسة قبل تسجيل الدفعة");
    if (fee !== null && Math.round((bill.paid + data.amount) * 100) > Math.round(fee * 100)) throw new BillingError("مجموع المدفوعات لا يمكن أن يتجاوز سعر الجلسة");
    await tx.treatmentSession.update({ where: { id: sessionId }, data: { fee, currency: data.currency } });
    if (data.amount > 0) {
      await tx.financeTransaction.create({ data: {
        doctorId, patientId: session.patientId, treatmentSessionId: sessionId,
        paymentRequestId: data.requestId, type: "income", category: "procedure",
        amount: data.amount, currency: data.currency, paymentMethod: data.paymentMethod,
        description: data.description || `دفعة جلسة #${session.sessionNumber}`,
        transactionDate: new Date(`${data.transactionDate}T00:00:00Z`), createdById: userId,
      } });
    }
    await tx.treatmentPlan.update({ where: { id: session.planId }, data: { updatedAt: new Date() } });
    await tx.patient.update({ where: { id: session.patientId }, data: { updatedAt: new Date() } });
}

export async function saveSessionBilling(doctorId: bigint, userId: bigint, sessionId: bigint, input: z.input<typeof sessionBillingSchema>) {
  await prisma.$transaction(tx => saveSessionBillingInTransaction(tx, doctorId, userId, sessionId, input));
  return getSessionBilling(doctorId, sessionId);
}

export async function deleteSessionPayment(doctorId: bigint, sessionId: bigint, paymentId: bigint) {
  await prisma.$transaction(async (tx) => {
    const session = await lockBillingSession(tx, doctorId, sessionId);
    const payment = await tx.financeTransaction.findFirst({ where: { id: paymentId, doctorId, treatmentSessionId: sessionId } });
    if (!payment) throw new BillingError("الدفعة غير موجودة");
    await tx.financeTransaction.delete({ where: { id: paymentId } });
    await tx.treatmentSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    await tx.treatmentPlan.update({ where: { id: session.planId }, data: { updatedAt: new Date() } });
    await tx.patient.update({ where: { id: session.patientId }, data: { updatedAt: new Date() } });
  });
}

export async function deleteUnbilledSession(doctorId: bigint, sessionId: bigint) {
  await prisma.$transaction(async tx => {
    const session = await lockBillingSession(tx, doctorId, sessionId);
    if (Number(session.fee ?? 0) > 0 || session.payments.length) throw new BillingError("لا يمكن حذف جلسة لها أجور أو دفعات؛ راجع حساب الجلسة أولاً");
    await tx.treatmentSession.delete({ where: { id: sessionId } });
  });
}

export async function deleteUnbilledPlan(doctorId: bigint, planId: bigint) {
  await prisma.$transaction(async tx => {
    // Lock the parent first; concurrent session inserts cannot escape this check.
    const plans = await tx.$queryRaw<Array<{ id: bigint }>>`SELECT id FROM treatment_plans WHERE id = ${planId} AND doctor_id = ${doctorId} FOR UPDATE`;
    if (!plans.length) throw new BillingError("خطة العلاج غير موجودة");
    const plan = await tx.treatmentPlan.findUniqueOrThrow({ where: { id: planId }, include: sessionPaymentsInclude });
    if (Number(plan.fee ?? 0) > 0 || plan.payments.length) throw new BillingError("لا يمكن حذف خطة لها أجور أو دفعات؛ راجع حساب الخطة أولاً");
    await tx.$queryRaw`SELECT id FROM treatment_sessions WHERE plan_id = ${planId} ORDER BY id FOR UPDATE`;
    const billed = await tx.treatmentSession.findFirst({ where: { planId, OR: [{ fee: { gt: 0 } }, { payments: { some: {} } }] } });
    if (billed) throw new BillingError("لا يمكن حذف خطة لها أجور أو دفعات؛ راجع حساب الجلسات أولاً");
    await tx.treatmentPlan.delete({ where: { id: planId } });
  });
}

export async function deleteUnbilledPatient(doctorId: bigint, patientId: bigint) {
  await prisma.$transaction(async tx => {
    const patients = await tx.$queryRaw<Array<{ id: bigint }>>`SELECT id FROM patients WHERE id = ${patientId} AND doctor_id = ${doctorId} FOR UPDATE`;
    if (!patients.length) throw new BillingError("المريض غير موجود");
    await tx.$queryRaw`SELECT id FROM treatment_plans WHERE patient_id = ${patientId} ORDER BY id FOR UPDATE`;
    if (await tx.treatmentPlan.findFirst({ where: { patientId, OR: [{ fee: { gt: 0 } }, { payments: { some: {} } }] } })) throw new BillingError("لا يمكن حذف مريض لديه أجور خطط أو دفعات مسجلة؛ راجع حسابه أولاً");
    await tx.$queryRaw`SELECT id FROM treatment_sessions WHERE patient_id = ${patientId} ORDER BY id FOR UPDATE`;
    if (await tx.treatmentSession.findFirst({ where: { patientId, OR: [{ fee: { gt: 0 } }, { payments: { some: {} } }] } })) throw new BillingError("لا يمكن حذف مريض لديه أجور جلسات أو دفعات مسجلة؛ راجع حسابه أولاً");
    await tx.patient.delete({ where: { id: patientId } });
  });
}

export async function loadPatientAccount(doctorId: bigint, patientId: bigint) {
  const plans = await prisma.treatmentPlan.findMany({ where: { doctorId, patientId, pricingMode: "plan" }, include: sessionPaymentsInclude, orderBy: { id: "desc" } });
  const sessions = await prisma.treatmentSession.findMany({
    where: { doctorId, patientId, plan: { pricingMode: "per_session" } },
    include: { ...sessionPaymentsInclude, plan: { select: { title: true, toothFdi: true, toothFdis: true, treatmentType: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return {
    totals: accountTotals([...plans, ...sessions]),
    plans: plans.map(p => ({ id: Number(p.id), planTitle: p.title, toothFdi: p.toothFdi, toothFdis: p.toothFdis, treatmentType: p.treatmentType, billing: { ...sessionBalance(p), scope: "plan" as const } })),
    sessions: sessions.map(s => ({ id: Number(s.id), sessionNumber: s.sessionNumber, status: s.status, planTitle: s.plan.title, toothFdi: s.plan.toothFdi, toothFdis: s.plan.toothFdis, treatmentType: s.plan.treatmentType, billing: sessionBalance(s) })),
  };
}

export async function loadPatientDebtMap(doctorId: bigint, patientIds: bigint[]) {
  if (!patientIds.length) return new Map<number, ReturnType<typeof accountTotals>>();
  const sessions = await prisma.treatmentSession.findMany({ where: { doctorId, patientId: { in: patientIds }, plan: { pricingMode: "per_session" }, fee: { not: null } }, include: sessionPaymentsInclude });
  const plans = await prisma.treatmentPlan.findMany({ where: { doctorId, patientId: { in: patientIds }, pricingMode: "plan", fee: { not: null } }, include: sessionPaymentsInclude });
  const groups = new Map<number, Array<(typeof sessions)[number] | (typeof plans)[number]>>();
  for (const session of [...sessions, ...plans]) {
    const id = Number(session.patientId);
    const rows = groups.get(id) ?? [];
    rows.push(session); groups.set(id, rows);
  }
  return new Map([...groups].map(([id, rows]) => [id, accountTotals(rows)]));
}
