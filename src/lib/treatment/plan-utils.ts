import { prisma } from "@/lib/prisma";

export async function refreshPlanStatus(planId: bigint) {
  const sessions = await prisma.treatmentSession.findMany({
    where: { planId },
    select: { status: true },
  });

  if (sessions.length === 0) return;

  const allDone = sessions.every(
    (s) => s.status === "completed" || s.status === "cancelled" || s.status === "skipped"
  );
  const anyActive = sessions.some(
    (s) => s.status === "planned" || s.status === "completed"
  );

  let status = "active";
  if (allDone) status = "completed";
  else if (!anyActive) status = "cancelled";

  await prisma.treatmentPlan.update({
    where: { id: planId },
    data: { status },
  });
}

export async function assertPlanAccess(
  planId: bigint,
  doctorId: bigint
) {
  return prisma.treatmentPlan.findFirst({
    where: { id: planId, doctorId },
    include: { sessions: { orderBy: { sessionNumber: "asc" } } },
  });
}

export async function assertSessionAccess(
  sessionId: bigint,
  doctorId: bigint
) {
  return prisma.treatmentSession.findFirst({
    where: { id: sessionId, doctorId },
    include: {
      plan: true,
      patient: { select: { id: true, name: true } },
    },
  });
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function startOfDayUtc(key: string): Date {
  return parseDateKey(key);
}

export function endOfDayUtc(key: string): Date {
  const d = parseDateKey(key);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
