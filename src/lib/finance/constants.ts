export type FinanceTransactionType = "income" | "expense";

export type FinanceIncomeCategory =
  | "consultation"
  | "follow_up"
  | "procedure"
  | "lab"
  | "other_income";

export type FinanceExpenseCategory =
  | "rent"
  | "salary"
  | "supplies"
  | "utilities"
  | "maintenance"
  | "marketing"
  | "other_expense";

export type PaymentMethod = "cash" | "card" | "transfer";

export const FINANCE_INCOME_CATEGORIES: Array<{
  id: FinanceIncomeCategory;
  label: string;
}> = [
  { id: "consultation", label: "كشفية / استشارة" },
  { id: "follow_up", label: "متابعة" },
  { id: "procedure", label: "إجراء طبي" },
  { id: "lab", label: "تحاليل / أشعة" },
  { id: "other_income", label: "إيراد آخر" },
];

export const FINANCE_EXPENSE_CATEGORIES: Array<{
  id: FinanceExpenseCategory;
  label: string;
}> = [
  { id: "rent", label: "إيجار العيادة" },
  { id: "salary", label: "رواتب" },
  { id: "supplies", label: "مستلزمات طبية" },
  { id: "utilities", label: "كهرباء / ماء / إنترنت" },
  { id: "maintenance", label: "صيانة" },
  { id: "marketing", label: "إعلانات" },
  { id: "other_expense", label: "مصروف آخر" },
];

export const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string }> = [
  { id: "cash", label: "نقداً" },
  { id: "card", label: "بطاقة" },
  { id: "transfer", label: "تحويل" },
];

export function financeCategoryLabel(
  type: FinanceTransactionType,
  category: string
): string {
  const list =
    type === "income"
      ? FINANCE_INCOME_CATEGORIES
      : FINANCE_EXPENSE_CATEGORIES;
  return list.find((c) => c.id === category)?.label ?? category;
}

export function paymentMethodLabel(method: string | null | undefined): string {
  return PAYMENT_METHODS.find((m) => m.id === method)?.label ?? method ?? "—";
}

export function formatMoney(
  amount: number | string,
  currency = "IQD",
  locale: "ar" | "en" = "ar"
): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return "—";
  const formatted = value.toLocaleString(locale === "en" ? "en-GB" : "ar-IQ", {
    maximumFractionDigits: 0,
    numberingSystem: "latn",
  });
  const code = currency === "SYP" ? "IQD" : currency;
  if (code === "IQD") {
    return locale === "en" ? `${formatted} IQD` : `${formatted} د.ع`;
  }
  return `${formatted} ${code}`;
}

export function defaultAmountForCategory(
  category: string,
  settings: {
    consultationFee: number;
    followUpFee: number;
    procedureFee: number;
  }
): number | null {
  if (category === "consultation") return settings.consultationFee;
  if (category === "follow_up") return settings.followUpFee;
  if (category === "procedure") return settings.procedureFee;
  return null;
}
