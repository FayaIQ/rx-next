import { processSyncQueue } from "@/lib/sync/sync-engine";

/** Manual sync trigger (header button, service worker). */
export async function runSyncCycle(): Promise<boolean> {
  if (!navigator.onLine) return false;
  await processSyncQueue();
  return true;
}
