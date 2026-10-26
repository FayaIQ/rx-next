import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const release = process.env.RX_RELEASE_ID ?? "development";
  const headers = { "Cache-Control": "no-store" };
  try {
    // Parsing verifies the release's schema. WHERE false returns no clinical or account data.
    await prisma.$queryRaw`
      SELECT a.doctor_id, a.source, a.medium, a.campaign, a.practice_type, a.account_mode,
        a.registered_at, a.first_signin_at, a.onboarding_at, a.first_value_at, a.first_value_reported_at, a.visit_key,
        c.doctor_id, c.action_key, c.kind, c.occurred_at,
        m.route, m.metric, m.value, m.device, m.browser, m.area, m.account_mode, m.error_code,
        m.release, m.created_at, m.visit_key, m.source, m.campaign, m.user_role, m.practice_type, m.environment,
        p.source, p.campaign, p.from_date, p.to_date, p.amount, p.currency, p.created_by,
        s.payment_confirmed_at, s.paid_amount, s.paid_currency, t.client_request_id
      FROM clinic_acquisitions a, clinic_activities c, product_measurements m, acquisition_spend p,
        subscriptions s, treatment_plans t WHERE false
    `;
    return Response.json({ status: "ok", release }, { headers });
  } catch {
    return Response.json({ status: "not_ready", release }, { status: 503, headers });
  }
}
