import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { PUBLIC_DEMO_SESSION_ID } from "@/lib/demo/constants";

export async function markClinicMilestone(doctorId: number, milestone: "firstSigninAt" | "onboardingAt") {
  try {
    await prisma.clinicAcquisition.updateMany({ where: { doctorId: toDbId(doctorId), [milestone]: null }, data: { [milestone]: new Date() } });
  } catch { console.warn("Clinic milestone could not be recorded"); }
}

/** The database save is authoritative. Replays share a unique internal action key. */
export async function recordClinicActivity(doctorId: number, kind: "prescription" | "treatment_plan" | "treatment_session" | "visit", id: bigint | number, occurredAt = new Date()) {
  try {
    const doctorDbId = toDbId(doctorId);
    const acquisition = await prisma.clinicAcquisition.findUnique({ where: { doctorId: doctorDbId }, include: { doctor: { select: { activeSessionId: true } } } });
    if (!acquisition || acquisition.accountMode !== "real" || acquisition.doctor.activeSessionId === PUBLIC_DEMO_SESSION_ID) return false;
    const qualifies = acquisition.practiceType === "dental" ? kind === "treatment_plan" || kind === "treatment_session" : kind === "prescription";
    return await prisma.$transaction(async tx => {
      await tx.clinicActivity.createMany({ data: [{ doctorId: doctorDbId, kind, actionKey: `${kind}:${id}`, occurredAt }], skipDuplicates: true });
      if (!qualifies) return false;
      const result = await tx.clinicAcquisition.updateMany({ where: { doctorId: doctorDbId, firstValueAt: null }, data: { firstValueAt: occurredAt } });
      return result.count === 1;
    });
  } catch { console.warn("Clinic activity could not be recorded"); return false; }
}

export async function getClinicActivation(doctorId: number) {
  const row = await prisma.clinicAcquisition.findUnique({ where: { doctorId: toDbId(doctorId) }, include: { doctor: { select: { activeSessionId: true } } } });
  if (row?.doctor.activeSessionId === PUBLIC_DEMO_SESSION_ID) return null;
  if (!row || row.accountMode !== "real") return null;
  return { practiceType: row.practiceType, onboardingCompleted: !!row.onboardingAt, firstValueCompleted: !!row.firstValueAt, firstValueAt: row.firstValueAt?.toISOString() ?? null };
}

export async function claimFirstValueEvent(doctorId: number) {
  const result = await prisma.clinicAcquisition.updateMany({
    where: { doctorId: toDbId(doctorId), accountMode: "real", firstValueAt: { not: null }, firstValueReportedAt: null },
    data: { firstValueReportedAt: new Date() },
  });
  return result.count === 1;
}

export function retentionWindow(firstValueAt: Date, day: 7 | 14, now: Date) {
  const start = new Date(firstValueAt.getTime() + day * 86400000);
  const end = new Date(start.getTime() + 86400000);
  return { start, end, eligible: now >= end };
}

export async function loadAcquisitionReport(days = 30, now = new Date()) {
  const from = new Date(now.getTime() - days * 86400000);
  const cohorts = await prisma.clinicAcquisition.findMany({
    where: { accountMode: "real", registeredAt: { gte: from, lte: now }, doctor: { type: "doctor", OR: [{ activeSessionId: null }, { activeSessionId: { not: PUBLIC_DEMO_SESSION_ID } }] } },
    include: {
      doctor: { select: {
        clinicActivities: { where: { occurredAt: { gte: from, lte: now } }, select: { occurredAt: true } },
        subscriptions: { where: { OR: [{ paymentConfirmedAt: { not: null, lte: now }, paidAmount: { gt: 0 } }, { planType: "trial" }, { package: { isTrial: true } }] }, select: { planType: true, endsAt: true, package: { select: { isTrial: true } }, paymentConfirmedAt: true, paidAmount: true, paidCurrency: true } },
      } },
    },
  });
  type Bucket = { source: string; campaign: string | null; practiceType: string; registered: number; signedIn: number; onboarded: number; activated: number; eligible48h: number; activated48h: number; eligibleD7: number; returnedD7: number; eligibleD14: number; returnedD14: number; paid: number; eligibleTrialEnded: number; paidAfterTrial: number; firstValueSeconds: number[]; revenue: Record<string, number> };
  const buckets = new Map<string, Bucket>();
  for (const row of cohorts) {
    const key = `${row.source}:${row.campaign ?? ""}:${row.practiceType}`;
    const b = buckets.get(key) ?? { source: row.source, campaign: row.campaign, practiceType: row.practiceType, registered: 0, signedIn: 0, onboarded: 0, activated: 0, eligible48h: 0, activated48h: 0, eligibleD7: 0, returnedD7: 0, eligibleD14: 0, returnedD14: 0, paid: 0, eligibleTrialEnded: 0, paidAfterTrial: 0, firstValueSeconds: [], revenue: {} };
    b.registered++;
    if (row.firstSigninAt) b.signedIn++;
    if (row.onboardingAt) b.onboarded++;
    const elapsed = row.firstValueAt ? row.firstValueAt.getTime() - row.registeredAt.getTime() : null;
    if (row.firstValueAt && elapsed != null && elapsed >= 0) { b.activated++; b.firstValueSeconds.push(elapsed / 1000); }
    if (now.getTime() - row.registeredAt.getTime() >= 48 * 3600000) { b.eligible48h++; if (elapsed != null && elapsed >= 0 && elapsed <= 48 * 3600000) b.activated48h++; }
    if (row.firstValueAt) for (const day of [7, 14] as const) {
      const window = retentionWindow(row.firstValueAt, day, now);
      if (!window.eligible) continue;
      const returned = row.doctor.clinicActivities.some(a => a.occurredAt >= window.start && a.occurredAt < window.end);
      if (day === 7) { b.eligibleD7++; if (returned) b.returnedD7++; }
      else { b.eligibleD14++; if (returned) b.returnedD14++; }
    }
    const payments = row.doctor.subscriptions.filter(p => p.paymentConfirmedAt && p.paymentConfirmedAt <= now && Number(p.paidAmount) > 0);
    if (payments.length) b.paid++;
    if (row.doctor.subscriptions.some(p => (p.planType === "trial" || p.package?.isTrial) && p.endsAt <= now)) { b.eligibleTrialEnded++; if (payments.length) b.paidAfterTrial++; }
    for (const payment of payments) { const currency = payment.paidCurrency ?? "IQD"; b.revenue[currency] = (b.revenue[currency] ?? 0) + Number(payment.paidAmount ?? 0); }
    buckets.set(key, b);
  }
  return {
    from: from.toISOString(), to: now.toISOString(), days, cohortSize: cohorts.length,
    definitions: { firstValue: "general: saved prescription; dental: saved treatment plan or completed session", retention: "a saved work action in [first value + D, first value + D + 1 day); only completed windows", payment: "explicit administrator confirmation with positive amount", coverage: "self-registered accounts since instrumentation; legacy accounts are excluded" },
    cohorts: [...buckets.values()].map(({ firstValueSeconds, ...bucket }) => {
      firstValueSeconds.sort((a, b) => a - b); const n = firstValueSeconds.length;
      return { ...bucket, medianFirstValueSeconds: n ? (firstValueSeconds[Math.floor((n - 1) / 2)] + firstValueSeconds[Math.floor(n / 2)]) / 2 : null };
    }),
  };
}
