type Money = number | { toString(): string };

export type SessionBilling = {
  fee: number | null;
  currency: string;
  paid: number;
  remaining: number;
  status: "unpriced" | "unpaid" | "partial" | "paid";
};

export type AccountTotal = { currency: string; total: number; paid: number; remaining: number };

export function sessionBalance(session: {
  fee?: Money | null;
  currency?: string;
  payments?: Array<{ amount: Money }>;
}): SessionBilling {
  const fee = session.fee == null ? null : Number(session.fee);
  const paidCents = (session.payments ?? []).reduce((sum, p) => sum + Math.round(Number(p.amount) * 100), 0);
  const remaining = fee == null ? 0 : Math.max(0, Math.round(fee * 100) - paidCents) / 100;
  return {
    fee, currency: session.currency ?? "IQD", paid: paidCents / 100, remaining,
    status: fee == null ? "unpriced" : remaining === 0 ? "paid" : paidCents > 0 ? "partial" : "unpaid",
  };
}

export function accountTotals(sessions: Array<Parameters<typeof sessionBalance>[0]>): AccountTotal[] {
  const totals = new Map<string, AccountTotal>();
  for (const session of sessions) {
    const bill = sessionBalance(session);
    if (bill.fee === null) continue;
    const row = totals.get(bill.currency) ?? { currency: bill.currency, total: 0, paid: 0, remaining: 0 };
    row.total = Math.round((row.total + bill.fee) * 100) / 100;
    row.paid = Math.round((row.paid + bill.paid) * 100) / 100;
    row.remaining = Math.round((row.remaining + bill.remaining) * 100) / 100;
    totals.set(row.currency, row);
  }
  return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
