import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { apiError } from "@/lib/api/response";

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
] as const;

export type ClinicFeatureKey = (typeof CLINIC_FEATURE_KEYS)[number];

export type ClinicFeatureDefinition = {
  key: ClinicFeatureKey;
  label: string;
  description: string;
  routes: string[];
  apiPatterns: RegExp[];
  navHref?: string;
};

export const CLINIC_FEATURE_DEFINITIONS: ClinicFeatureDefinition[] = [
  {
    key: "home",
    label: "كتابة الوصفة",
    description: "الصفحة الرئيسية لكتابة الوصفات الطبية",
    routes: ["/home"],
    apiPatterns: [/^\/api\/prescriptions(\/|$)/],
    navHref: "/home",
  },
  {
    key: "queue",
    label: "طابور الاستدعاء",
    description: "طابور الانتظار واستدعاء المرضى",
    routes: ["/queue"],
    apiPatterns: [/^\/api\/appointments\/queue\//],
    navHref: "/queue",
  },
  {
    key: "dates",
    label: "المواعيد",
    description: "جدولة ومتابعة المواعيد",
    routes: ["/dates"],
    apiPatterns: [/^\/api\/appointments(\/|$)/],
    navHref: "/dates",
  },
  {
    key: "pharmaceutical",
    label: "مكتبة الأدوية",
    description: "إدارة الأدوية والمفضلات والتصنيفات",
    routes: ["/pharmaceutical"],
    apiPatterns: [/^\/api\/medicines\/default-categories(\/|$)/],
    navHref: "/pharmaceutical",
  },
  {
    key: "patients",
    label: "المرضى",
    description: "سجل المرضى والملفات والزيارات",
    routes: ["/patients"],
    apiPatterns: [/^\/api\/patients(\/|$)/, /^\/api\/fields(\/|$)/],
    navHref: "/patients",
  },
  {
    key: "dental",
    label: "طبلة الأسنان",
    description: "مخطط الأسنان وصور الأسنان وملفات العلاج السني",
    routes: ["/dental"],
    apiPatterns: [
      /^\/api\/patients\/\d+\/dental-chart/,
      /^\/api\/patients\/\d+\/tooth-images/,
      /^\/api\/patients\/\d+\/treatment-plans/,
    ],
    navHref: "/dental",
  },
  {
    key: "finances",
    label: "المالية",
    description: "المعاملات المالية وإعدادات العيادة",
    routes: ["/finances"],
    apiPatterns: [/^\/api\/finances(\/|$)/],
    navHref: "/finances",
  },
  {
    key: "reports",
    label: "التقارير",
    description: "تقارير وإحصائيات العيادة",
    routes: ["/reports"],
    apiPatterns: [/^\/api\/reports(\/|$)/],
    navHref: "/reports",
  },
  {
    key: "prescriptions",
    label: "سجل الوصفات",
    description: "أرشيف الوصفات السابقة والمعاينة والطباعة",
    routes: ["/prescriptions"],
    apiPatterns: [],
    navHref: "/prescriptions",
  },
  {
    key: "recipe_settings",
    label: "تصميم الوصفة",
    description: "تخصيص شكل وطباعة الوصفة",
    routes: ["/recipe-settings"],
    apiPatterns: [/^\/api\/recipe-settings(\/|$)/],
    navHref: "/recipe-settings",
  },
  {
    key: "settings",
    label: "إعدادات العيادة",
    description: "الملف الشخصي ودعوات السكرتارية",
    routes: ["/setting"],
    apiPatterns: [/^\/api\/settings(\/|$)/],
    navHref: "/setting",
  },
  {
    key: "treatment",
    label: "خطة العلاج",
    description: "جلسات العلاج والتقويم الأسبوعي",
    routes: ["/treatment"],
    apiPatterns: [/^\/api\/treatment-(plans|sessions)(\/|$)/],
    navHref: "/dates",
  },
  {
    key: "search",
    label: "البحث الذكي",
    description: "البحث السريع في شريط الأدوات",
    routes: [],
    apiPatterns: [/^\/api\/search$/],
  },
  {
    key: "alerts",
    label: "التنبيهات الذكية",
    description: "تنبيهات المتابعة والمواعيد",
    routes: [],
    apiPatterns: [/^\/api\/alerts(\/|$)/],
  },
];

const DEFINITION_BY_KEY = Object.fromEntries(
  CLINIC_FEATURE_DEFINITIONS.map((def) => [def.key, def])
) as Record<ClinicFeatureKey, ClinicFeatureDefinition>;

const DEFAULT_ENABLED = Object.fromEntries(
  CLINIC_FEATURE_KEYS.map((key) => [key, true])
) as Record<ClinicFeatureKey, boolean>;

const FEATURE_EXEMPT_API_PREFIXES = [
  "/api/auth",
  "/api/features",
  "/api/dashboard",
  "/api/sync/",
  "/api/storage/",
  "/api/portal/",
  "/api/secretary/",
];

const FEATURE_EXEMPT_PAGE_PREFIXES = ["/subscription"];

const memoryCache = new Map<
  number,
  { map: Record<ClinicFeatureKey, boolean>; expiresAt: number }
>();

const MEMORY_TTL_MS = 15_000;

function isMissingFeatureTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  );
}

