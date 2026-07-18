"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  hydrateFromServer,
  processSyncQueue,
  registerSyncListeners,
  refreshPendingCount,
} from "@/lib/sync/sync-engine";
import { getLastSync } from "@/lib/sync/offline-store";
import {
  backgroundRefresh,
  notifyOfflineMode,
  notifySubscriptionBlocked,
  reconnectAndSync,
} from "@/lib/sync/reconnect";
import { activateLocalCacheMode } from "@/lib/sync/sync-local";
import { useSyncStore } from "@/stores/sync-store";
import { SyncQueryListener } from "@/components/sync/sync-query-listener";

const CLINIC_ROLES = new Set(["doctor", "secretary"]);

function isAuthPath(pathname: string | null) {
  return !!pathname && pathname.startsWith("/auth/");
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const setOnline = useSyncStore((s) => s.setOnline);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const role = session?.user?.type;
  const canSync =
    status === "authenticated" &&
    !!role &&
    CLINIC_ROLES.has(role) &&
    !isAuthPath(pathname);

  useEffect(() => {
    setOnline(navigator.onLine);
    if (!canSync) return;

    const cleanup = registerSyncListeners();

    void (async () => {
      await refreshPendingCount();
      if (!navigator.onLine) {
        const lastSync = await getLastSync();
        if (lastSync) {
          useSyncStore.getState().setHydrated(true);
          useSyncStore.getState().setLastSync(lastSync);
        }
      }
    })();

    const scheduleReconnect = () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(() => {
        void reconnectAndSync();
      }, 800);
    };

    const onOnline = () => scheduleReconnect();
    const onOffline = () => notifyOfflineMode();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void reconnectAndSync();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const refreshInterval = setInterval(() => {
      void backgroundRefresh();
    }, 30_000);

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "RX_SYNC") {
        void reconnectAndSync();
      }
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onSwMessage);
    }

    return () => {
      cleanup?.();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(refreshInterval);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onSwMessage);
      }
    };
  }, [canSync, setOnline]);

  useEffect(() => {
    if (!canSync) return;

    const timer = setTimeout(() => {
      void (async () => {
        const hydrated = await hydrateFromServer();
        if (!hydrated) {
          await activateLocalCacheMode();
          if (useSyncStore.getState().subscriptionBlocked) {
            notifySubscriptionBlocked();
          }
        }
        if (!useSyncStore.getState().subscriptionBlocked) {
          await processSyncQueue();
        }
      })();
    }, 1500);

    return () => clearTimeout(timer);
  }, [canSync, session?.user?.id]);

  return (
    <>
      <SyncQueryListener />
      {children}
    </>
  );
}
