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

export type SyncApiIssue = "subscription_expired" | "unauthorized" | "error" | null;

export function classifySyncResponse(
  res: Response,
  data: { error?: string }
): SyncApiIssue {
  if (res.status === 402) {
    markSubscriptionExpired();
    return "subscription_expired";
  }
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (!path.startsWith("/auth/")) {
        void (async () => {
          const { signOut } = await import("next-auth/react");
          await signOut({ redirect: false });
          const callback = encodeURIComponent(path);
          window.location.href = `/auth/signin?callbackUrl=${callback}&error=session_expired`;
        })();
      }
    }
    return "unauthorized";
  }
  if (!res.ok) return "error";
  return null;
}
