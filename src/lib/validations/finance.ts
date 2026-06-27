import { z } from "zod";
import {
  FINANCE_EXPENSE_CATEGORIES,
  FINANCE_INCOME_CATEGORIES,
  PAYMENT_METHODS,
} from "@/lib/finance/constants";

const incomeIds = FINANCE_INCOME_CATEGORIES.map((c) => c.id);
const expenseIds = FINANCE_EXPENSE_CATEGORIES.map((c) => c.id);
const paymentIds = PAYMENT_METHODS.map((m) => m.id);

export const financeSettingsSchema = z.object({
  consultationFee: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالباً"),
  followUpFee: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالباً"),
  procedureFee: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالباً"),
  currency: z.string().min(1).default("SYP"),
});

export const financeTransactionSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    category: z.string().min(1, "اختر التصنيف"),
    amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
    paymentMethod: z.enum(paymentIds).nullable().optional(),
    description: z.string().nullable().optional(),
    transactionDate: z.string().min(1, "التاريخ مطلوب"),
    patientId: z.coerce.number().int().positive().nullable().optional(),
    appointmentId: z.coerce.number().int().positive().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const allowed =
      data.type === "income"
        ? incomeIds.includes(data.category as (typeof incomeIds)[number])
        : expenseIds.includes(data.category as (typeof expenseIds)[number]);
    if (!allowed) {
      ctx.addIssue({
        code: "custom",
        message: "تصنيف غير صالح",
        path: ["category"],
      });
    }
    if (data.type === "expense" && !data.paymentMethod) {
      ctx.addIssue({
        code: "custom",
        message: "اختر طريقة الدفع",
        path: ["paymentMethod"],
      });
    }
  });

export const financeTransactionUpdateSchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().min(1).optional(),
  amount: z.coerce.number().positive().optional(),
  paymentMethod: z.enum(paymentIds).nullable().optional(),
  description: z.string().nullable().optional(),
  transactionDate: z.string().min(1).optional(),
  patientId: z.coerce.number().int().positive().nullable().optional(),
  appointmentId: z.coerce.number().int().positive().nullable().optional(),
});
