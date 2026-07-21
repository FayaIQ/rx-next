import { getRxDb, getMeta } from "@/lib/db/rx-db";
import {
  persistHydration,
  mergePartialHydration,
  syncLocalPrescriptionFromDto,
  syncLocalAppointmentFromDto,
} from "@/lib/sync/offline-store";
import { collectReadyQueueItems } from "@/lib/sync/sync-priority";
import { dispatchSyncComplete } from "@/lib/sync/sync-events";
import {
  activateLocalCacheMode,
  classifySyncResponse,
  clearSubscriptionBlocked,
  isSubscriptionBlocked,
} from "@/lib/sync/sync-local";
import { useSyncStore } from "@/stores/sync-store";
import type { PrescriptionDto } from "@/lib/api/rx-client";

let syncing = false;
let subscriptionWarned = false;

function warnSubscriptionOnce() {
  if (subscriptionWarned) return;
  subscriptionWarned = true;
  console.warn("انتهى الاشتراك — سيتم استخدام البيانات المحلية فقط");
}

export async function hydrateFromServer(): Promise<boolean> {
  if (!navigator.onLine || isSubscriptionBlocked()) return false;

  try {
    useSyncStore.getState().setHydrating(true);
    const res = await fetch("/api/sync/hydrate");
    const data = await res.json().catch(() => ({}));
    const issue = classifySyncResponse(res, data);

    if (issue === "subscription_expired") {
      warnSubscriptionOnce();
      await activateLocalCacheMode();
      return false;
    }
    if (issue === "unauthorized") {
      await activateLocalCacheMode();
      return false;
    }
    if (issue === "error") {
      console.warn("hydrate failed:", data.error ?? "فشل التحميل");
      await activateLocalCacheMode();
      return false;
    }

    await persistHydration(data);
    clearSubscriptionBlocked();
    useSyncStore.getState().setLastSync(data.syncedAt);
    useSyncStore.getState().setHydrated(true);
    await refreshPendingCount();
    dispatchSyncComplete();
    return true;
  } catch (error) {
    console.warn("hydrate failed", error);
    await activateLocalCacheMode();
    return false;
  } finally {
    useSyncStore.getState().setHydrating(false);
  }
}

