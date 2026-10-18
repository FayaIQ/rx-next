"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAnalyticsHost, isClarityReplayPage } from "@/lib/analytics";

export function GoogleTags() {
  const pathname = usePathname(); const { status } = useSession(); const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const allowed = process.env.NODE_ENV === "production" && isAnalyticsHost(location.hostname) && status === "unauthenticated" && isClarityReplayPage(pathname, location.search);
    (window as unknown as Record<string, unknown>)["ga-disable-G-46PTJCE9ED"] = !allowed;
    setEnabled(allowed);
  }, [pathname, status]);
  useEffect(() => {
    const beforeNavigation = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href);
      if (url.origin === location.origin && !isClarityReplayPage(url.pathname, url.search)) (window as unknown as Record<string, unknown>)["ga-disable-G-46PTJCE9ED"] = true;
    };
    document.addEventListener("click", beforeNavigation, true); return () => document.removeEventListener("click", beforeNavigation, true);
  }, []);
  if (!enabled) return null;
  return <><Script src="https://www.googletagmanager.com/gtag/js?id=G-46PTJCE9ED" strategy="afterInteractive" /><Script id="rx-google-tag" strategy="afterInteractive">{`
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
    gtag('js',new Date());
    gtag('config','G-46PTJCE9ED',{page_location:location.origin+location.pathname});
    gtag('config','AW-17698783004');
  `}</Script></>;
}
