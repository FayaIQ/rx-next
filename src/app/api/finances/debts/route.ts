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
    where: { doctorId: toDbId(ctx.doctorId), fee: { gt: 0 } },
    include: { ...sessionPaymentsInclude, patient: { select: { id: true, name: true } } },
  });
  const groups = new Map<number, typeof sessions>();
  for (const session of sessions) {
    const id = Number(session.patientId);
    const group = groups.get(id) ?? []; group.push(session); groups.set(id, group);
  }
  return apiOk({
    totals: accountTotals(sessions),
    patients: [...groups].map(([id, rows]) => ({ id, name: rows[0].patient.name, totals: accountTotals(rows) }))
      .filter(p => p.totals.some(t => t.remaining > 0)).sort((a, b) => a.name.localeCompare(b.name)),
  });
}
