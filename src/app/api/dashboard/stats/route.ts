import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk } from "@/lib/api/response";
import { paginateArray } from "@/lib/pagination";

const ALLOWED_PERIODS = new Set([7, 14, 30]);
const RECENT_DOCTORS_PAGE_SIZE = 12;

type CountGroup = {
  doctorId: bigint | null;
  _count: { _all: number };
};

type MaxDateGroup = {
  doctorId: bigint | null;
  _max: { createdAt?: Date | null; visitDate?: Date | null };
};

function startOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function dayKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function countMap(groups: CountGroup[]) {
  return new Map(
    groups
      .filter((group) => group.doctorId !== null)
      .map((group) => [group.doctorId!.toString(), group._count._all])
  );
}

function maxDateMap(groups: MaxDateGroup[], field: "createdAt" | "visitDate") {
  return new Map(
    groups
      .filter((group) => group.doctorId !== null)
      .map((group) => [group.doctorId!.toString(), group._max[field] ?? null])
  );
}

function getCount(map: Map<string, number>, id: string) {
  return map.get(id) ?? 0;
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function changePercent(value: number, previous: number) {
  if (previous === 0) return value > 0 ? 100 : 0;
  return Math.round(((value - previous) / previous) * 100);
}

function activityStatus(score: number) {
  if (score >= 65) return "high" as const;
  if (score >= 35) return "growing" as const;
  if (score > 0) return "low" as const;
  return "none" as const;
}

export async function GET(request: Request) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  const searchParams = new URL(request.url).searchParams;
  const requestedDays = Number(searchParams.get("days"));
  const days = ALLOWED_PERIODS.has(requestedDays) ? requestedDays : 14;
  const recentDoctorsPage = Math.max(
    1,
    Number.parseInt(searchParams.get("recentPage") ?? "1", 10) || 1
  );
  const now = new Date();
  const today = startOfDay(now);
  const periodStart = addDays(today, -(days - 1));
  const previousStart = addDays(periodStart, -days);
  const futureEnd = addDays(now, 7);
  const sixtyDaysAgo = addDays(today, -60);

  // Keep each batch below the database connection limit while still avoiding
  // a slow, fully sequential dashboard load.
  const [doctors, activeSubscriptions] = await Promise.all([
    prisma.user.findMany({
      where: { type: "doctor" },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        createdAt: true,
        isConfirmed: true,
        subscriptions: {
          select: { startsAt: true },
          orderBy: { startsAt: "asc" },
          take: 1,
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.subscription.count({
      where: { status: "active", endsAt: { gt: now } },
    }),
  ]);

  const [
    currentPrescriptionsRaw,
    previousPrescriptionsRaw,
    allPrescriptionLastRaw,
    trendPrescriptions,
  ] = await Promise.all([
    prisma.prescription.groupBy({
      by: ["doctorId"],
      where: { doctorId: { not: null }, createdAt: { gte: periodStart } },
      _count: { _all: true },
    }),
    prisma.prescription.groupBy({
      by: ["doctorId"],
      where: {
        doctorId: { not: null },
        createdAt: { gte: previousStart, lt: periodStart },
      },
      _count: { _all: true },
    }),
    prisma.prescription.groupBy({
      by: ["doctorId"],
      where: { doctorId: { not: null } },
      _max: { createdAt: true },
    }),
    prisma.prescription.findMany({
      where: { doctorId: { not: null }, createdAt: { gte: periodStart } },
      select: { doctorId: true, createdAt: true },
    }),
  ]);

  const [currentPatientsRaw, previousPatientsRaw, allPatientLastRaw] =
    await Promise.all([
      prisma.patient.groupBy({
        by: ["doctorId"],
        where: { createdAt: { gte: periodStart } },
        _count: { _all: true },
      }),
      prisma.patient.groupBy({
        by: ["doctorId"],
        where: { createdAt: { gte: previousStart, lt: periodStart } },
        _count: { _all: true },
      }),
      prisma.patient.groupBy({
        by: ["doctorId"],
        _max: { createdAt: true },
      }),
    ]);

  const [
    currentAppointmentsRaw,
    previousAppointmentsRaw,
    allAppointmentLastRaw,
    upcomingAppointmentsRaw,
  ] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["doctorId"],
      where: { createdAt: { gte: periodStart } },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["doctorId"],
      where: { createdAt: { gte: previousStart, lt: periodStart } },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["doctorId"],
      _max: { createdAt: true },
    }),
    prisma.appointment.groupBy({
      by: ["doctorId"],
      where: {
        appointmentDatetime: { gte: now, lt: futureEnd },
        status: true,
        visitStatus: "scheduled",
      },
      _count: { _all: true },
    }),
  ]);

  const [
    currentVisitsRaw,
    previousVisitsRaw,
    allVisitLastRaw,
    trendVisits,
  ] = await Promise.all([
    prisma.patientVisit.groupBy({
      by: ["doctorId"],
      where: { visitDate: { gte: periodStart } },
      _count: { _all: true },
    }),
    prisma.patientVisit.groupBy({
      by: ["doctorId"],
      where: { visitDate: { gte: previousStart, lt: periodStart } },
      _count: { _all: true },
    }),
    prisma.patientVisit.groupBy({
      by: ["doctorId"],
      _max: { visitDate: true },
    }),
    prisma.patientVisit.findMany({
      where: { visitDate: { gte: periodStart } },
      select: { doctorId: true, visitDate: true },
    }),
  ]);

  const currentPrescriptions = countMap(currentPrescriptionsRaw);
  const previousPrescriptions = countMap(previousPrescriptionsRaw);
  const currentPatients = countMap(currentPatientsRaw);
  const previousPatients = countMap(previousPatientsRaw);
  const currentAppointments = countMap(currentAppointmentsRaw);
  const previousAppointments = countMap(previousAppointmentsRaw);
  const currentVisits = countMap(currentVisitsRaw);
  const previousVisits = countMap(previousVisitsRaw);
  const upcomingAppointments = countMap(upcomingAppointmentsRaw);
  const lastPrescription = maxDateMap(allPrescriptionLastRaw, "createdAt");
  const lastPatient = maxDateMap(allPatientLastRaw, "createdAt");
  const lastAppointment = maxDateMap(allAppointmentLastRaw, "createdAt");
  const lastVisit = maxDateMap(allVisitLastRaw, "visitDate");

  const sum = (map: Map<string, number>) =>
    [...map.values()].reduce((total, value) => total + value, 0);
  const hasActivity = (id: string, current = true) => {
    const maps = current
      ? [currentPrescriptions, currentPatients, currentAppointments, currentVisits]
      : [previousPrescriptions, previousPatients, previousAppointments, previousVisits];
    return maps.some((map) => getCount(map, id) > 0);
  };
  const registrationDate = (doctor: (typeof doctors)[number]) =>
    doctor.createdAt ?? doctor.subscriptions[0]?.startsAt ?? null;

  const currentNewDoctors = doctors.filter(
    (doctor) => {
      const registeredAt = registrationDate(doctor);
      return registeredAt && registeredAt >= periodStart;
    }
  );
  const previousNewDoctors = doctors.filter(
    (doctor) => {
      const registeredAt = registrationDate(doctor);
      return (
        registeredAt &&
        registeredAt >= previousStart &&
        registeredAt < periodStart
      );
    }
  );
  const activatedNewDoctors = currentNewDoctors.filter((doctor) =>
    hasActivity(doctor.id.toString())
  );
  const activatedPreviousDoctors = previousNewDoctors.filter((doctor) =>
    hasActivity(doctor.id.toString(), false)
  );
  const activeDoctors = doctors.filter((doctor) =>
    hasActivity(doctor.id.toString())
  );
  const previousActiveDoctors = doctors.filter((doctor) =>
    hasActivity(doctor.id.toString(), false)
  );
  const futureActiveDoctors = doctors.filter(
    (doctor) => getCount(upcomingAppointments, doctor.id.toString()) > 0
  );

  const doctorActivity = doctors.map((doctor) => {
    const id = doctor.id.toString();
    const prescriptionsCount = getCount(currentPrescriptions, id);
    const patientsCount = getCount(currentPatients, id);
    const appointmentsCount = getCount(currentAppointments, id);
    const visitsCount = getCount(currentVisits, id);
    const upcomingCount = getCount(upcomingAppointments, id);
    const activityDates = [
      { type: "prescription", date: lastPrescription.get(id) },
      { type: "patient", date: lastPatient.get(id) },
      { type: "appointment", date: lastAppointment.get(id) },
      { type: "visit", date: lastVisit.get(id) },
    ].filter((item): item is { type: string; date: Date } => Boolean(item.date));
    const latest = activityDates.sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    )[0];
    const lastActivityAt = latest?.date ?? null;
    const ageInDays = lastActivityAt
      ? Math.floor((now.getTime() - lastActivityAt.getTime()) / 86_400_000)
      : Number.POSITIVE_INFINITY;
    const recencyScore =
      ageInDays <= 3 ? 40 : ageInDays <= 7 ? 32 : ageInDays <= 14 ? 22 : ageInDays <= 30 ? 12 : 0;
    const usageScore = Math.min(
      45,
      prescriptionsCount * 6 +
        visitsCount * 5 +
        patientsCount * 3 +
        appointmentsCount * 2
    );
    const futureScore = upcomingCount > 0 ? Math.min(15, 5 + upcomingCount * 3) : 0;
    const activityScore = Math.min(100, recencyScore + usageScore + futureScore);

    return {
      id: Number(doctor.id),
      name: doctor.name,
      phoneNumber: doctor.phoneNumber,
      registeredAt: registrationDate(doctor)?.toISOString() ?? null,
      confirmed: doctor.isConfirmed,
      lastActivityAt: lastActivityAt?.toISOString() ?? null,
      lastActivityType: latest?.type ?? null,
      lastVisitAt: lastVisit.get(id)?.toISOString() ?? null,
      prescriptionsCount,
      patientsCount,
      appointmentsCount,
      visitsCount,
      upcomingAppointments: upcomingCount,
      activityScore,
      status: activityStatus(activityScore),
    };
  });

  const neverActivated = doctorActivity.filter((doctor) => !doctor.lastActivityAt).length;
  const atRisk = doctorActivity.filter((doctor) => {
    if (!doctor.lastActivityAt) return false;
    const date = new Date(doctor.lastActivityAt);
    return date < periodStart && date >= sixtyDaysAgo;
  }).length;
  const dormant = doctorActivity.filter(
    (doctor) =>
      doctor.lastActivityAt && new Date(doctor.lastActivityAt) < sixtyDaysAgo
  ).length;

  const trend = Array.from({ length: days }, (_, index) => {
    const date = addDays(periodStart, index);
    return { date: dayKey(date), doctors: 0, prescriptions: 0, visits: 0 };
  });
  const trendByDate = new Map(trend.map((item) => [item.date, item]));
  currentNewDoctors.forEach((doctor) => {
    const registeredAt = registrationDate(doctor);
    if (!registeredAt) return;
    const item = trendByDate.get(dayKey(registeredAt));
    if (item) item.doctors += 1;
  });
  trendPrescriptions.forEach((prescription) => {
    if (!prescription.createdAt) return;
    const item = trendByDate.get(dayKey(prescription.createdAt));
    if (item) item.prescriptions += 1;
  });
  trendVisits.forEach((visit) => {
    const item = trendByDate.get(dayKey(visit.visitDate));
    if (item) item.visits += 1;
  });

  const prescriptionsTotal = sum(currentPrescriptions);
  const previousPrescriptionsTotal = sum(previousPrescriptions);
  const visitsTotal = sum(currentVisits);
  const previousVisitsTotal = sum(previousVisits);
  const patientsTotal = sum(currentPatients);
  const previousPatientsTotal = sum(previousPatients);
  const futureAppointmentsTotal = sum(upcomingAppointments);

  const sortedRecentDoctors = [...doctorActivity].sort((a, b) => {
    if (a.registeredAt && b.registeredAt) {
      return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
    }
    if (a.registeredAt) return -1;
    if (b.registeredAt) return 1;
    return b.id - a.id;
  });
  const recentDoctors = paginateArray(
    sortedRecentDoctors,
    recentDoctorsPage,
    RECENT_DOCTORS_PAGE_SIZE
  );

  return apiOk({
    meta: {
      days,
      generatedAt: now.toISOString(),
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      previousStart: previousStart.toISOString(),
    },
    totals: {
      doctors: doctors.length,
      activeSubscriptions,
    },
    kpis: {
      newDoctors: {
        value: currentNewDoctors.length,
        previous: previousNewDoctors.length,
        changePercent: changePercent(currentNewDoctors.length, previousNewDoctors.length),
      },
      activatedNewDoctors: {
        value: activatedNewDoctors.length,
        rate: percent(activatedNewDoctors.length, currentNewDoctors.length),
        previousRate: percent(activatedPreviousDoctors.length, previousNewDoctors.length),
      },
      activeDoctors: {
        value: activeDoctors.length,
        rate: percent(activeDoctors.length, doctors.length),
        previous: previousActiveDoctors.length,
        changePercent: changePercent(activeDoctors.length, previousActiveDoctors.length),
      },
      prescriptions: {
        value: prescriptionsTotal,
        previous: previousPrescriptionsTotal,
        changePercent: changePercent(prescriptionsTotal, previousPrescriptionsTotal),
      },
      visits: {
        value: visitsTotal,
        previous: previousVisitsTotal,
        changePercent: changePercent(visitsTotal, previousVisitsTotal),
      },
      patients: {
        value: patientsTotal,
        previous: previousPatientsTotal,
        changePercent: changePercent(patientsTotal, previousPatientsTotal),
      },
      futureActivity: {
        appointments: futureAppointmentsTotal,
        doctors: futureActiveDoctors.length,
        rate: percent(futureActiveDoctors.length, doctors.length),
      },
    },
    funnel: {
      registered: currentNewDoctors.length,
      activated: activatedNewDoctors.length,
      prescribed: currentNewDoctors.filter(
        (doctor) => getCount(currentPrescriptions, doctor.id.toString()) > 0
      ).length,
      returning: currentNewDoctors.filter((doctor) => {
        const id = doctor.id.toString();
        return (
          getCount(currentPrescriptions, id) +
            getCount(currentPatients, id) +
            getCount(currentAppointments, id) +
            getCount(currentVisits, id) >=
          3
        );
      }).length,
    },
    segments: {
      healthy: doctorActivity.filter((doctor) => doctor.status === "high").length,
      growing: doctorActivity.filter((doctor) => doctor.status === "growing").length,
      neverActivated,
      atRisk,
      dormant,
      upcomingDoctors: futureActiveDoctors.length,
    },
    trend,
    recentDoctors: recentDoctors.pageItems,
    recentDoctorsPagination: recentDoctors.pagination,
    topDoctors: [...doctorActivity]
      .filter((doctor) => doctor.activityScore > 0)
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 5),
  });
}
