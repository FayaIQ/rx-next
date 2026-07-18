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

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
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

  const [incomeAgg, expenseAgg, incomeCount, expenseCount, rows] =
    await Promise.all([
      prisma.financeTransaction.aggregate({
        where: { ...where, type: "income" },
        _sum: { amount: true },
      }),
      prisma.financeTransaction.aggregate({
        where: { ...where, type: "expense" },
        _sum: { amount: true },
      }),
      prisma.financeTransaction.count({ where: { ...where, type: "income" } }),
      prisma.financeTransaction.count({ where: { ...where, type: "expense" } }),
      prisma.financeTransaction.findMany({
        where,
        select: {
          type: true,
          category: true,
          amount: true,
          paymentMethod: true,
          transactionDate: true,
        },
        orderBy: { transactionDate: "asc" },
      }),
    ]);

  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  const totalExpenses = Number(expenseAgg._sum.amount ?? 0);

  const categoryMap = new Map<
    string,
    { type: string; category: string; amount: number; count: number }
  >();
  const methodMap = new Map<
    string,
    { method: string; amount: number; count: number }
  >();
  const dailyMap = new Map<string, { date: string; income: number; expense: number }>();

  for (const row of rows) {
    const amount = Number(row.amount);
    const catKey = `${row.type}:${row.category}`;
    const cat = categoryMap.get(catKey) ?? {
      type: row.type,
      category: row.category,
      amount: 0,
      count: 0,
    };
    cat.amount += amount;
    cat.count += 1;
    categoryMap.set(catKey, cat);

    const method = row.paymentMethod || "cash";
    const m = methodMap.get(method) ?? { method, amount: 0, count: 0 };
    m.amount += amount;
    m.count += 1;
    methodMap.set(method, m);

    const day = dateKey(row.transactionDate);
    const d = dailyMap.get(day) ?? { date: day, income: 0, expense: 0 };
    if (row.type === "income") d.income += amount;
    else d.expense += amount;
    dailyMap.set(day, d);
  }

  const byCategory = [...categoryMap.values()].sort(
    (a, b) => b.amount - a.amount
  );
  const byPaymentMethod = [...methodMap.values()].sort(
    (a, b) => b.amount - a.amount
  );
  const daily = [...dailyMap.values()];

  return apiOk({
    summary: {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount: incomeCount + expenseCount,
      incomeCount,
      expenseCount,
      avgIncome: incomeCount > 0 ? totalIncome / incomeCount : 0,
      avgExpense: expenseCount > 0 ? totalExpenses / expenseCount : 0,
      byCategory,
      byPaymentMethod,
      daily,
    },
  });
}
