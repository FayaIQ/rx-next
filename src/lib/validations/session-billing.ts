import { z } from "zod";

const money = z.number().finite().min(0).max(9999999999.99);
export const sessionBillingSchema = z.object({
  fee: money.nullable().optional(),
  currency: z.enum(["IQD", "USD"]),
  amount: money.default(0),
  requestId: z.string().uuid(),
  paymentMethod: z.enum(["cash", "card", "transfer"]).default("cash"),
  transactionDate: z.iso.date(),
  description: z.string().trim().max(2000).optional(),
}).superRefine((data, ctx) => {
  const scale = data.currency === "IQD" ? 1 : 100;
  for (const key of ["fee", "amount"] as const) {
    const amount = data[key];
    if (amount != null && Math.abs(amount * scale - Math.round(amount * scale)) > 0.0001) {
      ctx.addIssue({ code: "custom", path: [key], message: data.currency === "IQD" ? "مبلغ الدينار يجب أن يكون عدداً صحيحاً" : "المبلغ يقبل منزلتين عشريتين فقط" });
    }
  }
});

export type SessionBillingInput = z.input<typeof sessionBillingSchema>;
