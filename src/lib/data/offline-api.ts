"use client";

import { v4 as uuidv4 } from "uuid";
import { rxApi, type PatientDto, type MedicineDto, type MedicinePresetDto, type AppointmentDto, type PrescriptionDto, type PatientFieldDto } from "@/lib/api/rx-client";
import {
  getLocalPatients,
  getLocalMedicines,
  getLocalMedicinePresets,
  getLocalPrescriptions,
  getLocalPatientFields,
  cacheMedicinePresetsLocally,
  upsertLocalMedicinePresets,
  upsertLocalMedicinesFromPrescription,
  getLocalAppointments,
  enqueueSyncItem,
  localPatientToDto,
  syncLocalPatientFromDto,
  syncLocalPrescriptionFromDto,
  syncLocalAppointmentFromDto,
} from "@/lib/sync/offline-store";
import { processSyncQueue } from "@/lib/sync/sync-engine";
import { getRxDb } from "@/lib/db/rx-db";
import { serializeBirthdateInput, normalizePatientPhoneForSave } from "@/lib/patient-utils";
import {
  DEFAULT_PAGE_SIZE,
  paginateSlice,
  type PaginationMeta,
} from "@/lib/pagination";

export type PatientSaveResult = {
  patient: PatientDto;
  phoneDuplicate?: boolean;
  duplicatePatientName?: string | null;
};

function normalizePatientBody(body: Record<string, unknown>) {
  const birthdate =
    serializeBirthdateInput(body.birthdate as string | null | undefined) ??
    undefined;
  return {
    ...body,
    birthdate: birthdate ?? null,
    phone: normalizePatientPhoneForSave(body.phone as string | null | undefined),
  };
}

export async function fetchPatientsOfflineFirst(q?: string): Promise<PatientDto[]> {
  if (navigator.onLine) {
    try {
      const res = await rxApi.patients.list({ q, pageSize: 500 });
      for (const patient of res.patients) {
        await syncLocalPatientFromDto(patient);
      }
    } catch {
      // fall through to local cache
    }
  }

  try {
    return await getLocalPatients(q);
  } catch {
    if (navigator.onLine) {
      const res = await rxApi.patients.list({ q });
      return res.patients;
    }
    return [];
  }
}

