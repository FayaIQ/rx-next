/** FDI World Dental Federation notation */
export const FDI_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11] as const;
export const FDI_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28] as const;
export const FDI_LOWER_LEFT = [38, 37, 36, 35, 34, 33, 32, 31] as const;
export const FDI_LOWER_RIGHT = [41, 42, 43, 44, 45, 46, 47, 48] as const;

export const FDI_ALL = [
  ...FDI_UPPER_RIGHT,
  ...FDI_UPPER_LEFT,
  ...FDI_LOWER_LEFT,
  ...FDI_LOWER_RIGHT,
] as const;

export type ToothFdi = (typeof FDI_ALL)[number];

export const TOOTH_STATUSES = [
  { id: "healthy", label: "سليم", color: "#f8fafc" },
  { id: "caries", label: "تسوس", color: "#ef4444" },
  { id: "filled", label: "حشوة", color: "#3b82f6" },
  { id: "crown", label: "تاج", color: "#a855f7" },
  { id: "missing", label: "مفقود", color: "#64748b" },
  { id: "root_canal", label: "علاج جذر", color: "#f59e0b" },
  { id: "implant", label: "زرعة", color: "#14b8a6" },
  { id: "fracture", label: "كسر", color: "#dc2626" },
  { id: "watch", label: "متابعة", color: "#fbbf24" },
] as const;

export type ToothStatusId = (typeof TOOTH_STATUSES)[number]["id"];

export const TOOTH_STATUS_MAP = Object.fromEntries(
  TOOTH_STATUSES.map((s) => [s.id, s])
) as Record<ToothStatusId, (typeof TOOTH_STATUSES)[number]>;

export function toothStatusLabel(status: string): string {
  return TOOTH_STATUS_MAP[status as ToothStatusId]?.label ?? status;
}

export function toothStatusColor(status: string): string {
  return TOOTH_STATUS_MAP[status as ToothStatusId]?.color ?? "#e2e8f0";
}

export function toothQuadrantLabel(fdi: number): string {
  if (fdi >= 11 && fdi <= 18) return "علوي يمين";
  if (fdi >= 21 && fdi <= 28) return "علوي يسار";
  if (fdi >= 31 && fdi <= 38) return "سفلي يسار";
  if (fdi >= 41 && fdi <= 48) return "سفلي يمين";
  return "";
}
