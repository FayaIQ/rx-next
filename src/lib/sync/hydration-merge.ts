import { getRxDb, type LocalAppointment, type LocalMedicine, type LocalPatient, type LocalPatientField, type LocalPrescription } from "@/lib/db/rx-db";
import type { Table } from "dexie";

async function pendingLocalIds(): Promise<Set<string>> {
  const db = getRxDb();
  const pending = await db.sync_queue
    .where("status")
    .anyOf(["pending", "failed", "syncing"])
    .toArray();
  return new Set(pending.map((item) => item.localId));
}

async function mergeSyncedTable<T extends { id: string; serverId?: number; synced: boolean; updatedAt: string }>(
  table: Table<T, string>,
  serverRows: T[]
) {
  const pending = await pendingLocalIds();
  const unsynced = await table.filter(
    (row) => !row.synced || pending.has(row.id)
  ).toArray();

  await table.bulkPut(serverRows);

  for (const row of unsynced) {
    if (pending.has(row.id)) {
      await table.put(row);
      continue;
    }
    if (row.serverId == null) {
      await table.put(row);
      continue;
    }
    const serverRow = serverRows.find((s) => s.serverId === row.serverId);
    if (!serverRow || row.updatedAt > serverRow.updatedAt) {
      await table.put(row);
    }
  }
}

export async function mergePatients(serverRows: LocalPatient[]) {
  await mergeSyncedTable(getRxDb().patients, serverRows);
}

export async function mergeMedicines(serverRows: LocalMedicine[]) {
  await mergeSyncedTable(getRxDb().medicines, serverRows);
}

export async function mergePrescriptions(serverRows: LocalPrescription[]) {
  await mergeSyncedTable(getRxDb().prescriptions, serverRows);
}

export async function mergeAppointments(serverRows: LocalAppointment[]) {
  await mergeSyncedTable(getRxDb().appointments, serverRows);
}

export async function mergePatientFields(serverRows: LocalPatientField[]) {
  await mergeSyncedTable(getRxDb().patient_fields, serverRows);
}
