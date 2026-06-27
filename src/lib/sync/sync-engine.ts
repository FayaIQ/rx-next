import { getRxDb, getMeta } from "@/lib/db/rx-db";
import {
  persistHydration,
  mergePartialHydration,
  syncLocalPrescriptionFromDto,
  syncLocalAppointmentFromDto,
} from "@/lib/sync/offline-store";
import { collectReadyQueueItems } from "@/lib/sync/sync-priority";
import { dispatchSyncComplete } from "@/lib/sync/sync-events";
import { useSyncStore } from "@/stores/sync-store";
import type { PrescriptionDto } from "@/lib/api/rx-client";

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
    dispatchSyncComplete();
    return true;
  } catch (error) {
    console.error("hydrate failed", error);
    return false;
  } finally {
    useSyncStore.getState().setHydrating(false);
  }
}

export async function pullRemoteChanges(): Promise<boolean> {
  if (!navigator.onLine) return false;

  const since = await getMeta("last_full_sync");
  if (!since) {
    return hydrateFromServer();
  }

  try {
    const res = await fetch(
      `/api/sync/changes?since=${encodeURIComponent(since)}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "فشل جلب التغييرات");

    await mergePartialHydration(data);
    useSyncStore.getState().setLastSync(data.syncedAt);
    useSyncStore.getState().setHydrated(true);
    return true;
  } catch (error) {
    console.error("pull changes failed", error);
    return false;
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
    let progress = true;

    while (progress && navigator.onLine) {
      progress = false;

      const pending = await db.sync_queue
        .where("status")
        .anyOf(["pending", "failed"])
        .sortBy("createdAt");

      if (pending.length === 0) break;

      const ready = await collectReadyQueueItems(pending);
      if (ready.length === 0) break;

      for (const item of ready) {
        await db.sync_queue.update(item.id, { status: "syncing" });
      }

      const res = await fetch("/api/sync/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: ready }),
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
        const item = ready.find((p) => p.id === result.queueId);
        if (!item) continue;

        if (result.ok) {
          await db.sync_queue.update(item.id, {
            status: "synced",
            serverId: result.serverId,
          });
          await applySyncedItem(item, result.serverId, result.data);
          progress = true;
        } else {
          await db.sync_queue.update(item.id, {
            status: "failed",
            retryCount: item.retryCount + 1,
            error: result.error,
          });
        }
      }
    }

    await pullRemoteChanges();
    dispatchSyncComplete();
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
      fieldValues?: Array<{ patientFieldId: number; value: string }>;
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
      fieldValues: p.fieldValues ?? [],
      synced: true,
      updatedAt: p.updatedAt,
    });
  }

  if (item.entity === "patient" && item.action === "delete") {
    await db.patients.delete(item.localId);
  }

  if (
    item.entity === "appointment" &&
    item.action !== "delete" &&
    data
  ) {
    await syncLocalAppointmentFromDto(
      data as import("@/lib/api/rx-client").AppointmentDto
    );
    if (item.localId !== `srv-${(data as { id: number }).id}`) {
      await db.appointments.delete(item.localId);
    }
  }

  if (item.entity === "appointment" && item.action === "visit_status") {
    if (data) {
      await syncLocalAppointmentFromDto(
        data as import("@/lib/api/rx-client").AppointmentDto
      );
    } else {
      await db.appointments.update(item.localId, { synced: true });
    }
  }

  if (item.entity === "appointment" && item.action === "delete") {
    await db.appointments.delete(item.localId);
  }

  if (item.entity === "prescription" && item.action !== "delete" && data) {
    await syncLocalPrescriptionFromDto(data as PrescriptionDto);
  }

  if (item.entity === "prescription" && item.action === "delete") {
    await db.prescriptions.delete(item.localId);
  }
}

export function registerSyncListeners() {
  if (typeof window === "undefined") return;

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

  return () => undefined;
}
