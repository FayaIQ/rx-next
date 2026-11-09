import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { sessionPaymentsInclude } from "@/lib/finance/session-billing-service";
import { accountTotals } from "@/lib/finance/session-balance";

export async function GET() {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;
  const sessions = await prisma.treatmentSession.findMany({
    where: { doctorId: toDbId(ctx.doctorId), fee: { gt: 0 }, plan: { pricingMode: "per_session" } },
    include: { ...sessionPaymentsInclude, patient: { select: { id: true, name: true } } },
  });
  const plans = await prisma.treatmentPlan.findMany({
    where: { doctorId: toDbId(ctx.doctorId), pricingMode: "plan", fee: { gt: 0 } },
    include: { ...sessionPaymentsInclude, patient: { select: { id: true, name: true } } },
  });
  const accounts = [...sessions, ...plans];
  const groups = new Map<number, typeof accounts>();
  for (const session of accounts) {
    const id = Number(session.patientId);
    const group = groups.get(id) ?? []; group.push(session); groups.set(id, group);
  }
  return apiOk({
    totals: accountTotals(accounts),
    patients: [...groups].map(([id, rows]) => ({ id, name: rows[0].patient.name, totals: accountTotals(rows) }))
      .filter(p => p.totals.some(t => t.remaining > 0)).sort((a, b) => a.name.localeCompare(b.name)),
  });
}
