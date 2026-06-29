import { getMeta, getRxDb } from "@/lib/db/rx-db";
import { useSyncStore } from "@/stores/sync-store";

export function markSubscriptionExpired() {
  useSyncStore.getState().setSubscriptionBlocked(true);
}

export function isSubscriptionBlocked() {
  return useSyncStore.getState().subscriptionBlocked;
}

/** Use cached IndexedDB when server sync is unavailable. */
export async function activateLocalCacheMode() {
  const lastSync = await getMeta("last_full_sync");
  if (lastSync) {
    useSyncStore.getState().setHydrated(true);
    useSyncStore.getState().setLastSync(lastSync);
  }
  const count = await getRxDb().sync_queue
    .where("status")
    .anyOf(["pending", "failed"])
    .count();
  useSyncStore.getState().setPendingCount(count);
}

export type SyncApiIssue = "subscription_expired" | "error" | null;

export function classifySyncResponse(
  res: Response,
  data: { error?: string }
): SyncApiIssue {
  if (res.status === 402) {
    markSubscriptionExpired();
    return "subscription_expired";
  }
  if (!res.ok) return "error";
  return null;
}