export async function pullRemoteChanges(): Promise<boolean> {
  if (!navigator.onLine || isSubscriptionBlocked()) return false;

  const since = await getMeta("last_full_sync");
  if (!since) {
    return hydrateFromServer();
  }

  try {
    const res = await fetch(
      `/api/sync/changes?since=${encodeURIComponent(since)}`
    );
    const data = await res.json().catch(() => ({}));
    const issue = classifySyncResponse(res, data);

    if (issue === "subscription_expired") {
      warnSubscriptionOnce();
      await activateLocalCacheMode();
      return false;
    }
    if (issue === "unauthorized") {
      return false;
    }
    if (issue === "error") {
      console.warn("pull changes failed:", data.error ?? "فشل جلب التغييرات");
      return false;
    }

    await mergePartialHydration(data);
    clearSubscriptionBlocked();
    useSyncStore.getState().setLastSync(data.syncedAt);
    useSyncStore.getState().setHydrated(true);
    return true;
  } catch (error) {
    console.warn("pull changes failed", error);
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

const MAX_SYNC_RETRIES = 12;

async function recoverStuckSyncingItems() {
  const db = getRxDb();
  const stuck = await db.sync_queue.where("status").equals("syncing").toArray();
  for (const item of stuck) {
    await db.sync_queue.update(item.id, { status: "pending" });
  }
}

async function resetReadyItems(
  ready: Array<{ id: string }>,
  status: "pending" | "failed" = "pending"
) {
  const db = getRxDb();
  for (const item of ready) {
    await db.sync_queue.update(item.id, { status });
  }
}

export async function processSyncQueue(): Promise<void> {
  if (syncing || !navigator.onLine || isSubscriptionBlocked()) return;
  syncing = true;
  useSyncStore.getState().setSyncing(true);

  let readyBatch: Array<{ id: string }> = [];

  try {
    const db = getRxDb();
    await recoverStuckSyncingItems();
    let progress = true;

    while (progress && navigator.onLine && !isSubscriptionBlocked()) {
      progress = false;

      const pending = (
        await db.sync_queue
          .where("status")
          .anyOf(["pending", "failed"])
          .sortBy("createdAt")
      ).filter((item) => item.retryCount < MAX_SYNC_RETRIES);

      if (pending.length === 0) break;

      const ready = await collectReadyQueueItems(pending);
      if (ready.length === 0) break;
      readyBatch = ready;

      for (const item of ready) {
        await db.sync_queue.update(item.id, { status: "syncing" });
      }

      let res: Response;
      let data: {
        error?: string;
        results?: Array<{
          queueId: string;
          localId: string;
          ok: boolean;
          serverId?: number;
          error?: string;
          data?: Record<string, unknown>;
        }>;
      };
      try {
        res = await fetch("/api/sync/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: ready }),
        });
        data = await res.json().catch(() => ({}));
      } catch (networkError) {
        console.warn("sync queue network failed", networkError);
        await resetReadyItems(ready, "pending");
        readyBatch = [];
        break;
      }

      const issue = classifySyncResponse(res, data);

      if (
        issue === "subscription_expired" ||
        issue === "unauthorized" ||
        issue === "error"
      ) {
        if (issue === "subscription_expired") {
          warnSubscriptionOnce();
          await activateLocalCacheMode();
        } else if (issue === "error") {
          console.warn("sync queue failed:", data.error ?? "فشلت المزامنة");
        }
        await resetReadyItems(ready, "pending");
        readyBatch = [];
        break;
      }

      clearSubscriptionBlocked();

      for (const result of data.results ?? []) {
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
      readyBatch = [];
    }

    if (!isSubscriptionBlocked()) {
      await pullRemoteChanges();
      dispatchSyncComplete();
    }
    await refreshPendingCount();
  } catch (error) {
    console.warn("sync queue failed", error);
    if (readyBatch.length > 0) {
      await resetReadyItems(readyBatch, "pending");
    }
    await recoverStuckSyncingItems();
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
    const rx = data as PrescriptionDto;
    await syncLocalPrescriptionFromDto(rx);
    // Drop the offline-created row so we don't keep a duplicate alongside srv-{id}.
    if (rx.id && item.localId !== `srv-${rx.id}`) {
      await db.prescriptions.delete(item.localId);
    }
  }

  if (item.entity === "prescription" && item.action === "delete") {
    await db.prescriptions.delete(item.localId);
  }

  if (item.entity === "dental_chart" && item.action === "update" && data) {
    const chart = data as import("@/lib/dental/serializer").DentalChartDto;
    const patientId = chart.patientId;
    const existing = await db.dental_charts.get(patientId);
    await db.dental_charts.put({
      patientServerId: patientId,
      patientName: existing?.patientName ?? "المريض",
      chart,
      synced: true,
      updatedAt: chart.updatedAt ?? new Date().toISOString(),
    });
  }

  if (item.entity === "treatment_session" && item.action === "update" && data) {
    const session = data as import("@/lib/api/rx-client").TreatmentSessionDto;
    const cached = await db.treatment_cache.get(session.patientId);
    if (cached) {
      const plans = cached.plans as import("@/lib/api/rx-client").TreatmentPlanDto[];
      const next = plans.map((plan) => ({
        ...plan,
        sessions: plan.sessions?.map((s) =>
          s.id === session.id ? { ...s, ...session } : s
        ),
      }));
      await db.treatment_cache.put({
        ...cached,
        plans: next as unknown as Array<Record<string, unknown>>,
        synced: true,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (item.entity === "treatment_plan" && item.action === "create" && data) {
    const plan = data as import("@/lib/api/rx-client").TreatmentPlanDto;
    const { cacheTreatmentPlansLocally } = await import(
      "@/lib/data/dental-offline-api"
    );
    const cached = await db.treatment_cache.get(plan.patientId);
    const existing = (
      (cached?.plans ?? []) as unknown as import("@/lib/api/rx-client").TreatmentPlanDto[]
    ).filter((p) => p.id > 0);
    await cacheTreatmentPlansLocally(plan.patientId, [...existing, plan]);
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
