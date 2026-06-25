"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  hydrateFromServer,
  processSyncQueue,
  registerSyncListeners,
  refreshPendingCount,
} from "@/lib/sync/sync-engine";
import { getLastSync } from "@/lib/sync/offline-store";
import { useSyncStore } from "@/stores/sync-store";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const setOnline = useSyncStore((s) => s.setOnline);

  useEffect(() => {
    setOnline(navigator.onLine);
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

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "RX_SYNC") {
          void processSyncQueue();
        }
      });
    }

    return cleanup;
  }, [setOnline]);

  useEffect(() => {
    if (session?.user?.type !== "doctor") return;
    void (async () => {
      await hydrateFromServer();
      await processSyncQueue();
    })();
  }, [session?.user?.type, session?.user?.id]);

  return <>{children}</>;
}