export async function fetchPatientsPaginated(
  q?: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<{ patients: PatientDto[]; pagination: PaginationMeta }> {
  if (navigator.onLine) {
    try {
      const res = await rxApi.patients.list({ q, page, pageSize });
      for (const patient of res.patients) {
        await syncLocalPatientFromDto(patient);
      }
      return res;
    } catch {
      // fall through
    }
  }

  try {
    const local = await getLocalPatients(q);
    const { items, pagination } = paginateSlice(local, page, pageSize);
    return { patients: items, pagination };
  } catch {
    return rxApi.patients.list({ q, page, pageSize });
  }
}

export async function fetchMedicinesOfflineFirst(q?: string): Promise<MedicineDto[]> {
  if (navigator.onLine) {
    try {
      const res = await rxApi.medicines.list({ q, pageSize: 500 });
      const db = getRxDb();
      for (const medicine of res.medicines) {
        await db.medicines.put({
          id: `srv-${medicine.id}`,
          serverId: medicine.id,
          doctorId: medicine.doctorId,
          name: medicine.name,
          type: medicine.type ?? undefined,
          dosage: medicine.dosage ?? undefined,
          quantity: medicine.quantity ?? undefined,
          period: medicine.period ?? undefined,
          timeOfUse: medicine.timeOfUse ?? undefined,
          synced: true,
          updatedAt: medicine.updatedAt,
        });
      }
    } catch {
      // fall through
    }
  }

  try {
    return await getLocalMedicines(q);
  } catch {
    if (navigator.onLine) {
      const res = await rxApi.medicines.list({ q });
      return res.medicines;
    }
    return [];
  }
}

export async function fetchMedicinesPaginated(
  q?: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<{ medicines: MedicineDto[]; pagination: PaginationMeta }> {
  try {
    const local = await getLocalMedicines(q);
    if (local.length > 0 || !navigator.onLine) {
      const { items, pagination } = paginateSlice(local, page, pageSize);
      return { medicines: items, pagination };
    }
  } catch {
    // IndexedDB unavailable
  }

  return rxApi.medicines.list({ q, page, pageSize });
}

export async function fetchFieldsOfflineFirst(): Promise<PatientFieldDto[]> {
  if (navigator.onLine) {
    try {
      const res = await rxApi.fields.list();
      const db = getRxDb();
      for (const field of res.fields) {
        await db.patient_fields.put({
          id: `srv-${field.id}`,
          serverId: field.id,
          doctorId: 0,
          name: field.name,
          size: field.size,
          isActive: field.isActive,
          isPrintable: field.isPrintable,
          isPersonal: field.isPersonal,
          synced: true,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      // fall through
    }
  }

  try {
    return await getLocalPatientFields();
  } catch {
    if (navigator.onLine) {
      const res = await rxApi.fields.list();
      return res.fields;
    }
    return [];
  }
}

export async function fetchPrescriptionsPaginated(
  q?: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<{ prescriptions: PrescriptionDto[]; pagination: PaginationMeta }> {
  if (navigator.onLine) {
    try {
      const res = await rxApi.prescriptions.list({ q, page, pageSize });
      for (const prescription of res.prescriptions) {
        await syncLocalPrescriptionFromDto(prescription);
      }
      return { prescriptions: res.prescriptions, pagination: res.pagination };
    } catch {
      // fall through
    }
  }

  try {
    const local = await getLocalPrescriptions(q);
    const { items, pagination } = paginateSlice(local, page, pageSize);
    return { prescriptions: items, pagination };
  } catch {
    const res = await rxApi.prescriptions.list({ q, page, pageSize });
    return { prescriptions: res.prescriptions, pagination: res.pagination };
  }
}

export async function fetchMedicinePresetsOfflineFirst(): Promise<MedicinePresetDto[]> {
  if (navigator.onLine) {
    try {
      const res = await rxApi.medicines.presets();
      await cacheMedicinePresetsLocally(res.presets);
      return res.presets;
    } catch {
      // fall through to local cache
    }
  }

  try {
    return await getLocalMedicinePresets();
  } catch {
    return [];
  }
}

export async function createPatientOffline(
  body: Record<string, unknown>
): Promise<PatientSaveResult> {
  const normalizedBody = normalizePatientBody(body);

  if (navigator.onLine) {
    const res = await rxApi.patients.create(normalizedBody);
    await syncLocalPatientFromDto(res.patient);
    return {
      patient: res.patient,
      phoneDuplicate: res.phoneDuplicate,
      duplicatePatientName: res.duplicatePatientName,
    };
  }

  const localId = uuidv4();
  const now = new Date().toISOString();
  const db = getRxDb();
  const birthdate = normalizedBody.birthdate as string | undefined;

  const localPatient = {
    id: localId,
    name: String(body.name),
    gender: body.gender as "male" | "female",
    birthdate,
    diagnosis: (body.diagnosis as string) ?? undefined,
    phone: (normalizedBody.phone as string) ?? undefined,
    doctorId: 0,
    fieldValues:
      (body.fieldValues as Array<{ patientFieldId: number; value: string }>) ??
      [],
    synced: false,
    updatedAt: now,
  };

  await db.patients.put(localPatient);
  await enqueueSyncItem({
    entity: "patient",
    action: "create",
    payload: normalizedBody,
    localId,
  });
  void processSyncQueue();
  return { patient: localPatientToDto(localPatient) };
}

export async function updatePatientOffline(
  id: number,
  body: Record<string, unknown>
): Promise<PatientSaveResult> {
  const normalizedBody = normalizePatientBody(body);

  if (navigator.onLine) {
    const res = await rxApi.patients.update(id, normalizedBody);
    await syncLocalPatientFromDto(res.patient);
    return {
      patient: res.patient,
      phoneDuplicate: res.phoneDuplicate,
      duplicatePatientName: res.duplicatePatientName,
    };
  }

  const db = getRxDb();
  const existing = await db.patients
    .filter((p) => p.serverId === id)
    .first();
  const localId = existing?.id ?? `srv-${id}`;
  const now = new Date().toISOString();
  const birthdate = normalizedBody.birthdate as string | undefined;

  const fieldValues =
    (body.fieldValues as Array<{ patientFieldId: number; value: string }>) ??
    existing?.fieldValues ??
    [];

  const localRecord = {
    id: localId,
    serverId: id,
    name: String(body.name),
    gender: body.gender as "male" | "female",
    birthdate,
    diagnosis: (body.diagnosis as string) ?? undefined,
    phone: (normalizedBody.phone as string) ?? undefined,
    doctorId: existing?.doctorId ?? 0,
    fieldValues,
    synced: false,
    updatedAt: now,
  };

  await db.patients.put(localRecord);

  await enqueueSyncItem({
    entity: "patient",
    action: "update",
    payload: normalizedBody,
    localId,
    serverId: id,
  });

  void processSyncQueue();

  return {
    patient: localPatientToDto(localRecord),
  };
}

export async function deletePatientOffline(id: number) {
  const db = getRxDb();
  const existing = await db.patients.filter((p) => p.serverId === id).first();
  const localId = existing?.id ?? `srv-${id}`;

  if (existing) await db.patients.delete(localId);

  await enqueueSyncItem({
    entity: "patient",
    action: "delete",
    payload: { id },
    localId,
    serverId: id,
  });

  if (navigator.onLine) {
    void processSyncQueue();
    await rxApi.patients.delete(id);
  }
}

export async function createPrescriptionOffline(body: Record<string, unknown>) {
  const items =
    (body.items as Array<{
      name: string;
      type?: string | null;
      dosage?: string | null;
      quantity?: string | null;
      period?: string | null;
      timeOfUse?: string | null;
    }>) ?? [];

  if (!navigator.onLine) {
    const localId = uuidv4();
    const now = new Date().toISOString();
    const patientServerId = Number(body.patientId);
    const patientLocalId =
      patientServerId > 0 ? undefined : String(body.patientLocalId ?? "");

    await getRxDb().prescriptions.put({
      id: localId,
      patientId: patientServerId > 0 ? `srv-${patientServerId}` : patientLocalId!,
      patientServerId: patientServerId > 0 ? patientServerId : undefined,
      doctorId: 0,
      prescriptionDate: String(body.prescriptionDate),
      diagnosis: (body.diagnosis as string) ?? undefined,
      items: ((body.items as Array<Record<string, unknown>>) ?? []).map((item) => ({
        id: uuidv4(),
        name: String(item.name),
        type: item.type as string | undefined,
        dosage: item.dosage as string | undefined,
        quantity: item.quantity as string | undefined,
        period: item.period as string | undefined,
        timeOfUse: item.timeOfUse as string | undefined,
      })),
      fieldValues: (body.fieldValues as Array<{ patientFieldId: number; value: string }>) ?? [],
      synced: false,
      updatedAt: now,
    });
    await enqueueSyncItem({
      entity: "prescription",
      action: "create",
      payload: {
        ...body,
        patientLocalId: patientLocalId || undefined,
      },
      localId,
    });
    void processSyncQueue();
    void upsertLocalMedicinePresets(items);
    void upsertLocalMedicinesFromPrescription(items);
    return { prescription: { id: 0, localId, prescriptionNumber: 0, ...(body as object) } };
  }

  const result = await rxApi.prescriptions.create(body);
  if (result.prescription?.id) {
    await syncLocalPrescriptionFromDto(result.prescription);
  }
  void upsertLocalMedicinePresets(items);
  void upsertLocalMedicinesFromPrescription(items);
  return result;
}

export async function updatePrescriptionOffline(
  id: number,
  body: Record<string, unknown>
) {
  const items =
    (body.items as Array<{
      name: string;
      type?: string | null;
      dosage?: string | null;
      quantity?: string | null;
      period?: string | null;
      timeOfUse?: string | null;
    }>) ?? [];

  if (!navigator.onLine) {
    const db = getRxDb();
    const existing = await db.prescriptions
      .filter((rx) => rx.serverId === id)
      .first();
    const localId = existing?.id ?? `srv-${id}`;
    const now = new Date().toISOString();
    const patientServerId = Number(body.patientId);

    await db.prescriptions.put({
      id: localId,
      serverId: id,
      patientId: existing?.patientId ?? `srv-${patientServerId}`,
      patientServerId: patientServerId || existing?.patientServerId,
      doctorId: existing?.doctorId ?? 0,
      prescriptionDate: String(body.prescriptionDate),
      diagnosis: (body.diagnosis as string) ?? undefined,
      prescriptionNumber: existing?.prescriptionNumber,
      items: ((body.items as Array<Record<string, unknown>>) ?? []).map((item) => ({
        id: uuidv4(),
        name: String(item.name),
        type: item.type as string | undefined,
        dosage: item.dosage as string | undefined,
        quantity: item.quantity as string | undefined,
        period: item.period as string | undefined,
        timeOfUse: item.timeOfUse as string | undefined,
      })),
      fieldValues:
        (body.fieldValues as Array<{ patientFieldId: number; value: string }>) ??
        existing?.fieldValues ??
        [],
      synced: false,
      updatedAt: now,
    });

    await enqueueSyncItem({
      entity: "prescription",
      action: "update",
      payload: body,
      localId,
      serverId: id,
    });
    void processSyncQueue();
    void upsertLocalMedicinePresets(items);
    void upsertLocalMedicinesFromPrescription(items);
    return { prescription: { id, ...(body as object) } };
  }

  const result = await rxApi.prescriptions.update(id, body);
  if (result.prescription?.id) {
    await syncLocalPrescriptionFromDto(result.prescription);
  }
  void upsertLocalMedicinePresets(items);
  void upsertLocalMedicinesFromPrescription(items);
  return result;
}

export async function fetchAppointmentsOfflineFirst(
  params?: {
    date?: string;
    bookingFrom?: string;
    bookingTo?: string;
    status?: string;
  }
): Promise<AppointmentDto[]> {
  if (navigator.onLine) {
    try {
      const res = await rxApi.appointments.list(
        params?.date
          ? { date: params.date, status: params.status }
          : params?.bookingFrom || params?.bookingTo
            ? {
                bookingFrom: params.bookingFrom,
                bookingTo: params.bookingTo,
                status: params.status,
              }
            : params?.status
              ? { status: params.status }
              : undefined
      );
      for (const appointment of res.appointments) {
        await syncLocalAppointmentFromDto(appointment);
      }
    } catch {
      // fall through to local
    }
  }

  let local: AppointmentDto[] = [];
  try {
    local = await getLocalAppointments(params?.date);
    if (params?.bookingFrom || params?.bookingTo) {
      local = local.filter((a) => {
        const key = (a.bookingDate ?? a.appointmentDatetime).slice(0, 10);
        if (params.bookingFrom && key < params.bookingFrom) return false;
        if (params.bookingTo && key > params.bookingTo) return false;
        return true;
      });
    }
    if (params?.status === "active") {
      local = local.filter((a) => a.status);
    }
  } catch {
    return [];
  }

  return local;
}

async function cacheAppointmentLocally(
  appointment: AppointmentDto,
  patientId: number
) {
  await syncLocalAppointmentFromDto({
    ...appointment,
    patientId: appointment.patientId || patientId,
  });
}

export async function createAppointmentOffline(body: Record<string, unknown>) {
  if (!navigator.onLine) {
    const localId = uuidv4();
    const now = new Date().toISOString();
    const db = getRxDb();

    await db.appointments.put({
      id: localId,
      doctorId: 0,
      patientId: `srv-${body.patientId}`,
      patientServerId: Number(body.patientId),
      appointmentDatetime: String(body.appointmentDatetime),
      bookingDate: String(body.bookingDate ?? body.appointmentDatetime),
      notes: (body.notes as string) ?? undefined,
      status: (body.status as boolean) ?? true,
      visitStatus: "scheduled",
      checkedInAt: null,
      synced: false,
      updatedAt: now,
    });

    await enqueueSyncItem({
      entity: "appointment",
      action: "create",
      payload: {
        ...body,
        patientLocalId:
          Number(body.patientId) > 0 ? undefined : String(body.patientLocalId),
      },
      localId,
    });
    void processSyncQueue();

    const patients = await getLocalPatients();
    const patient = patients.find((p) => p.id === Number(body.patientId));

    return {
      id: 0,
      doctorId: 0,
      patientId: Number(body.patientId),
      appointmentDatetime: String(body.appointmentDatetime),
      bookingDate: (body.bookingDate as string) ?? null,
      notes: (body.notes as string) ?? null,
      status: (body.status as boolean) ?? true,
      visitStatus: "scheduled",
      checkedInAt: null,
      createdAt: now,
      updatedAt: now,
      patient: patient
        ? {
            id: patient.id,
            name: patient.name,
            phone: patient.phone,
            gender: patient.gender,
            age: patient.age,
          }
        : undefined,
    } satisfies AppointmentDto;
  }

  const res = await rxApi.appointments.create(body);
  await cacheAppointmentLocally(res.appointment, Number(body.patientId));
  return res.appointment;
}

export async function updateAppointmentOffline(
  id: number,
  body: Record<string, unknown>
) {
  if (!navigator.onLine) {
    const db = getRxDb();
    const existing = await db.appointments
      .filter((a) => a.serverId === id)
      .first();
    const localId = existing?.id ?? `srv-${id}`;
    const now = new Date().toISOString();

    if (existing) {
      await db.appointments.update(localId, {
        patientServerId: Number(body.patientId),
        patientId: `srv-${body.patientId}`,
        appointmentDatetime: String(body.appointmentDatetime),
        bookingDate: String(body.bookingDate ?? body.appointmentDatetime),
        notes: (body.notes as string) ?? undefined,
        status: (body.status as boolean) ?? true,
        synced: false,
        updatedAt: now,
      });
    }

    await enqueueSyncItem({
      entity: "appointment",
      action: "update",
      payload: body,
      localId,
      serverId: id,
    });
    void processSyncQueue();

    return { id, ...(body as object) } as AppointmentDto;
  }

  const res = await rxApi.appointments.update(id, body);
  await cacheAppointmentLocally(res.appointment, Number(body.patientId));
  return res.appointment;
}

export async function deleteAppointmentOffline(id: number) {
  const db = getRxDb();
  const existing = await db.appointments.filter((a) => a.serverId === id).first();
  const localId = existing?.id ?? `srv-${id}`;

  if (existing) await db.appointments.delete(localId);

  if (navigator.onLine) {
    await rxApi.appointments.delete(id);
    return;
  }

  await enqueueSyncItem({
    entity: "appointment",
    action: "delete",
    payload: { id },
    localId,
    serverId: id,
  });
  void processSyncQueue();
}
