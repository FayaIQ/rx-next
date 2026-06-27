export const VISIT_STATUSES = [
  "scheduled",
  "arrived",
  "waiting",
  "with_doctor",
  "done",
] as const;

export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  scheduled: "مجدول",
  arrived: "وصل",
  waiting: "في الانتظار",
  with_doctor: "عند الطبيب",
  done: "انتهى",
};

export const VISIT_STATUS_COLORS: Record<
  VisitStatus,
  { bg: string; text: string; border: string }
> = {
  scheduled: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  arrived: {
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
  },
  waiting: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-200",
  },
  with_doctor: {
    bg: "bg-violet-50",
    text: "text-violet-900",
    border: "border-violet-200",
  },
  done: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
};

/** Full linear flow (reference) */
export const VISIT_STATUS_NEXT: Partial<Record<VisitStatus, VisitStatus>> = {
  scheduled: "waiting",
  waiting: "with_doctor",
  with_doctor: "done",
};

/** السكرتير: تسجيل وصول مباشرة إلى الانتظار */
export const SECRETARY_VISIT_STATUS_NEXT: Partial<
  Record<VisitStatus, VisitStatus>
> = {
  scheduled: "waiting",
};

export const SECRETARY_ACTION_LABELS: Partial<Record<VisitStatus, string>> = {
  scheduled: "تسجيل وصول",
};

/** الطبيب: تسجيل وصول، استدعاء، وإنهاء الزيارة */
export const DOCTOR_VISIT_STATUS_NEXT: Partial<Record<VisitStatus, VisitStatus>> =
  {
    scheduled: "waiting",
    waiting: "with_doctor",
    with_doctor: "done",
  };

export const DOCTOR_ACTION_LABELS: Partial<Record<VisitStatus, string>> = {
  scheduled: "تسجيل وصول",
  waiting: "استدعاء",
  with_doctor: "انتهت الزيارة",
};

export const VISIT_STATUS_ACTION_LABELS: Partial<
  Record<VisitStatus, string>
> = {
  scheduled: "تسجيل وصول",
  waiting: "عند الطبيب",
  with_doctor: "انتهت الزيارة",
};

/** دمج «وصل» ضمن «في الانتظار» للعرض والمنطق */
export function normalizeQueueStatus(status: VisitStatus): VisitStatus {
  if (status === "arrived") return "waiting";
  return status;
}

export function isWaitingInQueue(status: VisitStatus): boolean {
  return status === "waiting" || status === "arrived";
}

export function secretaryStatusLabel(status: VisitStatus): string {
  if (status === "with_doctor") return "تم استدعاؤه";
  return VISIT_STATUS_LABELS[status];
}

export function isVisitStatus(value: string): value is VisitStatus {
  return (VISIT_STATUSES as readonly string[]).includes(value);
}

export function visitStatusSortOrder(status: VisitStatus): number {
  const normalized = normalizeQueueStatus(status);
  const order: Record<VisitStatus, number> = {
    with_doctor: 0,
    waiting: 1,
    arrived: 1,
    scheduled: 2,
    done: 3,
  };
  return order[normalized];
}
