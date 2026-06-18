import { getRxDb } from "@/lib/db/rx-db";
import { persistHydration } from "@/lib/sync/offline-store";
import { useSyncStore } from "@/stores/sync-store";

let syncing = false;

export async function hydrateFromServer(): Promise<boolean> {
  if (!navigator.onLine) return false;

  try {
    useSyncStore.getState().setHydrating(true);
    const res = await fetch("/api/sync/hydrate");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "فشل التحميل");

    await persistHydration(data);
    useSyncStore.getState().setLastSync(data.syncedAt);
    useSyncStore.getState().setHydrated(true);
    await refreshPendingCount();
    return true;
  } catch (error) {
    console.error("hydrate failed", error);
    return false;
  } finally {
    useSyncStore.getState().setHydrating(false);
  }
}

export async function refreshPendingCount() {
  const count = await getRxDb().sync_queue
    .where("status")
    .anyOf(["pending", "failed"])
    .count();
  useSyncStore.getState().setPendingCount(count);
}

export async function processSyncQueue(): Promise<void> {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  useSyncStore.getState().setSyncing(true);

  try {
    const db = getRxDb();
    const pending = await db.sync_queue
      .where("status")
      .anyOf(["pending", "failed"])
      .sortBy("createdAt");

    if (pending.length === 0) {
      await refreshPendingCount();
      return;
    }

    for (const item of pending) {
      await db.sync_queue.update(item.id, { status: "syncing" });
    }

    const res = await fetch("/api/sync/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: pending }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "فشلت المزامنة");
    }

    for (const result of data.results as Array<{
      queueId: string;
      localId: string;
      ok: boolean;
      serverId?: number;
      error?: string;
      data?: Record<string, unknown>;
    }>) {
      const item = pending.find((p) => p.id === result.queueId);
      if (!item) continue;

      if (result.ok) {
        await db.sync_queue.update(item.id, { status: "synced", serverId: result.serverId });
        await applySyncedItem(item, result.serverId, result.data);
      } else {
        await db.sync_queue.update(item.id, {
          status: "failed",
          retryCount: item.retryCount + 1,
          error: result.error,
        });
      }
    }

    if (pending.length > 0) {
      await hydrateFromServer();
    }

    await refreshPendingCount();
  } catch (error) {
    console.error("sync queue failed", error);
    await refreshPendingCount();
  } finally {
    syncing = false;
    useSyncStore.getState().setSyncing(false);
  }
}

async function applySyncedItem(
  item: { entity: string; localId: string; action: string },
  serverId?: number,
  data?: Record<string, unknown>
) {
  const db = getRxDb();

  if (item.entity === "patient" && item.action !== "delete" && data) {
    const p = data as {
      id: number;
      name: string;
      gender: "male" | "female";
      birthdate: string | null;
      diagnosis: string | null;
      phone: string | null;
      doctorId: number;
      updatedAt: string;
    };
    await db.patients.put({
      id: item.localId,
      serverId: serverId ?? p.id,
      name: p.name,
      gender: p.gender,
      birthdate: p.birthdate ?? undefined,
      diagnosis: p.diagnosis ?? undefined,
      phone: p.phone ?? undefined,
      doctorId: p.doctorId,
      synced: true,
      updatedAt: p.updatedAt,
    });
  }

  if (item.entity === "patient" && item.action === "delete") {
    await db.patients.delete(item.localId);
  }
}

export function registerSyncListeners() {
  if (typeof window === "undefined") return;

  const onOnline = () => {
    useSyncStore.getState().setOnline(true);
    void processSyncQueue();
  };
  const onOffline = () => useSyncStore.getState().setOnline(false);

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        const syncManager = (reg as ServiceWorkerRegistration & {
          sync?: { register: (tag: string) => Promise<void> };
        }).sync;
        return syncManager?.register("rx-sync");
      })
      .catch(() => undefined);
  }

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
