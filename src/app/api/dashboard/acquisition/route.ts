import { loadVisitorFunnel } from "@/lib/product-analytics/funnel";
import { spendSchema, loadSpendReport } from "@/lib/product-analytics/spend";
import { toDbId } from "@/lib/bigint";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk, apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { loadAcquisitionReport } from "@/lib/product-analytics/server";

export async function GET(request: Request) {
  const ctx = await requireAdminApi(); if (isAdminApiError(ctx)) return ctx;
  const parsed = Number(new URL(request.url).searchParams.get("days") ?? 30);
  const days = [7, 14, 30, 90].includes(parsed) ? parsed : 30;
  const [acquisition, performance, spend, funnel] = await Promise.all([
    loadAcquisitionReport(days),
    prisma.$queryRaw<Array<{ route: string; metric: string; device: string; browser: string; area: string; accountMode: string; errorCode: string | null; release: string; environment: string; userRole: string; practiceType: string | null; samples: number; p75: number }>>`
      SELECT route, metric, device, browser, area, account_mode AS "accountMode", error_code AS "errorCode", release, environment, user_role AS "userRole", practice_type AS "practiceType",
        count(*)::int AS samples, percentile_cont(0.75) WITHIN GROUP (ORDER BY value) AS p75
      FROM product_measurements WHERE created_at >= now() - ${days} * interval '1 day'
      GROUP BY route, metric, device, browser, area, account_mode, error_code, release, environment, user_role, practice_type ORDER BY samples DESC LIMIT 250
    `,
    loadSpendReport(days),
    loadVisitorFunnel(days),
  ]);
  return apiOk({ acquisition, performance, spend, funnel });
}

export async function POST(request: Request) {
  const ctx = await requireAdminApi(); if (isAdminApiError(ctx)) return ctx;
  const parsed = spendSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("تحقق من الحملة والفترة والمبلغ وتأكيد صحة الإنفاق");
  const { source, campaign, from, to, amount, currency } = parsed.data;
  const fromDate = new Date(from), toDate = new Date(to);
  await prisma.acquisitionSpend.upsert({ where: { source_campaign_fromDate_toDate_currency: { source, campaign, fromDate, toDate, currency } }, create: { source, campaign, fromDate, toDate, amount, currency, createdBy: toDbId(ctx.adminId) }, update: { amount, createdBy: toDbId(ctx.adminId) } });
  return apiOk({ success: true });
}
