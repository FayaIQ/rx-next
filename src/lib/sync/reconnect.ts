import { toast } from "sonner";
import { verifyOnline } from "@/lib/sync/connectivity";
import { processSyncQueue, pullRemoteChanges } from "@/lib/sync/sync-engine";
import { useSyncStore } from "@/stores/sync-store";

let busy = false;
let offlineNotified = false;

export async function reconnectAndSync(): Promise<boolean> {
  if (busy) return false;
  busy = true;

  try {
    const online = await verifyOnline();
    useSyncStore.getState().setOnline(online);

    if (!online) {
      return false;
    }

    offlineNotified = false;
    toast.loading("جاري المزامنة...", { id: "rx-sync", duration: Infinity });

    await processSyncQueue();

    toast.success("تمت المزامنة", { id: "rx-sync", duration: 2500 });
    return true;
  } catch {
    toast.error("تعذّرت المزامنة — ستُعاد المحاولة تلقائياً", {
      id: "rx-sync",
      duration: 4000,
    });
    return false;
  } finally {
    busy = false;
  }
}

export function notifyOfflineMode() {
  useSyncStore.getState().setOnline(false);
  if (offlineNotified) return;
  offlineNotified = true;
  toast.info("وضع أوفلاين — التغييرات تُحفظ محلياً", {
    id: "rx-offline",
    duration: 3500,
  });
}

export async function backgroundRefresh(): Promise<void> {
  if (!navigator.onLine || document.hidden || busy) return;

  const online = await verifyOnline();
  useSyncStore.getState().setOnline(online);
  if (!online) return;

  const pulled = await pullRemoteChanges();
  if (pulled) {
    const { dispatchSyncComplete } = await import("@/lib/sync/sync-events");
    dispatchSyncComplete();
  }
}