export async function ensureClinicFeaturesReady() {
  // Migrate legacy global table (key-only PK) → per-doctor schema in one shot.
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF to_regclass('public.clinic_feature_toggles') IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'clinic_feature_toggles'
             AND column_name = 'doctor_id'
         ) THEN
        DROP TABLE public.clinic_feature_toggles CASCADE;
      END IF;

      CREATE TABLE IF NOT EXISTS public.clinic_feature_toggles (
        id BIGSERIAL PRIMARY KEY,
        doctor_id BIGINT NOT NULL,
        key VARCHAR(64) NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS clinic_feature_toggles_doctor_key_unique
        ON public.clinic_feature_toggles (doctor_id, key);

      CREATE INDEX IF NOT EXISTS clinic_feature_toggles_doctor_id_index
        ON public.clinic_feature_toggles (doctor_id);
    END $$;
  `);
}

async function loadFeatureMapFromDb(
  doctorId: number
): Promise<Record<ClinicFeatureKey, boolean>> {
  try {
    const rows = await prisma.clinicFeatureToggle.findMany({
      where: { doctorId: toDbId(doctorId) },
    });
    const map = { ...DEFAULT_ENABLED };
    for (const row of rows) {
      if (row.key in map) {
        map[row.key as ClinicFeatureKey] = row.enabled;
      }
    }
    return map;
  } catch (error) {
    if (isMissingFeatureTableError(error)) {
      return { ...DEFAULT_ENABLED };
    }
    throw error;
  }
}

export async function getClinicFeatureMap(
  doctorId: number
): Promise<Record<ClinicFeatureKey, boolean>> {
  const cached = memoryCache.get(doctorId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.map;
  }

  const map = await loadFeatureMapFromDb(doctorId);
  memoryCache.set(doctorId, {
    map,
    expiresAt: Date.now() + MEMORY_TTL_MS,
  });
  return map;
}

export function invalidateClinicFeatureCache(doctorId?: number) {
  if (typeof doctorId === "number") {
    memoryCache.delete(doctorId);
    return;
  }
  memoryCache.clear();
}

export async function listClinicFeatures(doctorId: number) {
  await ensureClinicFeaturesReady();
  const map = await getClinicFeatureMap(doctorId);
  return CLINIC_FEATURE_DEFINITIONS.map((def) => ({
    key: def.key,
    label: def.label,
    description: def.description,
    enabled: map[def.key],
    navHref: def.navHref ?? null,
  }));
}

export async function setClinicFeatureEnabled(
  doctorId: number,
  key: ClinicFeatureKey,
  enabled: boolean
) {
  await ensureClinicFeaturesReady();
  await prisma.clinicFeatureToggle.upsert({
    where: {
      doctorId_key: {
        doctorId: toDbId(doctorId),
        key,
      },
    },
    create: {
      doctorId: toDbId(doctorId),
      key,
      enabled,
    },
    update: { enabled },
  });
  invalidateClinicFeatureCache(doctorId);
}

export async function isClinicFeatureEnabled(
  doctorId: number,
  key: ClinicFeatureKey
): Promise<boolean> {
  const map = await getClinicFeatureMap(doctorId);
  return map[key];
}

export function resolveClinicFeatureForPath(
  pathname: string
): ClinicFeatureKey | null {
  if (/^\/print\/prescriptions\//.test(pathname)) return "prescriptions";
  if (/^\/print\/patients\/\d+\/dental/.test(pathname)) return "dental";
  if (/^\/print\/patients\/\d+\/summary/.test(pathname)) return "patients";

  for (const def of CLINIC_FEATURE_DEFINITIONS) {
    if (
      def.routes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      )
    ) {
      return def.key;
    }
  }
  return null;
}

export function resolveClinicFeatureForApi(
  pathname: string
): ClinicFeatureKey | null {
  if (FEATURE_EXEMPT_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  for (const def of CLINIC_FEATURE_DEFINITIONS) {
    if (def.apiPatterns.some((pattern) => pattern.test(pathname))) {
      return def.key;
    }
  }
  return null;
}

export function isFeatureExemptPage(pathname: string): boolean {
  return FEATURE_EXEMPT_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function isDoctorPathAllowed(
  doctorId: number,
  pathname: string
): Promise<boolean> {
  if (isFeatureExemptPage(pathname)) return true;

  const featureKey = resolveClinicFeatureForPath(pathname);
  if (!featureKey) return true;

  return isClinicFeatureEnabled(doctorId, featureKey);
}

export async function getDoctorFallbackPath(doctorId: number): Promise<string> {
  const map = await getClinicFeatureMap(doctorId);
  const priority: ClinicFeatureKey[] = [
    "home",
    "queue",
    "dates",
    "patients",
    "prescriptions",
    "settings",
    "pharmaceutical",
    "dental",
    "finances",
    "reports",
    "recipe_settings",
    "treatment",
  ];

  for (const key of priority) {
    if (!map[key]) continue;
    const def = DEFINITION_BY_KEY[key];
    if (def.navHref) return def.navHref;
    if (def.routes[0]) return def.routes[0];
  }

  return "/subscription/expired";
}

export async function assertClinicFeatureForPath(
  doctorId: number,
  pathname: string
): Promise<Response | null> {
  const featureKey =
    resolveClinicFeatureForPath(pathname) ??
    resolveClinicFeatureForApi(pathname);
  if (!featureKey) return null;

  const enabled = await isClinicFeatureEnabled(doctorId, featureKey);
  if (enabled) return null;

  const label = DEFINITION_BY_KEY[featureKey]?.label ?? "هذه الميزة";
  return apiError(
    `${label} غير متاحة حالياً — تواصل مع إدارة النظام`,
    403
  );
}

export function filterNavHref(
  href: string,
  enabledMap: Record<ClinicFeatureKey, boolean>
) {
  const def = CLINIC_FEATURE_DEFINITIONS.find((item) => item.navHref === href);
  if (!def) return true;
  return enabledMap[def.key];
}
