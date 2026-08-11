"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

const projectId =
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() || "y0mpv61z1f";

function getClaritySessionId() {
  const storageKey = "rx-clarity-session-id";
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;

  const created = crypto.randomUUID();
  sessionStorage.setItem(storageKey, created);
  return created;
}

function ClarityUserContext() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!projectId || status !== "authenticated" || !session.user.id) return;

    // Clarity hashes this ID in the browser. Do not send names, phone numbers,
    // patient IDs, or any other clinical information to analytics.
    window.clarity?.(
      "identify",
      `rx-user-${session.user.id}`,
      getClaritySessionId(),
      pathname,
    );
    window.clarity?.("set", "user_role", session.user.type);
  }, [pathname, session?.user.id, session?.user.type, status]);

  return null;
}

export function MicrosoftClarity() {
  if (!projectId || process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script id="microsoft-clarity" strategy="afterInteractive">
        {`(function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window,document,"clarity","script",${JSON.stringify(projectId)});`}
      </Script>
      <ClarityUserContext />
    </>
  );
}
