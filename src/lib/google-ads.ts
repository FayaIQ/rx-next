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
  if (typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", "conversion", {
    send_to: "AW-17698783004/XPEiCM-xwuIcEJz-t_dB",
    value: 1,
    currency: "USD",
  });
}

export function trackWhatsAppClick(placement: string) {
  if (typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", "whatsapp_click", {
    placement,
    contact_number: "+9647847076026",
  });
}
