import { toast } from "sonner";
import { verifyOnline } from "@/lib/sync/connectivity";
import { processSyncQueue, pullRemoteChanges } from "@/lib/sync/sync-engine";
import {
  activateLocalCacheMode,
  isSubscriptionBlocked,
} from "@/lib/sync/sync-local";
import { useSyncStore } from "@/stores/sync-store";

let busy = false;
let offlineNotified = false;
let subscriptionNotified = false;

/** Silent background sync — no snackbars (status shows in the header). */
export async function reconnectAndSync(): Promise<boolean> {
  if (busy || isSubscriptionBlocked()) return false;
  busy = true;

  try {
    const online = await verifyOnline();
    useSyncStore.getState().setOnline(online);

    if (!online) {
      return false;
    }

    if (isSubscriptionBlocked()) {
      notifySubscriptionBlocked();
      await activateLocalCacheMode();
      return false;
    }

    offlineNotified = false;
    await processSyncQueue();

    if (isSubscriptionBlocked()) {
      notifySubscriptionBlocked();
      await activateLocalCacheMode();
      return false;
    }

    return true;
  } catch {
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

export function notifySubscriptionBlocked() {
  if (subscriptionNotified) return;
  subscriptionNotified = true;
  toast.warning("انتهى الاشتراك — البيانات المحلية متاحة، المزامنة متوقفة", {
    id: "rx-subscription",
    duration: 5000,
  });
}

export async function backgroundRefresh(): Promise<void> {
  if (
    !navigator.onLine ||
    document.hidden ||
    busy ||
    isSubscriptionBlocked()
  ) {
    return;
  }

  const online = await verifyOnline();
  useSyncStore.getState().setOnline(online);
  if (!online || isSubscriptionBlocked()) return;

  const pulled = await pullRemoteChanges();
  if (pulled) {
    const { dispatchSyncComplete } = await import("@/lib/sync/sync-events");
    dispatchSyncComplete();
  }
}
