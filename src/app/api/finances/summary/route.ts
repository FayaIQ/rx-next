import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk, apiError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { loadFinanceSummary, parseFinanceRange } from "@/lib/finance/load-summary";
export async function GET(request: Request) {
  const ctx = await requireClinicApi(); if (isClinicApiError(ctx)) return ctx;
  const { searchParams } = new URL(request.url);
  let dateFilter: ReturnType<typeof parseFinanceRange>;
  try { dateFilter = parseFinanceRange(searchParams); } catch { return apiError("فترة التقرير غير صالحة"); }
  const requested = searchParams.get("currency");
  const settings = requested === "IQD" || requested === "USD" ? null : await prisma.clinicFinanceSettings.findUnique({ where: { doctorId: toDbId(ctx.doctorId) }, select: { currency: true } });
  const currency = requested === "IQD" || requested === "USD" ? requested : settings?.currency ?? "IQD";
  return apiOk({ summary: await loadFinanceSummary(ctx.doctorId, currency, dateFilter) });
}
