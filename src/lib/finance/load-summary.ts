import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";

export function parseFinanceRange(params: URLSearchParams) {
  const parse = (value: string | null) => {
    if (!value) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("التاريخ غير صالح");
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("التاريخ غير صالح");
    return date;
  };
  const gte = parse(params.get("from")), lte = parse(params.get("to"));
  if (gte && lte && gte > lte) throw new Error("بداية الفترة بعد نهايتها");
  return gte || lte ? { gte, lte } : undefined;
}

export async function loadFinanceSummary(doctorId: number, currency: string, transactionDate?: { gte?: Date; lte?: Date }) {
  const where = { doctorId: toDbId(doctorId), currency, ...(transactionDate ? { transactionDate } : {}) };
  // Return grouped results rather than transfer every ledger row to Node.
  const [totals, categories, methods, days] = await Promise.all([
    prisma.financeTransaction.groupBy({ by: ["type"], where, _sum: { amount: true }, _count: { _all: true } }),
    prisma.financeTransaction.groupBy({ by: ["type", "category"], where, _sum: { amount: true }, _count: { _all: true } }),
    prisma.financeTransaction.groupBy({ by: ["paymentMethod"], where, _sum: { amount: true }, _count: { _all: true } }),
    prisma.financeTransaction.groupBy({ by: ["transactionDate", "type"], where, _sum: { amount: true }, orderBy: { transactionDate: "asc" } }),
  ]);
  const income = totals.find(row => row.type === "income"), expenses = totals.find(row => row.type === "expense");
  const totalIncome = Number(income?._sum.amount ?? 0), totalExpenses = Number(expenses?._sum.amount ?? 0);
  const incomeCount = income?._count._all ?? 0, expenseCount = expenses?._count._all ?? 0;
  const byPaymentMethod = new Map<string, { method: string; amount: number; count: number }>();
  for (const row of methods) {
    const method = row.paymentMethod || "cash"; const value = byPaymentMethod.get(method) ?? { method, amount: 0, count: 0 };
    value.amount += Number(row._sum.amount ?? 0); value.count += row._count._all; byPaymentMethod.set(method, value);
  }
  const daily = new Map<string, { date: string; income: number; expense: number }>();
  for (const row of days) {
    const date = row.transactionDate.toISOString().slice(0, 10), value = daily.get(date) ?? { date, income: 0, expense: 0 };
    if (row.type === "income") value.income += Number(row._sum.amount ?? 0); else value.expense += Number(row._sum.amount ?? 0);
    daily.set(date, value);
  }
  return { currency, totalIncome, totalExpenses, balance: totalIncome - totalExpenses, transactionCount: incomeCount + expenseCount, incomeCount, expenseCount, avgIncome: incomeCount ? totalIncome / incomeCount : 0, avgExpense: expenseCount ? totalExpenses / expenseCount : 0,
    byCategory: categories.map(row => ({ type: row.type, category: row.category, amount: Number(row._sum.amount ?? 0), count: row._count._all })).sort((a, b) => b.amount - a.amount),
    byPaymentMethod: [...byPaymentMethod.values()].sort((a, b) => b.amount - a.amount), daily: [...daily.values()] };
}
