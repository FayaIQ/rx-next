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
): { href: string; label: string } {
  if (isSafeInternalReturn(returnToParam)) {
    if (returnToParam.startsWith("/home")) {
      return { href: returnToParam, label: "العودة لكتابة الوصفة" };
    }
    if (returnToParam.startsWith("/queue")) {
      return { href: returnToParam, label: "العودة للطابور" };
    }
    if (returnToParam.startsWith("/dental")) {
      return { href: returnToParam, label: "العودة للطبلة" };
    }
    if (returnToParam.startsWith("/dates")) {
      return { href: returnToParam, label: "العودة للمواعيد" };
    }
    return { href: returnToParam, label: "رجوع" };
  }

  return {
    href: "/patients",
    label: "العودة للمرضى",
  };
}
