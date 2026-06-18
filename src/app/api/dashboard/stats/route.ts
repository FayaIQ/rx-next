import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk } from "@/lib/api/response";

export async function GET() {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [
    doctorsCount,
    secretariesCount,
    patientsCount,
    activeSubs,
    expiredSubs,
    trialSubs,
    newDoctorsWeek,
    newPatientsWeek,
    appointmentsWeek,
    genderStats,
    recentAppointments,
  ] = await Promise.all([
    prisma.user.count({ where: { type: "doctor" } }),
    prisma.user.count({ where: { type: "secretary" } }),
    prisma.patient.count(),
    prisma.subscription.count({
      where: { status: "active", endsAt: { gt: now } },
    }),
    prisma.subscription.count({
      where: {
        OR: [
          { status: { not: "active" } },
          { endsAt: { lte: now } },
        ],
      },
    }),
    prisma.subscription.count({
      where: {
        planType: "trial",
        status: "active",
        endsAt: { gt: now },
      },
    }),
    prisma.user.count({
      where: { type: "doctor", createdAt: { gte: weekAgo } },
    }),
    prisma.patient.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.appointment.count({
      where: { appointmentDatetime: { gte: weekAgo } },
    }),
    prisma.patient.groupBy({
      by: ["gender"],
      _count: { gender: true },
    }),
    prisma.appointment.findMany({
      where: { appointmentDatetime: { gte: monthAgo } },
      select: { appointmentDatetime: true },
      take: 500,
    }),
  ]);

  const appointmentsByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    appointmentsByDay[key] = 0;
  }
  recentAppointments.forEach((a) => {
    const key = a.appointmentDatetime.toISOString().slice(0, 10);
    if (key in appointmentsByDay) {
      appointmentsByDay[key]++;
    }
  });

  return apiOk({
    stats: {
      doctorsCount,
      secretariesCount,
      patientsCount,
      activeSubs,
      expiredSubs,
      trialSubs,
      newDoctorsWeek,
      newPatientsWeek,
      appointmentsWeek,
    },
    demographics: genderStats.map((g) => ({
      gender: g.gender,
      count: g._count.gender,
    })),
    appointmentsChart: Object.entries(appointmentsByDay).map(([date, count]) => ({
      date,
      count,
    })),
  });
}
