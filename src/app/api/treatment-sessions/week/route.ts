import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { treatmentTypeLabel } from "@/lib/treatment/constants";
import { parseDateKey, endOfDayUtc } from "@/lib/treatment/plan-utils";
import { currentWeekRange } from "@/lib/treatment/week-utils";

export async function GET(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const url = new URL(request.url);
  const defaultWeek = currentWeekRange();
  const fromKey = url.searchParams.get("from") ?? defaultWeek.from;
  const toKey = url.searchParams.get("to") ?? defaultWeek.to;
  const treatmentType = url.searchParams.get("treatmentType")?.trim() || undefined;

  const sessions = await prisma.treatmentSession.findMany({
    where: {
      doctorId: toDbId(ctx.doctorId),
      status: "planned",
      scheduledDate: {
        gte: parseDateKey(fromKey),
        lte: endOfDayUtc(toKey),
      },
      ...(treatmentType ? { plan: { treatmentType } } : {}),
    },
    include: {
      patient: { select: { id: true, name: true } },
      plan: {
        select: {
          id: true,
          toothFdi: true,
          treatmentType: true,
          title: true,
          totalSessions: true,
        },
      },
    },
    orderBy: [{ scheduledDate: "asc" }, { sessionNumber: "asc" }],
  });

  const byDate: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    const key = s.scheduledDate?.toISOString().slice(0, 10);
    if (!key) continue;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(s);
  }

  return apiOk({
    from: fromKey,
    to: toKey,
    sessions: sessions.map((s) => ({
      id: Number(s.id),
      planId: Number(s.planId),
      patientId: Number(s.patientId),
      patientName: s.patient.name,
      sessionNumber: s.sessionNumber,
      status: s.status,
      scheduledDate: s.scheduledDate
        ? s.scheduledDate.toISOString().slice(0, 10)
        : null,
      notes: s.notes,
      toothFdi: s.plan.toothFdi,
      treatmentType: s.plan.treatmentType,
      treatmentLabel: treatmentTypeLabel(s.plan.treatmentType),
      planTitle: s.plan.title,
      totalSessions: s.plan.totalSessions,
    })),
    byDate: Object.fromEntries(
      Object.entries(byDate).map(([date, list]) => [
        date,
        list.map((s) => ({
          id: Number(s.id),
          patientId: Number(s.patientId),
          patientName: s.patient.name,
          sessionNumber: s.sessionNumber,
          toothFdi: s.plan.toothFdi,
          treatmentType: s.plan.treatmentType,
          treatmentLabel: treatmentTypeLabel(s.plan.treatmentType),
          totalSessions: s.plan.totalSessions,
        })),
      ])
    ),
  });
}
