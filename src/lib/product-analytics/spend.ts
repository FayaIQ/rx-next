import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { acquisitionSchema } from "@/lib/product-analytics/shared";
import { parseFinanceRange } from "@/lib/finance/load-summary";
export const spendSchema = z.object({ source: acquisitionSchema.shape.source, campaign: z.string().regex(/^[a-zA-Z0-9_.-]{0,80}$/).default(""), from: z.string(), to: z.string(), amount: z.number().positive().max(9999999999), currency: z.enum(["IQD", "USD"]), verified: z.literal(true) }).superRefine((data, ctx) => { try { parseFinanceRange(new URLSearchParams({ from: data.from, to: data.to })); } catch { ctx.addIssue({ code: "custom", message: "الفترة غير صالحة" }); } });

export async function loadSpendReport(days: number) {
  return prisma.$queryRaw<Array<{ id: string; source: string; campaign: string; from: string; to: string; amount: number; currency: string; accounts: number; activated: number; paid: number; costPerAccount: number | null; costPerActivation: number | null; costPerPaid: number | null }>>`
    SELECT s.id::text, s.source, s.campaign, s.from_date::text AS "from", s.to_date::text AS "to", s.amount::float8 AS amount, s.currency,
      count(a.doctor_id)::int AS accounts, count(a.first_value_at)::int AS activated,
      count(a.doctor_id) FILTER (WHERE EXISTS (SELECT 1 FROM subscriptions p WHERE p.user_id=a.doctor_id AND p.payment_confirmed_at IS NOT NULL AND p.paid_amount > 0))::int AS paid,
      s.amount::float8 / nullif(count(a.doctor_id),0) AS "costPerAccount",
      s.amount::float8 / nullif(count(a.first_value_at),0) AS "costPerActivation",
      s.amount::float8 / nullif(count(a.doctor_id) FILTER (WHERE EXISTS (SELECT 1 FROM subscriptions p WHERE p.user_id=a.doctor_id AND p.payment_confirmed_at IS NOT NULL AND p.paid_amount > 0)),0) AS "costPerPaid"
    FROM acquisition_spend s LEFT JOIN clinic_acquisitions a ON a.source=s.source AND coalesce(a.campaign,'')=s.campaign AND a.account_mode='real'
      AND a.registered_at >= (s.from_date::timestamp AT TIME ZONE 'Asia/Baghdad') AND a.registered_at < ((s.to_date+1)::timestamp AT TIME ZONE 'Asia/Baghdad')
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id=a.doctor_id AND u.active_session_id='rx-public-demo-session')
    WHERE s.to_date >= current_date - ${days}::int
    GROUP BY s.id ORDER BY s.to_date DESC LIMIT 100
  `;
}
