import { getMeta } from "@/lib/db/rx-db";
import { markSubscriptionExpired } from "@/lib/sync/sync-local";

const PING_TIMEOUT_MS = 4000;

/** navigator.onLine can lie — verify with a lightweight API call. */
export async function verifyOnline(): Promise<boolean> {
  if (!navigator.onLine) return false;

  const since =
    (await getMeta("last_full_sync")) ?? new Date(0).toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

  try {
    const res = await fetch(
      `/api/sync/changes?since=${encodeURIComponent(since)}`,
      { signal: controller.signal, cache: "no-store" }
    );
    if (res.status === 402) {
      markSubscriptionExpired();
      return true;
    }
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
