import { toothStatusLabel, type ToothStatusId } from "@/lib/dental/constants";

export const TREATMENT_TYPES = [
  { id: "root_canal", label: "علاج جذر", defaultSessions: 3 },
  { id: "crown", label: "تاج", defaultSessions: 2 },
  { id: "filled", label: "حشوة", defaultSessions: 1 },
  { id: "implant", label: "زرعة", defaultSessions: 4 },
  { id: "caries", label: "علاج تسوس", defaultSessions: 2 },
  { id: "fracture", label: "علاج كسر", defaultSessions: 2 },
  { id: "extraction", label: "خلع", defaultSessions: 1 },
  { id: "cleaning", label: "تنظيف", defaultSessions: 1 },
  { id: "other", label: "أخرى", defaultSessions: 1 },
] as const;

export type TreatmentTypeId = (typeof TREATMENT_TYPES)[number]["id"];

export const TREATMENT_TYPE_MAP = Object.fromEntries(
  TREATMENT_TYPES.map((t) => [t.id, t])
) as Record<TreatmentTypeId, (typeof TREATMENT_TYPES)[number]>;

export const SESSION_STATUSES = [
  { id: "planned", label: "مجدولة", color: "#3b82f6" },
  { id: "completed", label: "مكتملة", color: "#22c55e" },
  { id: "cancelled", label: "ملغاة", color: "#64748b" },
  { id: "skipped", label: "تخطّت", color: "#f59e0b" },
] as const;

export type SessionStatusId = (typeof SESSION_STATUSES)[number]["id"];

export const PLAN_STATUSES = [
  { id: "active", label: "جارية" },
  { id: "completed", label: "مكتملة" },
  { id: "cancelled", label: "ملغاة" },
] as const;

export type PlanStatusId = (typeof PLAN_STATUSES)[number]["id"];

export function treatmentTypeLabel(type: string): string {
  return (
    TREATMENT_TYPE_MAP[type as TreatmentTypeId]?.label ??
    toothStatusLabel(type as ToothStatusId) ??
    type
  );
}

export function sessionStatusLabel(status: string): string {
  return (
    SESSION_STATUSES.find((s) => s.id === status)?.label ?? status
  );
}

export function sessionStatusColor(status: string): string {
  return (
    SESSION_STATUSES.find((s) => s.id === status)?.color ?? "#94a3b8"
  );
}

export function defaultSessionsForType(type: string): number {
  return TREATMENT_TYPE_MAP[type as TreatmentTypeId]?.defaultSessions ?? 1;
}

export function todayDateKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
