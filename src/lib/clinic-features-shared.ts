export const CLINIC_FEATURE_KEYS = [
  "home",
  "queue",
  "dates",
  "pharmaceutical",
  "patients",
  "dental",
  "finances",
  "reports",
  "prescriptions",
  "recipe_settings",
  "settings",
  "treatment",
  "search",
  "alerts",
  "tasks",
] as const;

export type ClinicFeatureKey = (typeof CLINIC_FEATURE_KEYS)[number];

const FEATURE_ROUTES: ReadonlyArray<{ key: ClinicFeatureKey; route: string }> = [
  { key: "home", route: "/home" },
  { key: "queue", route: "/queue" },
  { key: "dates", route: "/dates" },
  { key: "pharmaceutical", route: "/pharmaceutical" },
  { key: "patients", route: "/patients" },
  { key: "dental", route: "/dental" },
  { key: "finances", route: "/finances" },
  { key: "reports", route: "/reports" },
  { key: "prescriptions", route: "/prescriptions" },
  { key: "recipe_settings", route: "/recipe-settings" },
  { key: "settings", route: "/setting" },
  { key: "treatment", route: "/treatment" },
  { key: "tasks", route: "/tasks" },
];

const NAV_FEATURE_BY_HREF: Readonly<Record<string, ClinicFeatureKey>> = {
  "/home": "home",
  "/queue": "queue",
  "/dates": "dates",
  "/pharmaceutical": "pharmaceutical",
  "/patients": "patients",
  "/tasks": "tasks",
  "/dental": "dental",
  "/finances": "finances",
  "/reports": "reports",
  "/prescriptions": "prescriptions",
  "/recipe-settings": "recipe_settings",
  "/setting": "settings",
};

export function resolveClinicFeatureForPath(
  pathname: string
): ClinicFeatureKey | null {
  if (/^\/print\/prescriptions\//.test(pathname)) return "prescriptions";
  if (/^\/print\/patients\/\d+\/dental/.test(pathname)) return "dental";
  if (/^\/print\/patients\/\d+\/summary/.test(pathname)) return "patients";

  for (const { key, route } of FEATURE_ROUTES) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return key;
  }
  return null;
}

export function isFeatureExemptPage(pathname: string) {
  return pathname === "/subscription" || pathname.startsWith("/subscription/");
}

export function filterNavHref(
  href: string,
  enabledMap: Record<ClinicFeatureKey, boolean>
) {
  const key = NAV_FEATURE_BY_HREF[href];
  return !key || enabledMap[key];
}
