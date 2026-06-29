"use client";

import {
  rxApi,
  type TreatmentPlanDto,
  type TreatmentSessionDto,
} from "@/lib/api/rx-client";
import type { DentalChartDto } from "@/lib/dental/serializer";
import { getRxDb } from "@/lib/db/rx-db";
import { enqueueSyncItem } from "@/lib/sync/offline-store";
import { processSyncQueue } from "@/lib/sync/sync-engine";

type ChartResponse = {
  patient: { id: number; name: string };
  chart: DentalChartDto;
};

export async function cacheDentalChartLocally(
  patientId: number,
  patientName: string,
  chart: DentalChartDto
) {
  const now = new Date().toISOString();
  await getRxDb().dental_charts.put({
    patientServerId: patientId,
    patientName,
    chart,
    synced: true,
    updatedAt: chart.updatedAt ?? now,
  });
}

export async function cacheTreatmentPlansLocally(
  patientId: number,
  plans: TreatmentPlanDto[]
) {
  const now = new Date().toISOString();
  await getRxDb().treatment_cache.put({
    patientServerId: patientId,
    plans: plans as unknown as Array<Record<string, unknown>>,
    synced: true,
    updatedAt: now,
  });
}

export async function fetchDentalChartOfflineFirst(
  patientId: number
): Promise<ChartResponse> {
  if (navigator.onLine) {
    try {
      const res = await rxApi.dental.getChart(patientId);
      await cacheDentalChartLocally(
        patientId,
        res.patient.name,
        res.chart
      );
      return res;
    } catch {
      // fall through
    }
  }

  const cached = await getRxDb().dental_charts.get(patientId);
  if (cached) {
    return {
      patient: { id: patientId, name: cached.patientName },
      chart: {
        ...cached.chart,
        teeth: cached.chart.teeth.map((t) => ({
          ...t,
          updatedAt: t.updatedAt ?? null,
        })),
      },
    };
  }

  if (navigator.onLine) {
    return rxApi.dental.getChart(patientId);
  }

  throw new Error("لا توجد بيانات طبلة محلية — اتصل بالإنترنت أولاً");
}

export async function saveDentalChartOffline(
  patientId: number,
  body: {
    notes: string | null;
    teeth: Array<{ toothFdi: number; status: string; notes?: string | null }>;
  }
) {
  if (navigator.onLine) {
    const res = await rxApi.dental.saveChart(patientId, body);
    const existing = await getRxDb().dental_charts.get(patientId);
    await cacheDentalChartLocally(
      patientId,
      existing?.patientName ?? "المريض",
      res.chart
    );
    return res;
  }

  const now = new Date().toISOString();
  const existing = await getRxDb().dental_charts.get(patientId);
  const chart: DentalChartDto = {
    id: existing?.chart.id ?? 0,
    patientId,
    doctorId: existing?.chart.doctorId ?? 0,
    notes: body.notes,
    updatedAt: now,
    teeth: body.teeth.map((t) => ({
      toothFdi: t.toothFdi,
      status: t.status,
      notes: t.notes ?? null,
      updatedAt: now,
    })),
  };

  await getRxDb().dental_charts.put({
    patientServerId: patientId,
    patientName: existing?.patientName ?? "المريض",
    chart,
    synced: false,
    updatedAt: now,
  });

  const localId = `dental-${patientId}`;
  await enqueueSyncItem({
    entity: "dental_chart",
    action: "update",
    payload: { patientId, ...body },
    localId,
    serverId: patientId,
  });
  void processSyncQueue();

  return { chart };
}

export async function fetchTreatmentPlansOfflineFirst(
  patientId: number,
  opts?: { toothFdi?: number }
): Promise<{ plans: TreatmentPlanDto[] }> {
  if (navigator.onLine) {
    try {
      const res = await rxApi.treatment.listPlans(patientId, opts);
      await cacheTreatmentPlansLocally(patientId, res.plans);
      return res;
    } catch {
      // fall through
    }
  }

  const cached = await getRxDb().treatment_cache.get(patientId);
  if (cached) {
    let plans = cached.plans as unknown as TreatmentPlanDto[];
    if (opts?.toothFdi != null) {
      plans = plans.filter((p) => p.toothFdi === opts.toothFdi);
    }
    return { plans };
  }

  if (navigator.onLine) {
    return rxApi.treatment.listPlans(patientId, opts);
  }

  return { plans: [] };
}

async function patchLocalSession(
  patientId: number,
  sessionId: number,
  patch: Partial<TreatmentSessionDto>
) {
  const cached = await getRxDb().treatment_cache.get(patientId);
  if (!cached) return;
  const plans = cached.plans as unknown as TreatmentPlanDto[];
  const next = plans.map((plan) => ({
    ...plan,
    sessions: plan.sessions?.map((s) =>
      s.id === sessionId ? { ...s, ...patch } : s
    ),
  }));
  await getRxDb().treatment_cache.put({
    ...cached,
    plans: next as unknown as Array<Record<string, unknown>>,
    synced: false,
    updatedAt: new Date().toISOString(),
  });
}

export async function createTreatmentPlanOffline(
  patientId: number,
  body: Record<string, unknown>
) {
  if (navigator.onLine) {
    const res = await rxApi.treatment.createPlan(patientId, body);
    await cacheTreatmentPlansLocally(patientId, [
      ...(await fetchTreatmentPlansOfflineFirst(patientId)).plans.filter(
        (p) => p.id !== res.plan.id
      ),
      res.plan,
    ]);
    return res;
  }

  const localId = `plan-${patientId}-${Date.now()}`;
  await enqueueSyncItem({
    entity: "treatment_plan",
    action: "create",
    payload: { patientId, ...body },
    localId,
    serverId: patientId,
  });
  void processSyncQueue();

  return {
    plan: {
      id: 0,
      patientId,
      toothFdi: Number(body.toothFdi),
      treatmentType: String(body.treatmentType),
      status: "active",
      sessions: [],
    },
  };
}

export async function updateTreatmentSessionOffline(
  sessionId: number,
  body: Record<string, unknown>
) {
  if (navigator.onLine) {
    const res = await rxApi.treatment.updateSession(sessionId, body);
    const patientId = res.session.patientId;
    const cached = await getRxDb().treatment_cache.get(patientId);
    if (cached) {
      await patchLocalSession(patientId, sessionId, res.session);
      await getRxDb().treatment_cache.update(patientId, { synced: true });
    }
    return res;
  }

  const cached = await getRxDb().treatment_cache.toArray();
  let patientId: number | null = null;
  for (const entry of cached) {
    const plans = entry.plans as unknown as TreatmentPlanDto[];
    for (const plan of plans) {
      const session = plan.sessions?.find((s) => s.id === sessionId);
      if (session) {
        patientId = entry.patientServerId;
        await patchLocalSession(
          patientId,
          sessionId,
          body as Partial<TreatmentSessionDto>
        );
        break;
      }
    }
    if (patientId) break;
  }

  const localId = `session-${sessionId}`;
  await enqueueSyncItem({
    entity: "treatment_session",
    action: "update",
    payload: body,
    localId,
    serverId: sessionId,
  });
  void processSyncQueue();

  return {
    session: {
      id: sessionId,
      patientId: patientId ?? 0,
      ...body,
    } as TreatmentSessionDto,
  };
}
