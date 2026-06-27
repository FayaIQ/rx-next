import { prisma } from "@/lib/prisma";
import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiOk } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";

function parseDateRange(searchParams: URLSearchParams) {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);
  return Object.keys(dateFilter).length > 0 ? dateFilter : undefined;
}

export async function GET(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const dateFilter = parseDateRange(searchParams);

  const where = {
    doctorId: toDbId(ctx.doctorId),
    ...(dateFilter ? { transactionDate: dateFilter } : {}),
  };

  const [incomeAgg, expenseAgg, count] = await Promise.all([
    prisma.financeTransaction.aggregate({
      where: { ...where, type: "income" },
      _sum: { amount: true },
    }),
    prisma.financeTransaction.aggregate({
      where: { ...where, type: "expense" },
      _sum: { amount: true },
    }),
    prisma.financeTransaction.count({ where }),
  ]);

  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  const totalExpenses = Number(expenseAgg._sum.amount ?? 0);

  return apiOk({
    summary: {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount: count,
    },
  });
}
