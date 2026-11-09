type PlanTeeth = { toothFdi?: number | null; toothFdis?: readonly number[] };

/** Read old cached plans and new shared plans consistently. */
export function treatmentPlanTeeth(plan: PlanTeeth): number[] {
  return [...new Set(plan.toothFdis?.length ? plan.toothFdis : plan.toothFdi == null ? [] : [plan.toothFdi])].sort((a, b) => a - b);
}

export function planIncludesTooth(plan: PlanTeeth, toothFdi: number | null): boolean {
  const teeth = treatmentPlanTeeth(plan);
  return toothFdi == null ? teeth.length === 0 : teeth.includes(toothFdi);
}
