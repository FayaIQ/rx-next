const ALLOWED_RETURN_PREFIXES = [
  "/home",
  "/queue",
  "/patients",
  "/dates",
  "/dental",
  "/prescriptions",
  "/finances",
  "/reports",
];

export type PatientRecordReturnKey =
  | "home"
  | "queue"
  | "dental"
  | "dates"
  | "back"
  | "patients";

export function isSafeInternalReturn(path: string | null | undefined): path is string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return false;
  return ALLOWED_RETURN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}?`) || path.startsWith(`${prefix}/`)
  );
}

export function patientRecordHref(
  patientId: number,
  returnTo?: string
): string {
  const base = `/patients/${patientId}/record`;
  if (!returnTo || !isSafeInternalReturn(returnTo)) return base;
  return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function resolvePatientRecordReturn(
  returnToParam: string | null
): { href: string; labelKey: PatientRecordReturnKey } {
  if (isSafeInternalReturn(returnToParam)) {
    if (returnToParam.startsWith("/home")) {
      return { href: returnToParam, labelKey: "home" };
    }
    if (returnToParam.startsWith("/queue")) {
      return { href: returnToParam, labelKey: "queue" };
    }
    if (returnToParam.startsWith("/dental")) {
      return { href: returnToParam, labelKey: "dental" };
    }
    if (returnToParam.startsWith("/dates")) {
      return { href: returnToParam, labelKey: "dates" };
    }
    return { href: returnToParam, labelKey: "back" };
  }

  return {
    href: "/patients",
    labelKey: "patients",
  };
}
