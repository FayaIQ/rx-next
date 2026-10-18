"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { analyticsContext, isAnalyticsHost, isClarityReplayPage } from "@/lib/analytics";

const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() || "y0mpv61z1f";

function getClaritySessionId() {
  try {
    const key = "rx-clarity-session-id";
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(key, created);
    return created;
  } catch {
    return undefined;
  }
}

export function MicrosoftClarity() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const allowed = process.env.NODE_ENV === "production" && isAnalyticsHost(window.location.hostname) && status === "unauthenticated" && isClarityReplayPage(pathname, location.search);
    window.__rxClarityAllowed = allowed;
    if (!allowed && ready) window.clarity?.("stop");
    setEnabled(allowed);
  }, [pathname, status, ready]);

  useEffect(() => {
    const beforeNavigation = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      const url = new URL(target.href, location.href);
      if (url.origin === location.origin && !isClarityReplayPage(url.pathname, url.search)) {
        window.__rxClarityAllowed = false;
        window.clarity?.("stop");
      }
    };
    document.addEventListener("click", beforeNavigation, true);
    return () => document.removeEventListener("click", beforeNavigation, true);
  }, []);

  useEffect(() => {
    if (!enabled || !ready || status === "loading") return;
    try {
      const context = analyticsContext(pathname, session?.user);
      for (const [key, value] of Object.entries(context)) window.clarity?.("set", key, value);
      if (session?.user.id) {
        window.clarity?.("identify", `rx-user-${session.user.id}`, getClaritySessionId(), context.route);
      }
    } catch {
      // Storage restrictions or an analytics blocker must not break the app.
    }
  }, [enabled, ready, pathname, session?.user, status]);

  if (!projectId || !enabled) return null;
  return (
    <Script id="microsoft-clarity" strategy="afterInteractive" onReady={() => setReady(true)}>
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script",${JSON.stringify(projectId)});`}
    </Script>
  );
}
