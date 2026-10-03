/** Monetary values in different currencies must never be added together. */
export function currencyTotals(rows: Array<{ type: string; currency: string; amount: number }>) {
  const totals = new Map<string, { currency: string; income: number; expense: number; balance: number }>();
  for (const row of rows) {
    const total = totals.get(row.currency) ?? { currency: row.currency, income: 0, expense: 0, balance: 0 };
    if (row.type === "income") total.income += row.amount;
    else total.expense += row.amount;
    total.balance = total.income - total.expense;
    totals.set(row.currency, total);
  }
  return [...totals.values()];
}
