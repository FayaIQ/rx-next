import { getRxDb, getMeta } from "@/lib/db/rx-db";
import { PUBLIC_DEMO_DATASET_VERSION } from "@/lib/demo/constants";

function versionKey(doctorId: number) {
  return `public_demo_dataset_version_${doctorId}`;
}

export async function preparePublicDemoCache(doctorId: number) {
  const key = versionKey(doctorId);
  if ((await getMeta(key)) === PUBLIC_DEMO_DATASET_VERSION) return;

  const db = getRxDb();
  const [patients, medicines, prescriptions, appointments, fields, presets] =
    await Promise.all([
      db.patients.where("doctorId").equals(doctorId).toArray(),
      db.medicines.where("doctorId").equals(doctorId).toArray(),
      db.prescriptions.where("doctorId").equals(doctorId).toArray(),
      db.appointments.where("doctorId").equals(doctorId).toArray(),
      db.patient_fields.where("doctorId").equals(doctorId).toArray(),
      db.medicine_presets.where("doctorId").equals(doctorId).toArray(),
    ]);

  const patientServerIds = new Set(
    patients
      .map((patient) => patient.serverId)
      .filter((id): id is number => typeof id === "number")
  );
  const localIds = new Set([
    ...patients.map((row) => row.id),
    ...medicines.map((row) => row.id),
    ...prescriptions.map((row) => row.id),
    ...appointments.map((row) => row.id),
    ...fields.map((row) => row.id),
    ...presets.map((row) => row.id),
  ]);

  await db.transaction(
    "rw",
    [
      db.patients,
      db.medicines,
      db.prescriptions,
      db.appointments,
      db.patient_fields,
      db.medicine_presets,
      db.recipe_settings,
      db.dental_charts,
      db.treatment_cache,
      db.sync_queue,
      db.meta,
    ],
    async () => {
      await db.patients.bulkDelete(patients.map((row) => row.id));
      await db.medicines.bulkDelete(medicines.map((row) => row.id));
      await db.prescriptions.bulkDelete(prescriptions.map((row) => row.id));
      await db.appointments.bulkDelete(appointments.map((row) => row.id));
      await db.patient_fields.bulkDelete(fields.map((row) => row.id));
      await db.medicine_presets.bulkDelete(presets.map((row) => row.id));
      await db.recipe_settings.delete(doctorId);

      const dentalRows = await db.dental_charts.toArray();
      await db.dental_charts.bulkDelete(
        dentalRows
          .filter(
            (row) =>
              patientServerIds.has(row.patientServerId) ||
              Number(row.chart.doctorId) === doctorId
          )
          .map((row) => row.patientServerId)
      );

      const treatmentRows = await db.treatment_cache.toArray();
      await db.treatment_cache.bulkDelete(
        treatmentRows
          .filter(
            (row) =>
              patientServerIds.has(row.patientServerId) ||
              row.plans.some((plan) => Number(plan.doctorId) === doctorId)
          )
          .map((row) => row.patientServerId)
      );

      const queueRows = await db.sync_queue.toArray();
      await db.sync_queue.bulkDelete(
        queueRows
          .filter(
            (row) =>
              localIds.has(row.localId) ||
              Number(row.payload.doctorId) === doctorId
          )
          .map((row) => row.id)
      );

      await db.meta.put({ key, value: PUBLIC_DEMO_DATASET_VERSION });
    }
  );
}
