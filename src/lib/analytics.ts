import { postProductEvent } from "@/lib/product-analytics/client";
import { isDevTestDoctorPhone } from "@/lib/dev-test-doctor";
import { PUBLIC_DEMO_SESSION_ID } from "@/lib/demo/constants";

declare global {
  interface Window {
    __rxClarityAllowed?: boolean;
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[][] };
  }
}

export function isAnalyticsHost(hostname: string) {
  return hostname === "rx.faya.dev";
}

/** Stable labels only: never copy patient IDs, portal tokens or query strings. */
export function analyticsRoute(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0];
  if (/^\/portal(?:\/|$)/.test(path)) return "/portal/:token";
  return path
    .replace(/\/[0-9]+(?=\/|$)/g, "/:id")
    .replace(/^(\/blog)\/.+$/, "$1/:slug");
}

export function analyticsContext(
  pathname: string,
  user?: { type: string; sessionId: string; phoneNumber?: string },
) {
  const route = analyticsRoute(pathname);
  const demo = user?.sessionId === PUBLIC_DEMO_SESSION_ID || route === "/demo-preview";
  const area = route.startsWith("/portal/") ? "patient_portal"
    : route.startsWith("/dashboard") || user?.type === "admin" ? "admin"
    : demo ? "demo"
    : route.startsWith("/auth/") ? "auth"
    : route === "/onboarding" ? "onboarding"
    : user ? "clinic" : "marketing";
  return {
    route,
    area,
    account_mode: demo ? "demo" : user?.phoneNumber && isDevTestDoctorPhone(user.phoneNumber) ? "test" : user ? "real" : "visitor",
    user_role: user?.type ?? "visitor",
    environment: "production",
  };
}

export type AnalyticsEvent =
  | "signup_started" | "signup_failed"
  | "account_created" | "first_signin_success" | "signin_failed" | "onboarding_completed" | "first_value_completed"
  | "demo_requested" | "demo_ready" | "demo_failed";

export function trackAnalyticsEvent(event: AnalyticsEvent, context?: { role: "doctor" | "secretary" | "admin"; practiceType?: "general" | "dental" }) {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production" ||
      !isAnalyticsHost(window.location.hostname)) return;
  postProductEvent(event, context?.practiceType);
  if (window.__rxClarityAllowed === false) return;
  try {
    window.clarity ??= Object.assign(function (...args: unknown[]) {
      (window.clarity!.q ??= []).push(args);
    }, { q: [] as unknown[][] });
    if (context) {
      window.clarity("set", "user_role", context.role);
      if (context.practiceType) window.clarity("set", "practice_type", context.practiceType);
    }
    window.clarity("event", event);
  } catch {
    // Analytics must never prevent registration or a clinical operation.
  }
}


export function isClarityReplayPage(pathname: string, search = "") {
  const safe = pathname === "/" || /^\/(auth\/(signup|signin)|clinic\/free-trial|blog|solutions|features|compare|about|terms|privacy)(\/|$)/.test(pathname);
  if (!safe) return false;
  const params = new URLSearchParams(search);
  return [...params].every(([key, value]) => /^(utm_(source|medium|campaign|id)|practice|gclid|fbclid)$/.test(key) && /^[a-zA-Z0-9_.-]{0,200}$/.test(value));
}
