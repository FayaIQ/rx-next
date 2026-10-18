import { isAnalyticsHost } from "@/lib/analytics";
declare global {
  interface Window {
    gtag?: (
      command: string,
      eventName: string,
      parameters?: Record<string, unknown>
    ) => void;
  }
}

export function trackTrialSignup() {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production" || !isAnalyticsHost(window.location?.hostname ?? "") || !window.gtag) return;

  try {
    window.gtag("event", "sign_up", {
      method: "password",
      user_role: "doctor",
    });

    window.gtag("event", "conversion", {
      send_to: "AW-17698783004/XPEiCM-xwuIcEJz-t_dB",
      value: 1,
      currency: "USD",
    });
  } catch {
    // A tracking failure must not turn a created account into a failed signup.
  }
}

export function trackWhatsAppClick(placement: string) {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production" || !isAnalyticsHost(window.location?.hostname ?? "") || !window.gtag) return;

  window.gtag("event", "whatsapp_click", {
    placement,
    contact_number: "+9647847076026",
  });
}
