import type { TreatmentPlanDto } from "@/lib/api/rx-client";
import { treatmentTypeLabel } from "@/lib/treatment/constants";

export type TreatmentPlanMarker = {
  toothFdi: number;
  treatmentType: string;
  label: string;
  status: string;
  completedSessions: number;
  totalSessions: number;
};

export function buildTreatmentPlanMarkers(
  plans: TreatmentPlanDto[]
): TreatmentPlanMarker[] {
  const byTooth = new Map<number, TreatmentPlanDto>();

  for (const plan of plans) {
    if (plan.status === "cancelled") continue;
    const existing = byTooth.get(plan.toothFdi);
    if (
      !existing ||
      (plan.status === "active" && existing.status !== "active")
    ) {
      byTooth.set(plan.toothFdi, plan);
    }
  }

  return Array.from(byTooth.values()).map((plan) => ({
    toothFdi: plan.toothFdi,
    treatmentType: plan.treatmentType,
    label: treatmentTypeLabel(plan.treatmentType),
    status: plan.status,
    completedSessions:
      plan.sessions?.filter((s) => s.status === "completed").length ?? 0,
    totalSessions: plan.totalSessions ?? plan.sessions?.length ?? 0,
  }));
}
