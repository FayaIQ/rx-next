"use client";

import { v4 as uuidv4 } from "uuid";
import { rxApi, type PatientDto, type MedicineDto, type MedicinePresetDto, type AppointmentDto } from "@/lib/api/rx-client";
import {
  getLocalPatients,
  getLocalMedicines,
  getLocalMedicinePresets,
  cacheMedicinePresetsLocally,
  upsertLocalMedicinePresets,
  getLocalAppointments,
  enqueueSyncItem,
  localPatientToDto,
} from "@/lib/sync/offline-store";
import { processSyncQueue } from "@/lib/sync/sync-engine";
import { getRxDb } from "@/lib/db/rx-db";
import { serializeBirthdateInput } from "@/lib/patient-utils";

export async function fetchPatientsOfflineFirst(q?: string): Promise<PatientDto[]> {
  try {
    const local = await getLocalPatients(q);
    if (local.length > 0 || !navigator.onLine) return local;
  } catch {
    // IndexedDB unavailable
  }

  const res = await rxApi.patients.list(q);
  return res.patients;
}

export async function fetchMedicinesOfflineFirst(q?: string): Promise<MedicineDto[]> {
  try {
    const local = await getLocalMedicines(q);
    if (local.length > 0 || !navigator.onLine) return local;
  } catch {
    // IndexedDB unavailable
  }

  const res = await rxApi.medicines.list(q);
  return res.medicines;
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

export async function createPatientOffline(body: Record<string, unknown>) {
  const birthdate =
    serializeBirthdateInput(body.birthdate as string | null | undefined) ??
    undefined;
  const normalizedBody = { ...body, birthdate: birthdate ?? null };

  if (navigator.onLine) {
    const res = await rxApi.patients.create(normalizedBody);
    void getRxDb().patients.put({
      id: `srv-${res.patient.id}`,
      serverId: res.patient.id,
      name: res.patient.name,
      gender: res.patient.gender,
      birthdate: res.patient.birthdate ?? undefined,
      diagnosis: res.patient.diagnosis ?? undefined,
      phone: res.patient.phone ?? undefined,
      doctorId: res.patient.doctorId,
      synced: true,
      updatedAt: res.patient.updatedAt,
    });
    return res.patient;
  }

  const localId = uuidv4();
  const now = new Date().toISOString();
  const db = getRxDb();

  const localPatient = {
    id: localId,
    name: String(body.name),
    gender: body.gender as "male" | "female",
    birthdate,
    diagnosis: (body.diagnosis as string) ?? undefined,
    phone: (body.phone as string) ?? undefined,
    doctorId: 0,
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
  return localPatientToDto(localPatient);
}

export async function updatePatientOffline(
  id: number,
  body: Record<string, unknown>
) {
  const birthdate =
    serializeBirthdateInput(body.birthdate as string | null | undefined) ??
    undefined;
  const normalizedBody = { ...body, birthdate: birthdate ?? null };

  if (navigator.onLine) {
    const res = await rxApi.patients.update(id, normalizedBody);
    const db = getRxDb();
    const existing = await db.patients.filter((p) => p.serverId === id).first();
    void db.patients.put({
      id: existing?.id ?? `srv-${id}`,
      serverId: id,
      name: res.patient.name,
      gender: res.patient.gender,
      birthdate: res.patient.birthdate ?? undefined,
      diagnosis: res.patient.diagnosis ?? undefined,
      phone: res.patient.phone ?? undefined,
      doctorId: res.patient.doctorId,
      synced: true,
      updatedAt: res.patient.updatedAt,
    });
    return res.patient;
  }

  const db = getRxDb();
  const existing = await db.patients
    .filter((p) => p.serverId === id)
    .first();
  const localId = existing?.id ?? `srv-${id}`;
  const now = new Date().toISOString();

  if (existing) {
    await db.patients.update(localId, {
      name: String(body.name),
      gender: body.gender as "male" | "female",
      birthdate,
      diagnosis: (body.diagnosis as string) ?? undefined,
      phone: (body.phone as string) ?? undefined,
      synced: false,
      updatedAt: now,
    });
  }

  await enqueueSyncItem({
    entity: "patient",
    action: "update",
    payload: normalizedBody,
    localId,
    serverId: id,
  });

  void processSyncQueue();

  return existing
    ? localPatientToDto({
        ...existing,
        name: String(body.name),
        gender: body.gender as "male" | "female",
        birthdate,
        diagnosis: (body.diagnosis as string) ?? undefined,
        phone: (body.phone as string) ?? undefined,
        updatedAt: now,
      })
    : ({ id, ...(body as object) } as PatientDto);
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
    await getRxDb().prescriptions.put({
      id: localId,
      patientId: `srv-${body.patientId}`,
      patientServerId: Number(body.patientId),
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
      payload: body,
      localId,
    });
    void processSyncQueue();
    void upsertLocalMedicinePresets(items);
    return { prescription: { id: 0, localId, prescriptionNumber: 0, ...(body as object) } };
  }

  const result = await rxApi.prescriptions.create(body);
  void upsertLocalMedicinePresets(items);
  return result;
}

export async function fetchAppointmentsOfflineFirst(
  date?: string
): Promise<AppointmentDto[]> {
  try {
    const local = await getLocalAppointments(date);
    if (local.length > 0 || !navigator.onLine) return local;
  } catch {
    // IndexedDB unavailable
  }

  const res = await rxApi.appointments.list(date ? { date } : undefined);
  return res.appointments;
}

export async function createAppointmentOffline(body: Record<string, unknown>) {
  const localId = uuidv4();
  const now = new Date().toISOString();
  const db = getRxDb();

  const localAppointment = {
    id: localId,
    doctorId: 0,
    patientId: `srv-${body.patientId}`,
    patientServerId: Number(body.patientId),
    appointmentDatetime: String(body.appointmentDatetime),
    bookingDate: String(body.bookingDate ?? body.appointmentDatetime),
    notes: (body.notes as string) ?? undefined,
    status: (body.status as boolean) ?? true,
    synced: false,
    updatedAt: now,
  };

  await db.appointments.put(localAppointment);
  await enqueueSyncItem({
    entity: "appointment",
    action: "create",
    payload: body,
    localId,
  });

  if (navigator.onLine) {
    void processSyncQueue();
    const res = await rxApi.appointments.create(body);
    await db.appointments.put({
      ...localAppointment,
      id: `srv-${res.appointment.id}`,
      serverId: res.appointment.id,
      doctorId: res.appointment.doctorId,
      synced: true,
      updatedAt: res.appointment.updatedAt ?? now,
    });
    await db.appointments.delete(localId);
    return res.appointment;
  }

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

export async function updateAppointmentOffline(
  id: number,
  body: Record<string, unknown>
) {
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

  if (navigator.onLine) {
    void processSyncQueue();
    const res = await rxApi.appointments.update(id, body);
    return res.appointment;
  }

  return { id, ...(body as object) } as AppointmentDto;
}

export async function deleteAppointmentOffline(id: number) {
  const db = getRxDb();
  const existing = await db.appointments.filter((a) => a.serverId === id).first();
  const localId = existing?.id ?? `srv-${id}`;

  if (existing) await db.appointments.delete(localId);

  await enqueueSyncItem({
    entity: "appointment",
    action: "delete",
    payload: { id },
    localId,
    serverId: id,
  });

  if (navigator.onLine) {
    void processSyncQueue();
    await rxApi.appointments.delete(id);
  }
}
