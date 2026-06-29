import { prisma } from "@/lib/prisma";
import { toDbId, fromDbId } from "@/lib/bigint";
import { treatmentTypeLabel } from "@/lib/treatment/constants";

function monthRange(monthKey?: string) {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
    const [yy, mm] = monthKey.split("-").map(Number);
    y = yy;
    m = mm - 1;
  }
  const from = new Date(Date.UTC(y, m, 1));
  const to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  const key = `${y}-${String(m + 1).padStart(2, "0")}`;
  return { from, to, key };
}

export async function loadDoctorReports(doctorId: number, monthKey?: string) {
  const doctorDbId = toDbId(doctorId);
  const { from, to, key } = monthRange(monthKey);

  const [
    newPatients,
    prescriptions,
    completedSessions,
    cancelledAppointments,
    income,
    expense,
    plansByType,
    recentPatients,
  ] = await Promise.all([
    prisma.patient.count({
      where: { doctorId: doctorDbId, createdAt: { gte: from, lte: to } },
    }),
    prisma.prescription.count({
      where: { doctorId: doctorDbId, prescriptionDate: { gte: from, lte: to } },
    }),
    prisma.treatmentSession.count({
      where: {
        doctorId: doctorDbId,
        status: "completed",
        performedAt: { gte: from, lte: to },
      },
    }),
    prisma.appointment.count({
      where: {
        doctorId: doctorDbId,
        status: false,
        updatedAt: { gte: from, lte: to },
      },
    }),
    prisma.financeTransaction.aggregate({
      where: {
        doctorId: doctorDbId,
        type: "income",
        transactionDate: { gte: from, lte: to },
      },
      _sum: { amount: true },
    }),
    prisma.financeTransaction.aggregate({
      where: {
        doctorId: doctorDbId,
        type: "expense",
        transactionDate: { gte: from, lte: to },
      },
      _sum: { amount: true },
    }),
    prisma.treatmentPlan.groupBy({
      by: ["treatmentType"],
      where: { doctorId: doctorDbId, createdAt: { gte: from, lte: to } },
      _count: { id: true },
    }),
    prisma.patient.findMany({
      where: { doctorId: doctorDbId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, createdAt: true },
    }),
  ]);

  const totalIncome = Number(income._sum.amount ?? 0);
  const totalExpense = Number(expense._sum.amount ?? 0);

  return {
    month: key,
    summary: {
      newPatients,
      prescriptions,
      completedSessions,
      cancelledAppointments,
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
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
      createdAt: p.createdAt?.toISOString().slice(0, 10) ?? null,
    })),
  };
}
