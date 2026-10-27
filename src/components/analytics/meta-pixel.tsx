"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAnalyticsHost } from "@/lib/analytics";
import { initializeMetaPixel, isMetaPixelPage, pauseMetaPixel, trackMetaEvent } from "@/lib/meta-pixel";

export function MetaPixel() {
  const pathname = usePathname();
  const { status } = useSession();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const previousPage = useRef<string | null>(null);

  useEffect(() => {
    // A full navigation from a private page must not send its URL as referrer.
    let safeReferrer = true;
    if (document.referrer) {
      try {
        const referrer = new URL(document.referrer);
        safeReferrer = referrer.origin !== location.origin ||
          isMetaPixelPage(referrer.pathname, referrer.search, referrer.hash);
      } catch { safeReferrer = false; }
    }
    const allowed = process.env.NODE_ENV === "production" &&
      isAnalyticsHost(location.hostname) && status === "unauthenticated" && safeReferrer &&
      isMetaPixelPage(location.pathname, location.search, location.hash);
    window.__rxMetaAllowed = allowed;
    setEnabled(allowed);
    if (!allowed) {
      pauseMetaPixel();
      previousPage.current = null;
      return;
    }
    initializeMetaPixel();
    const page = location.pathname + location.search;
    if (ready && previousPage.current !== page) {
      previousPage.current = page;
      trackMetaEvent("PageView");
    }
    return pauseMetaPixel;
  }, [pathname, status, ready]);

  useEffect(() => {
    const beforeNavigation = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = new URL(anchor.href);
      if (url.hostname === "wa.me" || url.hostname === "api.whatsapp.com") trackMetaEvent("Contact");
      if (url.origin === location.origin && !isMetaPixelPage(url.pathname, url.search, url.hash)) pauseMetaPixel();
    };
    const onUrlChange = () => {
      if (!isMetaPixelPage(location.pathname, location.search, location.hash)) pauseMetaPixel();
    };
    document.addEventListener("click", beforeNavigation, true);
    window.addEventListener("popstate", onUrlChange);
    window.addEventListener("hashchange", onUrlChange);
    return () => {
      document.removeEventListener("click", beforeNavigation, true);
      window.removeEventListener("popstate", onUrlChange);
      window.removeEventListener("hashchange", onUrlChange);
    };
  }, []);

  if (!enabled) return null;
  return <Script id="rx-meta-pixel" src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" onReady={() => setReady(true)} />;
}
