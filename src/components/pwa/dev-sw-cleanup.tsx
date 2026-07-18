"use client";

import { useEffect } from "react";

/**
 * In development Serwist is disabled, but a leftover production SW can still
 * control localhost and break navigations / auth. Unregister + clear caches once.
 */
export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch {
        // ignore — best-effort cleanup
      }
    })();
  }, []);

  return null;
}
