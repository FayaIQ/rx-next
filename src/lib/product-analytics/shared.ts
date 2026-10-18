import { z } from "zod";

export const acquisitionSchema = z.object({
  visitKey: z.string().uuid().optional(),
  source: z.enum(["direct", "facebook", "instagram", "google", "tiktok", "whatsapp", "email", "referral", "other"]).default("direct"),
  medium: z.enum(["direct", "paid_social", "cpc", "organic", "social", "email", "referral", "other"]).default("direct"),
  campaign: z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/).nullable().optional(),
});
export type Acquisition = z.infer<typeof acquisitionSchema>;

export function acquisitionFromUrl(raw: string, referrer = ""): Acquisition {
  const url = new URL(raw);
  const sourceRaw = (url.searchParams.get("utm_source") ?? "").toLowerCase();
  const aliases: Record<string, Acquisition["source"]> = { fb: "facebook", ig: "instagram", facebook: "facebook", instagram: "instagram", google: "google", tiktok: "tiktok", whatsapp: "whatsapp", email: "email" };
  let source: Acquisition["source"] = aliases[sourceRaw] ?? (sourceRaw ? "other" : "direct");
  let medium: Acquisition["medium"] = "direct";
  const mediumRaw = url.searchParams.get("utm_medium")?.toLowerCase();
  if (mediumRaw && acquisitionSchema.shape.medium.safeParse(mediumRaw).success) medium = mediumRaw as Acquisition["medium"];
  if (url.searchParams.has("gclid")) { source = "google"; medium = "cpc"; }
  else if (url.searchParams.has("fbclid") && source === "direct") { source = "facebook"; medium = "social"; }
  if (source === "direct" && referrer) {
    try {
      const host = new URL(referrer).hostname;
      if (host !== url.hostname) {
        source = /(^|\.)google\.[a-z.]+$/.test(host) ? "google" : /(^|\.)facebook\.com$/.test(host) ? "facebook" : /(^|\.)instagram\.com$/.test(host) ? "instagram" : "referral";
        medium = source === "google" ? "organic" : source === "referral" ? "referral" : "social";
      }
    } catch { /* Only classify known domains; never retain referrer URLs. */ }
  }
  const campaign = url.searchParams.get("utm_id") ?? url.searchParams.get("utm_campaign");
  return { source, medium, campaign: campaign && /^[a-zA-Z0-9_.-]{1,80}$/.test(campaign) ? campaign : null };
}

const STORAGE_KEY = "rx-acquisition-v1";
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
function storedAcquisition() {
  let raw: string | null = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch { /* Try the first-party cookie. */ }
  if (!raw) { const cookie = document.cookie.split("; ").find(value => value.startsWith(`${STORAGE_KEY}=`)); if (cookie) raw = decodeURIComponent(cookie.slice(STORAGE_KEY.length + 1)); }
  const stored = raw ? JSON.parse(raw) : null;
  return stored && typeof stored.capturedAt === "number" && Date.now() - stored.capturedAt >= 0 && Date.now() - stored.capturedAt < MAX_AGE && acquisitionSchema.safeParse(stored.data).success ? stored : null;
}
export function captureAcquisition() {
  if (typeof window === "undefined") return;
  try {
    const data = acquisitionFromUrl(location.href, document.referrer);
    const previous = storedAcquisition();
    if (previous && (previous.data.source !== "direct" || data.source === "direct")) return;
    const raw = JSON.stringify({ data, capturedAt: Date.now() });
    try { localStorage.setItem(STORAGE_KEY, raw); } catch { /* Cookie fallback remains available. */ }
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(raw)}; Path=/; Max-Age=2592000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch { /* An in-app browser may block both storage mechanisms. */ }
}
export function readAcquisition(): Acquisition {
  if (typeof window === "undefined") return { source: "direct", medium: "direct", campaign: null };
  try { captureAcquisition(); const stored = storedAcquisition(); if (stored) return acquisitionSchema.parse(stored.data); } catch { /* Use the current URL as a fallback. */ }
  return acquisitionFromUrl(location.href, document.referrer);
}

export const METRICS = ["LCP", "INP", "CLS", "TTFB", "FCP", "long_task_total", "long_task_max", "api_duration", "api_error", "js_error", "page_view", "signup_started", "signup_failed", "account_created", "first_signin_success", "signin_failed", "onboarding_completed", "first_value_completed", "demo_requested", "demo_ready", "demo_failed"] as const;
export const measurementSchema = z.object({
  visitKey: z.string().uuid().optional(),
  acquisition: acquisitionSchema.optional(),
  practiceType: z.enum(["general", "dental"]).optional(),
  id: z.string().regex(/^[a-zA-Z0-9:_-]{1,100}$/),
  route: z.string().max(200),
  metric: z.enum(METRICS),
  value: z.number().finite().min(0).max(3_600_000),
  device: z.enum(["mobile", "tablet", "desktop"]),
  errorCode: z.enum(["script_error", "postmessage_bridge", "unhandled_rejection", "api_error"]).nullable().optional(),
}).strict();

/** An allowlist, not just ID replacement: no free-form URLs reach analytics. */
export function measurementRoute(raw: string) {
  const path = raw.split(/[?#]/, 1)[0];
  const roots = ["/", "/home", "/patients", "/dates", "/queue", "/recipe-settings", "/finances", "/reports", "/dental", "/pharmaceutical", "/prescriptions", "/treatment/week", "/onboarding", "/auth/signup", "/auth/signin", "/clinic/free-trial", "/demo-preview"];
  if (roots.includes(path)) return path;
  if (/^\/(patients|dental|prescriptions)\/(?:\d+|:id)(?:\/(record|print|preview|dental|summary))?$/.test(path)) return path.replace(/\/\d+/, "/:id");
  if (path.startsWith("/dashboard")) return "/dashboard";
  if (path.startsWith("/secretary")) return "/secretary";
  if (path.startsWith("/portal")) return null;
  if (/^\/(blog|solutions|features|compare|about)(\/|$)/.test(path)) return `/${path.split("/")[1]}`;
  return "/other";
}

export function browserFamily(ua: string) {
  return /Instagram/i.test(ua) ? "Instagram" : /FBAN|FBAV/i.test(ua) ? "Facebook" : /Edg/i.test(ua) ? "Edge" : /Chrome|CriOS/i.test(ua) ? "Chrome" : /Safari/i.test(ua) ? "Safari" : /Firefox|FxiOS/i.test(ua) ? "Firefox" : "Other";
}

/** Anonymous visit only, expires after 30 minutes of inactivity. Never a patient or account ID. */
export function productVisitKey(): string | undefined {
  try {
    const now = Date.now(), raw = sessionStorage.getItem("rx-product-visit");
    const previous = raw ? JSON.parse(raw) : null;
    const key = previous && typeof previous.at === "number" && now - previous.at >= 0 && now - previous.at < 1800000 && z.string().uuid().safeParse(previous.key).success ? previous.key : crypto.randomUUID();
    sessionStorage.setItem("rx-product-visit", JSON.stringify({ key, at: now }));
    return key;
  } catch { return undefined; }
}
export function measurementVisitContext(practiceType?: "general" | "dental") {
  return { visitKey: productVisitKey(), acquisition: readAcquisition(), ...(practiceType ? { practiceType } : {}) };
}
