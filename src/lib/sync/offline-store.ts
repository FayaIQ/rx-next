import {
  getRxDb,
  setMeta,
  getMeta,
  type LocalPatient,
  type LocalMedicine,
  type LocalPrescription,
  type LocalAppointment,
  type LocalPatientField,
  type LocalMedicinePreset,
  type SyncQueueItem,
} from "@/lib/db/rx-db";
import type {
  PatientDto,
  MedicineDto,
  MedicinePresetDto,
  PrescriptionDto,
  PatientFieldDto,
  AppointmentDto,
} from "@/lib/api/rx-client";
import { formatAge, countVisitsFromDates } from "@/lib/patient-utils";
import {
  mergeAppointments,
  mergeMedicines,
  mergePatientFields,
  mergePatients,
  mergePrescriptions,
} from "@/lib/sync/hydration-merge";

export async function persistHydration(data: {
  patients: PatientDto[];
  medicines: MedicineDto[];
  prescriptions: Array<Record<string, unknown>>;
  appointments: Array<Record<string, unknown>>;
  fields: Array<Record<string, unknown>>;
  defaultMedicines: Array<{
    id: number;
    categoryId: number;
    name: string;
    type?: string;
    dosage?: string;
  }>;
  medicinePresets?: MedicinePresetDto[];
  recipeSettings?: { doctorId: number; data: Record<string, unknown> } | null;
  dentalCharts?: Array<{
    patientId: number;
    patientName: string;
    chart: Record<string, unknown>;
  }>;
  treatmentPlans?: Array<Record<string, unknown>>;
  syncedAt: string;
}) {
  const db = getRxDb();

  await db.transaction(
    "rw",
    [
      db.patients,
      db.medicines,
      db.prescriptions,
      db.appointments,
      db.patient_fields,
      db.default_medicines,
      db.medicine_presets,
      db.recipe_settings,
      db.dental_charts,
      db.treatment_cache,
      db.meta,
    ],
    async () => {
      const patients = data.patients.map(
        (p): LocalPatient => ({
          id: `srv-${p.id}`,
          serverId: p.id,
          name: p.name,
          gender: p.gender,
          birthdate: p.birthdate ?? undefined,
          diagnosis: p.diagnosis ?? undefined,
          phone: p.phone ?? undefined,
          doctorId: p.doctorId,
          fieldValues: p.fieldValues ?? [],
          synced: true,
          updatedAt: p.updatedAt,
        })
      );
      await mergePatients(patients);

      const medicines = data.medicines.map(
        (m): LocalMedicine => ({
          id: `srv-${m.id}`,
          serverId: m.id,
          doctorId: m.doctorId,
          name: m.name,
          type: m.type ?? undefined,
          dosage: m.dosage ?? undefined,
          quantity: m.quantity ?? undefined,
          period: m.period ?? undefined,
          timeOfUse: m.timeOfUse ?? undefined,
          synced: true,
          updatedAt: m.updatedAt,
        })
      );
      await mergeMedicines(medicines);

      const prescriptions = data.prescriptions.map((rx) => {
          const r = rx as {
            id: number;
            patientId: number;
            doctorId: number;
            prescriptionDate: string;
            diagnosis?: string;
            prescriptionNumber?: number;
            items: Array<Record<string, unknown>>;
            fieldValues: Array<{ patientFieldId: number; value: string }>;
            updatedAt?: string;
          };
          return {
            id: `srv-${r.id}`,
            serverId: r.id,
            patientId: `srv-${r.patientId}`,
            patientServerId: r.patientId,
            doctorId: r.doctorId,
            prescriptionDate: r.prescriptionDate,
            diagnosis: r.diagnosis,
            prescriptionNumber: r.prescriptionNumber,
            items: (r.items ?? []).map((item) => {
              const i = item as { id: number; name: string; type?: string; dosage?: string; quantity?: string; period?: string; timeOfUse?: string };
              return {
                id: `srv-item-${i.id}`,
                serverId: i.id,
                name: i.name,
                type: i.type,
                dosage: i.dosage,
                quantity: i.quantity,
                period: i.period,
                timeOfUse: i.timeOfUse,
              };
            }),
            fieldValues: r.fieldValues ?? [],
            synced: true,
            updatedAt: r.updatedAt ?? new Date().toISOString(),
          } satisfies LocalPrescription;
        });
      await mergePrescriptions(prescriptions);

      const appointments = data.appointments.map((a) => {
          const ap = a as {
            id: number;
            doctorId: number;
            patientId: number;
            appointmentDatetime: string;
            bookingDate: string | null;
            notes?: string;
            status: boolean;
            visitStatus?: string;
            checkedInAt?: string | null;
            updatedAt: string;
          };
          return {
            id: `srv-${ap.id}`,
            serverId: ap.id,
            doctorId: ap.doctorId,
            patientId: `srv-${ap.patientId}`,
            patientServerId: ap.patientId,
            appointmentDatetime: ap.appointmentDatetime,
            bookingDate: ap.bookingDate ?? ap.appointmentDatetime,
            notes: ap.notes,
            status: ap.status,
            visitStatus: ap.visitStatus ?? "scheduled",
            checkedInAt: ap.checkedInAt ?? null,
            synced: true,
            updatedAt: ap.updatedAt,
          } satisfies LocalAppointment;
        });
      await mergeAppointments(appointments);

      const fields = data.fields.map((f) => {
          const field = f as {
            id: number;
            doctorId: number;
            name: string;
            size: string;
            isActive: boolean;
            isPrintable: boolean;
            isPersonal: boolean;
          };
          return {
            id: `srv-${field.id}`,
            serverId: field.id,
            doctorId: field.doctorId,
            name: field.name,
            size: field.size as "larg" | "medium" | "small",
            isActive: field.isActive,
            isPrintable: field.isPrintable,
            isPersonal: field.isPersonal,
            synced: true,
            updatedAt: new Date().toISOString(),
          } satisfies LocalPatientField;
        });
      await mergePatientFields(fields);

      if (data.defaultMedicines.length) {
        await db.default_medicines.clear();
        await db.default_medicines.bulkPut(data.defaultMedicines);
      }

      if (data.medicinePresets?.length) {
        await db.medicine_presets.bulkPut(
          data.medicinePresets.map(
            (p): LocalMedicinePreset => ({
              id: `srv-${p.id}`,
              serverId: p.id,
              doctorId: p.doctorId,
              medicineKey: p.medicineKey,
              name: p.name,
              type: p.type,
              dosage: p.dosage,
              quantity: p.quantity,
              period: p.period,
              timeOfUse: p.timeOfUse,
              usageCount: p.usageCount,
              lastUsedAt: p.lastUsedAt,
              updatedAt: p.lastUsedAt,
            })
          )
        );
      }

      if (data.recipeSettings) {
        await db.recipe_settings.put({
          doctorId: data.recipeSettings.doctorId,
          data: data.recipeSettings.data,
          updatedAt: new Date().toISOString(),
        });
      }

      if (data.dentalCharts?.length) {
        await db.dental_charts.bulkPut(
          data.dentalCharts.map((entry) => ({
            patientServerId: entry.patientId,
            patientName: entry.patientName,
            chart: entry.chart as import("@/lib/dental/serializer").DentalChartDto,
            synced: true,
            updatedAt:
              (entry.chart.updatedAt as string | null) ??
              new Date().toISOString(),
          }))
        );
      }

      if (data.treatmentPlans?.length) {
        const byPatient = new Map<number, Array<Record<string, unknown>>>();
        for (const plan of data.treatmentPlans) {
          const patientId = plan.patientId as number;
          const list = byPatient.get(patientId) ?? [];
          list.push(plan);
          byPatient.set(patientId, list);
        }
        await db.treatment_cache.bulkPut(
          [...byPatient.entries()].map(([patientServerId, plans]) => ({
            patientServerId,
            plans,
            synced: true,
            updatedAt: new Date().toISOString(),
          }))
        );
      }

      await setMeta("last_full_sync", data.syncedAt);
    }
  );
}

