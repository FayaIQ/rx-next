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
  const byTooth = new Map<number, TreatmentPlanMarker>();
  for (const plan of plans) {
    if (plan.status === "cancelled") continue;
    const completed = plan.sessions?.filter((session) => session.status === "completed").length ?? 0;
    const total = plan.totalSessions ?? plan.sessions?.length ?? 0;
    const existing = byTooth.get(plan.toothFdi);
    if (existing) {
      existing.completedSessions += completed;
      existing.totalSessions += total;
      const label = treatmentTypeLabel(plan.treatmentType);
      if (!existing.label.split(" · ").includes(label)) existing.label += ` · ${label}`;
      if (plan.status === "active") existing.status = "active";
    } else {
      byTooth.set(plan.toothFdi, {
        toothFdi: plan.toothFdi,
        treatmentType: plan.treatmentType,
        label: treatmentTypeLabel(plan.treatmentType),
        status: plan.status,
        completedSessions: completed,
        totalSessions: total,
      });
    }
  }
  return [...byTooth.values()];
}
