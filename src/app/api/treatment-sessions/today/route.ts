import { treatmentSessionBalance } from "@/lib/finance/session-balance";
import { loadPatientDebtMap } from "@/lib/finance/session-billing-service";
import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { todayDateKey } from "@/lib/treatment/constants";
import { parseDateKey } from "@/lib/treatment/plan-utils";
import { treatmentTypeLabel } from "@/lib/treatment/constants";

export async function GET(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const url = new URL(request.url);
  const dateKey = url.searchParams.get("date") ?? todayDateKey();
  const scheduledDate = parseDateKey(dateKey);

  const sessions = await prisma.treatmentSession.findMany({
    where: {
      doctorId: toDbId(ctx.doctorId),
      status: "planned",
      scheduledDate,
    },
    include: {
      payments: { select: { amount: true } },
      patient: { select: { id: true, name: true } },
      plan: {
        select: {
          pricingMode: true, fee: true, currency: true, payments: { select: { amount: true } },
          id: true,
          toothFdi: true, toothFdis: true,
          treatmentType: true,
          title: true,
          totalSessions: true,
        },
      },
    },
    orderBy: [{ scheduledDate: "asc" }, { sessionNumber: "asc" }],
  });

  const debtMap = await loadPatientDebtMap(toDbId(ctx.doctorId), [...new Set(sessions.map(s => s.patientId))]);

  return apiOk({
    date: dateKey,
    sessions: sessions.map((s) => ({
      billing: treatmentSessionBalance(s),
      patientAccount: debtMap.get(Number(s.patientId)) ?? [],
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
      toothFdi: s.plan.toothFdi, toothFdis: s.plan.toothFdis,
      treatmentType: s.plan.treatmentType,
      treatmentLabel: treatmentTypeLabel(s.plan.treatmentType),
      planTitle: s.plan.title,
      totalSessions: s.plan.totalSessions,
    })),
  });
}
