import { prescriptionDayKey } from "@/lib/patient-utils";

export type DashboardVisitEvent = {
  doctorId: bigint | number | string | null;
  patientId: bigint | number | string;
  date: Date | null;
};

export type DashboardVisitActivity = {
  currentCounts: Map<string, number>;
  previousCounts: Map<string, number>;
  currentTrend: Map<string, number>;
};

/**
 * The rest of the product treats one patient on one calendar day as one visit.
 * Merge prescription-backed visits with explicit PatientVisit rows and de-dupe
 * them so a treatment session linked to a prescription is not counted twice.
 */
export function buildDashboardVisitActivity(
  events: DashboardVisitEvent[],
  periodStart: Date,
  previousStart: Date
): DashboardVisitActivity {
  const currentCounts = new Map<string, number>();
  const previousCounts = new Map<string, number>();
  const currentTrend = new Map<string, number>();
  const seen = new Set<string>();

  for (const event of events) {
    if (event.doctorId === null || !event.date) continue;
    if (Number.isNaN(event.date.getTime()) || event.date < previousStart) continue;

    const doctorId = event.doctorId.toString();
    const dateKey = prescriptionDayKey(event.date);
    const identity = `${doctorId}:${event.patientId.toString()}:${dateKey}`;
    if (seen.has(identity)) continue;
    seen.add(identity);

    const target = event.date >= periodStart ? currentCounts : previousCounts;
    target.set(doctorId, (target.get(doctorId) ?? 0) + 1);

    if (event.date >= periodStart) {
      currentTrend.set(dateKey, (currentTrend.get(dateKey) ?? 0) + 1);
    }
  }

  return { currentCounts, previousCounts, currentTrend };
}
