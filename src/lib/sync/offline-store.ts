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
import type { PatientDto, MedicineDto, MedicinePresetDto } from "@/lib/api/rx-client";
import { formatAge } from "@/lib/patient-utils";

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
      db.meta,
    ],
    async () => {
      await db.patients.clear();
      await db.medicines.clear();
      await db.prescriptions.clear();
      await db.appointments.clear();
      await db.patient_fields.clear();
      await db.medicine_presets.clear();

      await db.patients.bulkPut(
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
            synced: true,
            updatedAt: p.updatedAt,
          })
        )
      );

      await db.medicines.bulkPut(
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
            updatedAt: m.updatedAt,
          })
        )
      );

      await db.prescriptions.bulkPut(
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
        })
      );

      await db.appointments.bulkPut(
        data.appointments.map((a) => {
          const ap = a as {
            id: number;
            doctorId: number;
            patientId: number;
            appointmentDatetime: string;
            bookingDate: string | null;
            notes?: string;
            status: boolean;
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
            synced: true,
            updatedAt: ap.updatedAt,
          } satisfies LocalAppointment;
        })
      );

      await db.patient_fields.bulkPut(
        data.fields.map((f) => {
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
        })
      );

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

      await setMeta("last_full_sync", data.syncedAt);
    }
  );
}

export async function getLocalPatients(q?: string): Promise<PatientDto[]> {
  const db = getRxDb();
  let rows = await db.patients.orderBy("updatedAt").reverse().toArray();
  if (q?.trim()) {
    const term = q.trim().toLowerCase();
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.phone ?? "").includes(term)
    );
  }
  return rows.map(localPatientToDto);
}

export function localPatientToDto(p: LocalPatient): PatientDto {
  return {
    id: p.serverId ?? 0,
    name: p.name,
    gender: p.gender,
    birthdate: p.birthdate ?? null,
    diagnosis: p.diagnosis ?? null,
    phone: p.phone ?? null,
    doctorId: p.doctorId,
    age: formatAge(p.birthdate),
    visitCount: 0,
    lastVisit: null,
    createdAt: p.updatedAt,
    updatedAt: p.updatedAt,
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
  return record;
}

export async function getLocalAppointments(date?: string): Promise<import("@/lib/api/rx-client").AppointmentDto[]> {
  const db = getRxDb();
  let rows = await db.appointments.orderBy("appointmentDatetime").toArray();

  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    rows = rows.filter((a) => {
      const dt = new Date(a.appointmentDatetime);
      return dt >= dayStart && dt <= dayEnd;
    });
  }

  const patients = await db.patients.toArray();
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
