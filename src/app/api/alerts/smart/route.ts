import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { treatmentTypeLabel } from "@/lib/treatment/constants";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const doctorId = toDbId(ctx.doctorId);
  const weekAgo = daysAgo(7);
  const twoWeeksAgo = daysAgo(14);

  const [unscheduledSessions, stalledPlans] = await Promise.all([
    prisma.treatmentSession.findMany({
      where: {
        doctorId,
        status: "planned",
        scheduledDate: null,
        plan: {
          status: "active",
          createdAt: { lte: weekAgo },
        },
      },
      include: {
        patient: { select: { id: true, name: true } },
        plan: {
          select: {
            id: true,
            toothFdi: true,
            treatmentType: true,
            title: true,
            createdAt: true,
          },
        },
      },
      orderBy: { plan: { createdAt: "asc" } },
      take: 15,
    }),
    prisma.treatmentPlan.findMany({
      where: {
        doctorId,
        status: "active",
        createdAt: { lte: twoWeeksAgo },
        sessions: {
          some: { status: "planned" },
          none: { status: "completed" },
        },
      },
      include: {
        patient: { select: { id: true, name: true } },
        sessions: {
          where: { status: "planned" },
          select: { id: true, scheduledDate: true, sessionNumber: true },
          orderBy: { sessionNumber: "asc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),
  ]);

  const alerts = [
    ...unscheduledSessions.map((s) => ({
      id: `unscheduled-${s.id}`,
      type: "unscheduled_session" as const,
      severity: "warning" as const,
      title: "جلسة بدون موعد",
      message: `${s.patient.name} — ${treatmentTypeLabel(s.plan.treatmentType)} · سن ${s.plan.toothFdi} · جلسة ${s.sessionNumber}`,
      patientId: Number(s.patient.id),
      toothFdi: s.plan.toothFdi,
      planId: Number(s.plan.id),
      sessionId: Number(s.id),
      href: `/dental/${Number(s.patient.id)}?tooth=${s.plan.toothFdi}`,
    })),
    ...stalledPlans.map((p) => ({
      id: `stalled-plan-${p.id}`,
      type: "incomplete_plan" as const,
      severity: "info" as const,
      title: "خطة علاج غير مكتملة",
      message: `${p.patient.name} — ${p.title ?? treatmentTypeLabel(p.treatmentType)} · سن ${p.toothFdi}`,
      patientId: Number(p.patient.id),
      toothFdi: p.toothFdi,
      planId: Number(p.id),
      href: `/dental/${Number(p.patient.id)}?tooth=${p.toothFdi}`,
    })),
  ];

  return apiOk({
    count: alerts.length,
    alerts,
    summary: {
      unscheduledSessions: unscheduledSessions.length,
      incompletePlans: stalledPlans.length,
      allergyPatients: 0,
    },
  });
}
