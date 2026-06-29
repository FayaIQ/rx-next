import type { SyncEntity, SyncQueueItem } from "@/lib/db/rx-db";
import { getRxDb } from "@/lib/db/rx-db";

const ENTITY_ORDER: Record<SyncEntity, number> = {
  patient: 0,
  field: 1,
  medicine: 2,
  appointment: 3,
  prescription: 4,
  dental_chart: 5,
  treatment_plan: 6,
  treatment_session: 7,
};

export function sortSyncQueue(items: SyncQueueItem[]): SyncQueueItem[] {
  return [...items].sort((a, b) => {
    const orderDiff = ENTITY_ORDER[a.entity] - ENTITY_ORDER[b.entity];
    if (orderDiff !== 0) return orderDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export async function resolvePatientServerId(
  patientId: number,
  patientLocalId?: string
): Promise<number | null> {
  if (patientId > 0) return patientId;
  if (!patientLocalId) return null;
  const patient = await getRxDb().patients.get(patientLocalId);
  return patient?.serverId ?? null;
}

export async function prepareQueueItem(
  item: SyncQueueItem
): Promise<SyncQueueItem | null> {
  if (item.entity !== "prescription" && item.entity !== "appointment") {
    return item;
  }

  const payload = { ...item.payload };
  const patientLocalId = payload.patientLocalId as string | undefined;
  const resolved = await resolvePatientServerId(
    Number(payload.patientId ?? 0),
    patientLocalId
  );
  if (!resolved) return null;

  return {
    ...item,
    payload: { ...payload, patientId: resolved },
  };
}

export async function collectReadyQueueItems(
  items: SyncQueueItem[]
): Promise<SyncQueueItem[]> {
  const sorted = sortSyncQueue(items);
  const ready: SyncQueueItem[] = [];

  for (const item of sorted) {
    const prepared = await prepareQueueItem(item);
    if (prepared) ready.push(prepared);
  }

  return ready;
}
