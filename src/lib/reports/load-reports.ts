import { accountTotals } from "@/lib/finance/session-balance";
import { currencyTotals } from "@/lib/finance/currency-totals";
import { prisma } from "@/lib/prisma";
import { toDbId, fromDbId } from "@/lib/bigint";
import { reportMonthRange } from "./month-range";
import { todayDateKey, treatmentTypeLabel } from "@/lib/treatment/constants";

export async function loadDoctorReports(doctorId: number, monthKey?: string) {
  const doctorDbId = toDbId(doctorId);
  const { timestampRange, dateRange, key } = reportMonthRange(monthKey);

  const [
    newPatients,
    prescriptions,
    completedSessions,
    cancelledAppointments,
    finance,
    plansByType,
    recentPatients,
    billedSessions,
    billedPlans,
  ] = await Promise.all([
    prisma.patient.count({
      where: { doctorId: doctorDbId, createdAt: timestampRange },
    }),
    prisma.prescription.count({
      where: { doctorId: doctorDbId, prescriptionDate: dateRange },
    }),
    prisma.treatmentSession.count({
      where: {
        doctorId: doctorDbId,
        status: "completed",
        performedAt: timestampRange,
      },
    }),
    prisma.appointment.count({
      where: {
        doctorId: doctorDbId,
        status: false,
        visitStatus: { not: "archived" },
        updatedAt: timestampRange,
      },
    }),
    prisma.financeTransaction.groupBy({
      by: ["currency", "type"],
      where: { doctorId: doctorDbId, transactionDate: dateRange },
      _sum: { amount: true },
    }),
    prisma.treatmentPlan.groupBy({
      by: ["treatmentType"],
      where: { doctorId: doctorDbId, createdAt: timestampRange },
      _count: { id: true },
    }),
    prisma.patient.findMany({
      where: { doctorId: doctorDbId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.treatmentSession.findMany({ where: { doctorId: doctorDbId, plan: { pricingMode: "per_session" }, fee: { not: null } }, select: { fee: true, currency: true, payments: { select: { amount: true } } } }),
    prisma.treatmentPlan.findMany({ where: { doctorId: doctorDbId, pricingMode: "plan", fee: { not: null } }, select: { fee: true, currency: true, payments: { select: { amount: true } } } }),
  ]);

  const financialTotals = currencyTotals(finance.map((row) => ({ type: row.type, currency: row.currency, amount: Number(row._sum.amount ?? 0) })));

  return {
    month: key,
    summary: {
      newPatients,
      prescriptions,
      completedSessions,
      cancelledAppointments,
      financialTotals,
      sessionAccount: accountTotals([...billedSessions, ...billedPlans]),
    },
    treatmentBreakdown: plansByType
      .map((row) => ({
        type: row.treatmentType,
        label: treatmentTypeLabel(row.treatmentType),
        count: row._count.id,
      }))
      .sort((a, b) => b.count - a.count),
    recentPatients: recentPatients.map((p) => ({
      id: fromDbId(p.id),
      name: p.name,
      createdAt: p.createdAt ? todayDateKey(p.createdAt) : null,
    })),
  };
}
