export type SyncEntity =
  | "patient"
  | "prescription"
  | "medicine"
  | "appointment"
  | "field";

export type SyncAction = "create" | "update" | "delete";

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface SyncQueueItem {
  id: string;
  entity: SyncEntity;
  action: SyncAction;
  payload: Record<string, unknown>;
  localId: string;
  serverId?: number;
  status: SyncStatus;
  createdAt: Date;
  retryCount: number;
  error?: string;
}

export interface MetaRecord {
  key: string;
  value: string;
}

export interface LocalPatient {
  id: string;
  serverId?: number;
  name: string;
  gender: "male" | "female";
  birthdate?: string;
  diagnosis?: string;
  phone?: string;
  doctorId: number;
  synced: boolean;
  updatedAt: string;
}

export interface LocalMedicine {
  id: string;
  serverId?: number;
  doctorId: number;
  name: string;
  type?: string;
  dosage?: string;
  quantity?: string;
  period?: string;
  timeOfUse?: string;
  synced: boolean;
  updatedAt: string;
}

export interface LocalPrescriptionItem {
  id: string;
  serverId?: number;
  name: string;
  type?: string;
  dosage?: string;
  quantity?: string;
  period?: string;
  timeOfUse?: string;
}

export interface LocalPrescription {
  id: string;
  serverId?: number;
  patientId: string;
  patientServerId?: number;
  doctorId: number;
  prescriptionDate: string;
  diagnosis?: string;
  xrayImage?: string;
  analysisImage?: string;
  additionalInfo?: Record<string, unknown>;
  prescriptionNumber?: number;
  items: LocalPrescriptionItem[];
  fieldValues: { patientFieldId: number; value: string }[];
  synced: boolean;
  updatedAt: string;
}

export interface LocalAppointment {
  id: string;
  serverId?: number;
  doctorId: number;
  patientId: string;
  patientServerId?: number;
  appointmentDatetime: string;
  bookingDate: string;
  notes?: string;
  status: boolean;
  synced: boolean;
  updatedAt: string;
}

export interface LocalPatientField {
  id: string;
  serverId?: number;
  doctorId: number;
  name: string;
  size: "larg" | "medium" | "small";
  isActive: boolean;
  isPrintable: boolean;
  isPersonal: boolean;
  synced: boolean;
  updatedAt: string;
}

export interface LocalRecipeSettings {
  doctorId: number;
  data: Record<string, unknown>;
  updatedAt: string;
}

export interface LocalDefaultMedicine {
  id: number;
  categoryId: number;
  name: string;
  type?: string;
  dosage?: string;
}

export interface LocalMedicinePreset {
  id: string;
  serverId?: number;
  doctorId: number;
  medicineKey: string;
  name: string;
  type: string;
  dosage: string;
  quantity: string;
  period: string;
  timeOfUse: string;
  usageCount: number;
  lastUsedAt: string;
  updatedAt: string;
}

import Dexie, { type Table } from "dexie";

export class RxDatabase extends Dexie {
  patients!: Table<LocalPatient, string>;
  medicines!: Table<LocalMedicine, string>;
  prescriptions!: Table<LocalPrescription, string>;
  appointments!: Table<LocalAppointment, string>;
  patient_fields!: Table<LocalPatientField, string>;
  recipe_settings!: Table<LocalRecipeSettings, number>;
  default_medicines!: Table<LocalDefaultMedicine, number>;
  medicine_presets!: Table<LocalMedicinePreset, string>;
  sync_queue!: Table<SyncQueueItem, string>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super("rx_db");
    this.version(1).stores({
      patients: "id, serverId, doctorId, name, synced, updatedAt",
      medicines: "id, serverId, doctorId, name, synced, updatedAt",
      prescriptions:
        "id, serverId, doctorId, patientId, prescriptionNumber, synced, updatedAt",
      appointments: "id, serverId, doctorId, patientId, synced, updatedAt",
      patient_fields: "id, serverId, doctorId, synced, updatedAt",
      recipe_settings: "doctorId, updatedAt",
      default_medicines: "id, categoryId, name",
      sync_queue: "id, entity, status, createdAt, localId",
      meta: "key",
    });
    this.version(2).stores({
      medicine_presets:
        "id, serverId, doctorId, medicineKey, type, lastUsedAt, updatedAt",
    });
  }
}

let dbInstance: RxDatabase | null = null;

export function getRxDb(): RxDatabase {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbInstance) {
    dbInstance = new RxDatabase();
  }
  return dbInstance;
}

export async function getMeta(key: string): Promise<string | undefined> {
  const record = await getRxDb().meta.get(key);
  return record?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await getRxDb().meta.put({ key, value });
}
