import { prisma } from "@/lib/prisma";

/** Counts anonymous visits that actually saw marketing, then matches the same visit's account creation. */
export async function loadVisitorFunnel(days: number) {
  return prisma.$queryRaw<Array<{ source: string; campaign: string | null; environment: string; qualifiedVisits: number; signupVisits: number; createdVisits: number }>>`
    WITH qualified AS (
      SELECT m.visit_key, m.source, m.campaign, m.environment, min(m.created_at) AS started_at
      FROM product_measurements m
      WHERE m.created_at >= now() - ${days} * interval '1 day'
        AND m.metric='page_view' AND m.area='marketing' AND m.account_mode='visitor' AND m.visit_key IS NOT NULL
        AND m.route IN ('/', '/clinic/free-trial', '/blog', '/solutions', '/features', '/compare', '/about')
        AND NOT EXISTS (SELECT 1 FROM product_measurements x WHERE x.visit_key=m.visit_key AND (x.user_role='admin' OR x.account_mode IN ('demo','test')))
      GROUP BY m.visit_key, m.source, m.campaign, m.environment
    )
    SELECT q.source, q.campaign, q.environment, count(*)::int AS "qualifiedVisits",
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM product_measurements m WHERE m.visit_key=q.visit_key AND m.metric='signup_started' AND m.environment=q.environment))::int AS "signupVisits",
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM clinic_acquisitions a JOIN users u ON u.id=a.doctor_id WHERE a.visit_key=q.visit_key AND a.account_mode='real' AND u.type='doctor' AND u.active_session_id IS DISTINCT FROM 'rx-public-demo-session' AND a.registered_at >= q.started_at))::int AS "createdVisits"
    FROM qualified q GROUP BY q.source, q.campaign, q.environment ORDER BY "qualifiedVisits" DESC LIMIT 100
  `;
}
