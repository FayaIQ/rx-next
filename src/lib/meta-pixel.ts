import { isAnalyticsHost, isClarityReplayPage } from "@/lib/analytics";

// Public identifier, owned by FAYA DEV LTD. Never put a CAPI token in client code.
export const META_PIXEL_ID = "1055071403947697";

type MetaQueue = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: MetaQueue;
  loaded: boolean;
  version: string;
  disablePushState: boolean;
};

declare global {
  interface Window {
    fbq?: MetaQueue;
    _fbq?: MetaQueue;
    __rxMetaAllowed?: boolean;
  }
}

/** No clinical routes, callbacks, fragments, or arbitrary URL parameters. */
export function isMetaPixelPage(pathname: string, search = "", hash = "") {
  return !hash && pathname !== "/auth/signin" &&
    isClarityReplayPage(pathname, search) &&
    /^\/[a-z0-9/-]*$/.test(pathname);
}

export function canTrackMetaPixel() {
  return typeof window !== "undefined" && process.env.NODE_ENV === "production" &&
    isAnalyticsHost(window.location.hostname) && window.__rxMetaAllowed === true &&
    isMetaPixelPage(window.location.pathname, window.location.search, window.location.hash);
}

export function initializeMetaPixel() {
  if (!canTrackMetaPixel()) return;
  if (!window.fbq) {
    const queue: MetaQueue = Object.assign(function (...args: unknown[]) {
      if (queue.callMethod) queue.callMethod(...args);
      else queue.queue.push(args);
    }, { queue: [] as unknown[][], loaded: true, version: "2.0", disablePushState: true });
    queue.push = queue;
    window.fbq = queue;
    window._fbq ??= queue;
    // Disable form scraping, automatic matching and automatic SPA PageViews.
    queue("set", "autoConfig", false, META_PIXEL_ID);
    queue("init", META_PIXEL_ID);
  }
  window.fbq.disablePushState = true;
  window.fbq("consent", "grant");
}

export function pauseMetaPixel() {
  window.__rxMetaAllowed = false;
  try { window.fbq?.("consent", "revoke"); } catch { /* A blocked SDK must not affect navigation. */ }
}

export function trackMetaEvent(event: "PageView" | "CompleteRegistration" | "Contact") {
  // Never queue a URL-dependent event that could flush later on a clinical page.
  if (!canTrackMetaPixel() || !window.fbq?.callMethod) return;
  try {
    // No names, phones, practice types, patient data, or form fields.
    window.fbq("trackSingle", META_PIXEL_ID, event, {}, { eventID: crypto.randomUUID() });
  } catch {
    // Advertising must never affect account creation or navigation.
  }
}