export async function mergePartialHydration(data: {
  patients?: PatientDto[];
  medicines?: MedicineDto[];
  prescriptions?: Array<Record<string, unknown>>;
  appointments?: Array<Record<string, unknown>>;
  fields?: Array<Record<string, unknown>>;
  dentalCharts?: Array<{
    patientId: number;
    patientName: string;
    chart: Record<string, unknown>;
  }>;
  treatmentPlans?: Array<Record<string, unknown>>;
  syncedAt: string;
}) {
  if (data.patients?.length) {
    await mergePatients(
      data.patients.map(
        (p): LocalPatient => ({
          id: `srv-${p.id}`,
          serverId: p.id,
          name: p.name,
          gender: p.gender,
          birthdate: p.birthdate ?? undefined,
          diagnosis: p.diagnosis ?? undefined,
          phone: p.phone ?? undefined,
          doctorId: p.doctorId,
          fieldValues: p.fieldValues ?? [],
          synced: true,
          updatedAt: p.updatedAt,
        })
      )
    );
  }

  if (data.medicines?.length) {
    await mergeMedicines(
      data.medicines.map(
        (m): LocalMedicine => ({
          id: `srv-${m.id}`,
          serverId: m.id,
          doctorId: m.doctorId,
          name: m.name,
          type: m.type ?? undefined,
          dosage: m.dosage ?? undefined,
          quantity: m.quantity ?? undefined,
          period: m.period ?? undefined,
          timeOfUse: m.timeOfUse ?? undefined,
          synced: true,
          updatedAt: m.updatedAt ?? new Date().toISOString(),
        })
      )
    );
  }

  if (data.prescriptions?.length) {
    await mergePrescriptions(
      data.prescriptions.map((rx) => {
        const r = rx as {
          id: number;
          patientId: number;
          doctorId: number;
          prescriptionDate: string;
          diagnosis?: string;
          prescriptionNumber?: number;
          items: Array<Record<string, unknown>>;
          fieldValues: Array<{ patientFieldId: number; value: string }>;
          updatedAt?: string;
        };
        return {
          id: `srv-${r.id}`,
          serverId: r.id,
          patientId: `srv-${r.patientId}`,
          patientServerId: r.patientId,
          doctorId: r.doctorId,
          prescriptionDate: r.prescriptionDate,
          diagnosis: r.diagnosis,
          prescriptionNumber: r.prescriptionNumber,
          items: (r.items ?? []).map((item) => {
            const i = item as {
              id: number;
              name: string;
              type?: string;
              dosage?: string;
              quantity?: string;
              period?: string;
              timeOfUse?: string;
            };
            return {
              id: `srv-item-${i.id}`,
              serverId: i.id,
              name: i.name,
              type: i.type,
              dosage: i.dosage,
              quantity: i.quantity,
              period: i.period,
              timeOfUse: i.timeOfUse,
            };
          }),
          fieldValues: r.fieldValues ?? [],
          synced: true,
          updatedAt: r.updatedAt ?? new Date().toISOString(),
        } satisfies LocalPrescription;
      })
    );
  }

  if (data.appointments?.length) {
    await mergeAppointments(
      data.appointments.map((a) => {
        const ap = a as {
          id: number;
          doctorId: number;
          patientId: number;
          appointmentDatetime: string;
          bookingDate: string | null;
          notes?: string;
          status: boolean;
          visitStatus?: string;
          checkedInAt?: string | null;
          updatedAt: string;
        };
        return {
          id: `srv-${ap.id}`,
          serverId: ap.id,
          doctorId: ap.doctorId,
          patientId: `srv-${ap.patientId}`,
          patientServerId: ap.patientId,
          appointmentDatetime: ap.appointmentDatetime,
          bookingDate: ap.bookingDate ?? ap.appointmentDatetime,
          notes: ap.notes,
          status: ap.status,
          visitStatus: ap.visitStatus ?? "scheduled",
          checkedInAt: ap.checkedInAt ?? null,
          synced: true,
          updatedAt: ap.updatedAt,
        } satisfies LocalAppointment;
      })
    );
  }

  if (data.fields?.length) {
    await mergePatientFields(
      data.fields.map((f) => {
        const field = f as {
          id: number;
          doctorId: number;
          name: string;
          size: string;
          isActive: boolean;
          isPrintable: boolean;
          isPersonal: boolean;
          updatedAt?: string;
        };
        return {
          id: `srv-${field.id}`,
          serverId: field.id,
          doctorId: field.doctorId,
          name: field.name,
          size: field.size as "larg" | "medium" | "small",
          isActive: field.isActive,
          isPrintable: field.isPrintable,
          isPersonal: field.isPersonal,
          synced: true,
          updatedAt: field.updatedAt ?? new Date().toISOString(),
        } satisfies LocalPatientField;
      })
    );
  }

  if (data.dentalCharts?.length) {
    const db = getRxDb();
    for (const entry of data.dentalCharts) {
      await db.dental_charts.put({
        patientServerId: entry.patientId,
        patientName: entry.patientName,
        chart: entry.chart as import("@/lib/dental/serializer").DentalChartDto,
        synced: true,
        updatedAt:
          (entry.chart.updatedAt as string | null) ?? new Date().toISOString(),
      });
    }
  }

  if (data.treatmentPlans?.length) {
    const db = getRxDb();
    const byPatient = new Map<number, Array<Record<string, unknown>>>();
    for (const plan of data.treatmentPlans) {
      const patientId = plan.patientId as number;
      const list = byPatient.get(patientId) ?? [];
      list.push(plan);
      byPatient.set(patientId, list);
    }
    for (const [patientServerId, incoming] of byPatient) {
      const existing = await db.treatment_cache.get(patientServerId);
      const byId = new Map<number, Record<string, unknown>>();
      for (const plan of existing?.plans ?? []) {
        const id = plan.id as number;
        if (id > 0) byId.set(id, plan);
      }
      for (const plan of incoming) {
        byId.set(plan.id as number, plan);
      }
      await db.treatment_cache.put({
        patientServerId,
        plans: [...byId.values()],
        synced: true,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  await setMeta("last_full_sync", data.syncedAt);
}

function dedupeLocalPatients(rows: LocalPatient[]): LocalPatient[] {
  const byKey = new Map<string, LocalPatient>();
  for (const p of rows) {
    const key = p.serverId != null ? `srv-${p.serverId}` : p.id;
    const existing = byKey.get(key);
    if (!existing || p.updatedAt >= existing.updatedAt) {
      byKey.set(key, p);
    }
  }
  return Array.from(byKey.values());
}

/** Keep IndexedDB in sync after a server save and remove duplicate rows. */
export async function syncLocalPatientFromDto(patient: PatientDto): Promise<void> {
  const db = getRxDb();
  const matches = await db.patients
    .filter((p) => p.serverId === patient.id)
    .toArray();
  const primaryId =
    matches.find((m) => m.id === `srv-${patient.id}`)?.id ??
    matches[0]?.id ??
    `srv-${patient.id}`;

  await db.patients.put({
    id: primaryId,
    serverId: patient.id,
    name: patient.name,
    gender: patient.gender,
    birthdate: patient.birthdate ?? undefined,
    diagnosis: patient.diagnosis ?? undefined,
    phone: patient.phone ?? undefined,
    doctorId: patient.doctorId,
    fieldValues: patient.fieldValues ?? [],
    synced: true,
    updatedAt: patient.updatedAt,
  });

  for (const match of matches) {
    if (match.id !== primaryId) {
      await db.patients.delete(match.id);
    }
  }
}

export async function getLocalPatients(q?: string): Promise<PatientDto[]> {
  const db = getRxDb();
  let rows = dedupeLocalPatients(
    await db.patients.orderBy("updatedAt").reverse().toArray()
  );
  if (q?.trim()) {
    const term = q.trim().toLowerCase();
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.phone ?? "").includes(term)
    );
  }
  const prescriptions = await db.prescriptions.toArray();
  return rows.map((p) => localPatientToDto(p, prescriptions));
}

function localPatientVisitStats(
  patient: LocalPatient,
  prescriptions: LocalPrescription[]
) {
  const related = prescriptions.filter(
    (rx) =>
      rx.patientId === patient.id ||
      (patient.serverId != null && rx.patientServerId === patient.serverId)
  );
  const dates = related.map((rx) => rx.prescriptionDate);
  const sorted = [...related].sort((a, b) =>
    b.prescriptionDate.localeCompare(a.prescriptionDate)
  );
  return {
    visitCount: countVisitsFromDates(dates),
    lastVisit: sorted[0]?.prescriptionDate ?? null,
  };
}

export function localPatientToDto(
  p: LocalPatient,
  prescriptions: LocalPrescription[] = []
): PatientDto {
  const visits = localPatientVisitStats(p, prescriptions);
  return {
    id: p.serverId ?? 0,
    name: p.name,
    gender: p.gender,
    birthdate: p.birthdate ?? null,
    diagnosis: p.diagnosis ?? null,
    phone: p.phone ?? null,
    doctorId: p.doctorId,
    age: formatAge(p.birthdate),
    visitCount: visits.visitCount,
    lastVisit: visits.lastVisit,
    createdAt: p.updatedAt,
    updatedAt: p.updatedAt,
    fieldValues: p.fieldValues ?? [],
  };
}

export async function getLocalMedicines(q?: string): Promise<MedicineDto[]> {
  const db = getRxDb();
  let rows = await db.medicines.orderBy("name").toArray();
  if (q?.trim()) {
    const term = q.trim().toLowerCase();
    rows = rows.filter((m) => m.name.toLowerCase().includes(term));
  }
  return rows.map((m) => ({
    id: m.serverId ?? 0,
    doctorId: m.doctorId,
    name: m.name,
    type: m.type ?? null,
    dosage: m.dosage ?? null,
    quantity: m.quantity ?? null,
    period: m.period ?? null,
    timeOfUse: m.timeOfUse ?? null,
    createdAt: m.updatedAt,
    updatedAt: m.updatedAt,
  }));
}

export async function getLocalMedicinePresets(): Promise<MedicinePresetDto[]> {
  const db = getRxDb();
  const rows = await db.medicine_presets
    .orderBy("lastUsedAt")
    .reverse()
    .toArray();
  return rows.map((p) => ({
    id: p.serverId ?? 0,
    doctorId: p.doctorId,
    medicineKey: p.medicineKey,
    name: p.name,
    type: p.type,
    dosage: p.dosage,
    quantity: p.quantity,
    period: p.period,
    timeOfUse: p.timeOfUse,
    usageCount: p.usageCount,
    lastUsedAt: p.lastUsedAt,
  }));
}

export async function cacheMedicinePresetsLocally(
  presets: MedicinePresetDto[]
) {
  if (!presets.length) return;
  const db = getRxDb();
  await db.medicine_presets.bulkPut(
    presets.map(
      (p): LocalMedicinePreset => ({
        id: p.id ? `srv-${p.id}` : `local-${p.medicineKey}-${p.type}-${p.dosage}`,
        serverId: p.id || undefined,
        doctorId: p.doctorId,
        medicineKey: p.medicineKey,
        name: p.name,
        type: p.type,
        dosage: p.dosage,
        quantity: p.quantity,
        period: p.period,
        timeOfUse: p.timeOfUse,
        usageCount: p.usageCount,
        lastUsedAt: p.lastUsedAt,
        updatedAt: p.lastUsedAt,
      })
    )
  );
}

export async function upsertLocalMedicinesFromPrescription(
  items: Array<{
    name: string;
    type?: string | null;
    dosage?: string | null;
    quantity?: string | null;
    period?: string | null;
    timeOfUse?: string | null;
  }>
) {
  const db = getRxDb();
  const now = new Date().toISOString();
  const existingRows = await db.medicines.toArray();

  for (const item of items) {
    const name = item.name.trim();
    if (!name) continue;

    const fields = {
      type: (item.type ?? "").trim(),
      dosage: (item.dosage ?? "").trim(),
      quantity: (item.quantity ?? "").trim(),
      period: (item.period ?? "").trim(),
      timeOfUse: (item.timeOfUse ?? "").trim(),
    };

    const duplicate = existingRows.find(
      (row) =>
        row.name.trim().toLowerCase() === name.toLowerCase() &&
        (row.type ?? "") === fields.type &&
        (row.dosage ?? "") === fields.dosage &&
        (row.quantity ?? "") === fields.quantity &&
        (row.period ?? "") === fields.period &&
        (row.timeOfUse ?? "") === fields.timeOfUse
    );

    if (duplicate) continue;

    const localId = crypto.randomUUID();
    const created: LocalMedicine = {
      id: localId,
      doctorId: 0,
      name,
      type: fields.type || undefined,
      dosage: fields.dosage || undefined,
      quantity: fields.quantity || undefined,
      period: fields.period || undefined,
      timeOfUse: fields.timeOfUse || undefined,
      synced: false,
      updatedAt: now,
    };
    existingRows.push(created);
    await db.medicines.put(created);
  }
}

export async function upsertLocalMedicinePresets(
  items: Array<{
    name: string;
    type?: string | null;
    dosage?: string | null;
    quantity?: string | null;
    period?: string | null;
    timeOfUse?: string | null;
  }>
) {
  const { medicineGroupKey } = await import("@/lib/medicine-utils");
  const db = getRxDb();
  const now = new Date().toISOString();
  const allPresets = await db.medicine_presets.toArray();

  for (const item of items) {
    const name = item.name.trim();
    const fields = {
      type: (item.type ?? "").trim(),
      dosage: (item.dosage ?? "").trim(),
      quantity: (item.quantity ?? "").trim(),
      period: (item.period ?? "").trim(),
      timeOfUse: (item.timeOfUse ?? "").trim(),
    };
    if (
      !name ||
      (!fields.dosage &&
        !fields.quantity &&
        !fields.period &&
        !fields.timeOfUse)
    ) {
      continue;
    }

    const medicineKey = medicineGroupKey(name);
    const existing = allPresets.find(
      (preset) =>
        (preset.medicineKey === medicineKey ||
          preset.name.trim().toLowerCase() === name.toLowerCase()) &&
        preset.type === fields.type &&
        preset.dosage === fields.dosage &&
        preset.quantity === fields.quantity &&
        preset.period === fields.period &&
        preset.timeOfUse === fields.timeOfUse
    );

    if (existing) {
      existing.name = name;
      existing.usageCount += 1;
      existing.lastUsedAt = now;
      existing.updatedAt = now;
      await db.medicine_presets.update(existing.id, {
        name,
        usageCount: existing.usageCount,
        lastUsedAt: now,
        updatedAt: now,
      });
    } else {
      const localId = crypto.randomUUID();
      const created: LocalMedicinePreset = {
        id: localId,
        doctorId: 0,
        medicineKey,
        name,
        ...fields,
        usageCount: 1,
        lastUsedAt: now,
        updatedAt: now,
      };
      allPresets.push(created);
      await db.medicine_presets.put(created);
    }
  }
}

export async function enqueueSyncItem(
  item: Omit<SyncQueueItem, "id" | "createdAt" | "retryCount" | "status">
) {
  const db = getRxDb();
  const record: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date(),
    retryCount: 0,
  };
  await db.sync_queue.put(record);
  void import("@/lib/sync/sync-engine").then((m) => m.refreshPendingCount());
  return record;
}

export async function getLocalAppointments(date?: string): Promise<import("@/lib/api/rx-client").AppointmentDto[]> {
  const db = getRxDb();
  let rows = await db.appointments.orderBy("appointmentDatetime").toArray();

  if (date) {
    rows = rows.filter((a) => {
      const bookingKey = a.bookingDate?.slice(0, 10);
      if (bookingKey) return bookingKey === date;
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      const dt = new Date(a.appointmentDatetime);
      return dt >= dayStart && dt <= dayEnd;
    });
  }

  const patients = dedupeLocalPatients(await db.patients.toArray());
  const patientMap = new Map(
    patients.map((p) => [p.serverId ?? 0, p])
  );

  return rows.map((a) => {
    const patient = a.patientServerId
      ? patientMap.get(a.patientServerId)
      : undefined;
    return {
      id: a.serverId ?? 0,
      doctorId: a.doctorId,
      patientId: a.patientServerId ?? 0,
      appointmentDatetime: a.appointmentDatetime,
      bookingDate: a.bookingDate,
      notes: a.notes ?? null,
      status: a.status,
      visitStatus: a.visitStatus ?? "scheduled",
      checkedInAt: a.checkedInAt ?? null,
      createdAt: a.updatedAt,
      updatedAt: a.updatedAt,
      patient: patient
        ? {
            id: patient.serverId ?? 0,
            name: patient.name,
            phone: patient.phone ?? null,
            gender: patient.gender,
            age: formatAge(patient.birthdate),
          }
        : undefined,
    };
  });
}

export async function getPendingSyncCount(): Promise<number> {
  return getRxDb().sync_queue.where("status").anyOf(["pending", "failed"]).count();
}

export async function getLastSync(): Promise<string | undefined> {
  return getMeta("last_full_sync");
}

function localPrescriptionToDto(
  rx: LocalPrescription,
  patientMap: Map<number, LocalPatient>
): PrescriptionDto {
  const patient = rx.patientServerId
    ? patientMap.get(rx.patientServerId)
    : undefined;

  return {
    id: rx.serverId ?? 0,
    patientId: rx.patientServerId ?? 0,
    doctorId: rx.doctorId,
    prescriptionDate: rx.prescriptionDate,
    diagnosis: rx.diagnosis ?? null,
    xrayImage: rx.xrayImage ?? null,
    analysisImage: rx.analysisImage ?? null,
    prescriptionNumber: rx.prescriptionNumber ?? 0,
    patientName: patient?.name,
    items: rx.items.map((item, index) => ({
      id: item.serverId ?? index,
      name: item.name,
      type: item.type ?? null,
      dosage: item.dosage ?? null,
      quantity: item.quantity ?? null,
      period: item.period ?? null,
      timeOfUse: item.timeOfUse ?? null,
    })),
    fieldValues: rx.fieldValues ?? [],
  };
}

export async function getLocalPrescriptions(q?: string): Promise<PrescriptionDto[]> {
  const db = getRxDb();
  const patients = dedupeLocalPatients(await db.patients.toArray());
  const patientMap = new Map(
    patients.map((p) => [p.serverId ?? 0, p] as const)
  );

  let rows = await db.prescriptions.orderBy("updatedAt").reverse().toArray();

  if (q?.trim()) {
    const term = q.trim().toLowerCase();
    rows = rows.filter((rx) => {
      const patient = rx.patientServerId
        ? patientMap.get(rx.patientServerId)
        : undefined;
      const patientName = patient?.name ?? "";
      const diagnosis = rx.diagnosis ?? "";
      const rxNumber = rx.prescriptionNumber?.toString() ?? "";
      return (
        patientName.toLowerCase().includes(term) ||
        diagnosis.toLowerCase().includes(term) ||
        rxNumber.includes(term)
      );
    });
  }

  return rows.map((rx) => localPrescriptionToDto(rx, patientMap));
}

/** Keep IndexedDB in sync after a server save and remove duplicate rows. */
export async function syncLocalPrescriptionFromDto(
  prescription: PrescriptionDto
): Promise<void> {
  if (!prescription.id) return;

  const db = getRxDb();
  const matches = await db.prescriptions
    .filter((rx) => rx.serverId === prescription.id)
    .toArray();
  const primaryId =
    matches.find((m) => m.id === `srv-${prescription.id}`)?.id ??
    matches[0]?.id ??
    `srv-${prescription.id}`;

  await db.prescriptions.put({
    id: primaryId,
    serverId: prescription.id,
    patientId: `srv-${prescription.patientId}`,
    patientServerId: prescription.patientId,
    doctorId: prescription.doctorId ?? 0,
    prescriptionDate: prescription.prescriptionDate ?? new Date().toISOString(),
    diagnosis: prescription.diagnosis ?? undefined,
    xrayImage: prescription.xrayImage ?? undefined,
    analysisImage: prescription.analysisImage ?? undefined,
    prescriptionNumber: prescription.prescriptionNumber,
    items: prescription.items.map((item) => ({
      id: `srv-item-${item.id}`,
      serverId: item.id,
      name: item.name,
      type: item.type ?? undefined,
      dosage: item.dosage ?? undefined,
      quantity: item.quantity ?? undefined,
      period: item.period ?? undefined,
      timeOfUse: item.timeOfUse ?? undefined,
    })),
    fieldValues: prescription.fieldValues ?? [],
    synced: true,
    updatedAt: prescription.updatedAt ?? new Date().toISOString(),
  });

  for (const match of matches) {
    if (match.id !== primaryId) {
      await db.prescriptions.delete(match.id);
    }
  }
}

/** Keep IndexedDB in sync after a server appointment save. */
export async function syncLocalAppointmentFromDto(
  appointment: AppointmentDto
): Promise<void> {
  if (!appointment.id) return;

  const db = getRxDb();
  const matches = await db.appointments
    .filter((a) => a.serverId === appointment.id)
    .toArray();
  const primaryId =
    matches.find((m) => m.id === `srv-${appointment.id}`)?.id ??
    matches[0]?.id ??
    `srv-${appointment.id}`;

  await db.appointments.put({
    id: primaryId,
    serverId: appointment.id,
    doctorId: appointment.doctorId,
    patientId: `srv-${appointment.patientId}`,
    patientServerId: appointment.patientId,
    appointmentDatetime: appointment.appointmentDatetime,
    bookingDate: appointment.bookingDate ?? appointment.appointmentDatetime,
    notes: appointment.notes ?? undefined,
    status: appointment.status,
    visitStatus: appointment.visitStatus ?? "scheduled",
    checkedInAt: appointment.checkedInAt ?? null,
    synced: true,
    updatedAt: appointment.updatedAt ?? new Date().toISOString(),
  });

  for (const match of matches) {
    if (match.id !== primaryId) {
      await db.appointments.delete(match.id);
    }
  }
}

export async function getLocalPatientFields(): Promise<PatientFieldDto[]> {
  const db = getRxDb();
  const rows = await db.patient_fields.toArray();

  return rows
    .filter((field) => field.isActive)
    .map(
      (field): PatientFieldDto => ({
        id: field.serverId ?? 0,
        name: field.name,
        size: field.size,
        isActive: field.isActive,
        isPrintable: field.isPrintable,
        isPersonal: field.isPersonal,
        designX: null,
        designY: null,
      })
    )
    .filter((field) => field.id > 0);
}
