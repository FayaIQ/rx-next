import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { prisma } from "@/lib/prisma";
import { patientSchema, medicineSchema, prescriptionSchema, appointmentSchema } from "@/lib/validations/rx";
import { parseBirthdateInput } from "@/lib/patient-utils";
import { createPrescription, updatePrescription, emptyMed } from "@/lib/prescription-service";
import { upsertMedicinePresets } from "@/lib/medicine-preset-service";
import { upsertMedicinesFromPrescription } from "@/lib/medicine-catalog-service";
import { serializePatientLight } from "@/lib/patient-serializer";
import { serializePrescription } from "@/lib/prescription-service";
import { serializeAppointment } from "@/lib/appointment-serializer";
import { upsertPatientFieldValues } from "@/lib/patient-field-value-service";
import { normalizePatientPhoneForSave } from "@/lib/patient-utils";
import { z } from "zod";

const bulkItemSchema = z.object({
  id: z.string(),
  entity: z.enum(["patient", "prescription", "medicine", "appointment", "field"]),
  action: z.enum(["create", "update", "delete"]),
  payload: z.record(z.string(), z.unknown()),
  localId: z.string(),
  serverId: z.number().optional(),
});

export async function POST(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  try {
    const body = await request.json();
    const items = z.array(bulkItemSchema).parse(body.items ?? []);
    const results: Array<{
      queueId: string;
      localId: string;
      serverId?: number;
      ok: boolean;
      error?: string;
      data?: unknown;
    }> = [];

    for (const item of items) {
      try {
        const result = await processSyncItem(ctx.doctorId, item);
        results.push({ queueId: item.id, localId: item.localId, ok: true, ...result });
      } catch (e) {
        results.push({
          queueId: item.id,
          localId: item.localId,
          ok: false,
          error: e instanceof Error ? e.message : "فشل المزامنة",
        });
      }
    }

    return apiOk({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError();
  }
}

async function processSyncItem(
  doctorId: number,
  item: z.infer<typeof bulkItemSchema>
): Promise<{ serverId?: number; data?: unknown }> {
  const doctorDbId = toDbId(doctorId);

  if (item.entity === "patient") {
    if (item.action === "create") {
      const data = patientSchema.parse(item.payload);
      const birthdate = parseBirthdateInput(data.birthdate);
      const phone = normalizePatientPhoneForSave(data.phone);

      const patient = await prisma.$transaction(async (tx) => {
        const created = await tx.patient.create({
          data: {
            name: data.name,
            gender: data.gender,
            birthdate,
            diagnosis: data.diagnosis ?? null,
            phone,
            doctorId: doctorDbId,
          },
        });

        await upsertPatientFieldValues(
          created.id,
          doctorId,
          data.fieldValues,
          tx
        );

        const fieldValues = await tx.patientFieldValue.findMany({
          where: { patientId: created.id },
        });

        return { created, fieldValues };
      });

      return {
        serverId: Number(patient.created.id),
        data: serializePatientLight(patient.created, patient.fieldValues),
      };
    }
    if (item.action === "update" && item.serverId) {
      const data = patientSchema.parse(item.payload);
      const patientDbId = toDbId(item.serverId);
      const birthdate = parseBirthdateInput(data.birthdate);
      const phone = normalizePatientPhoneForSave(data.phone);

      const patient = await prisma.$transaction(async (tx) => {
        const updated = await tx.patient.update({
          where: { id: patientDbId },
          data: {
            name: data.name,
            gender: data.gender,
            birthdate,
            diagnosis: data.diagnosis ?? null,
            phone,
          },
        });

        await upsertPatientFieldValues(
          patientDbId,
          doctorId,
          data.fieldValues,
          tx
        );

        const fieldValues = await tx.patientFieldValue.findMany({
          where: { patientId: patientDbId },
        });

        return { updated, fieldValues };
      });

      return {
        serverId: item.serverId,
        data: serializePatientLight(patient.updated, patient.fieldValues),
      };
    }
    if (item.action === "delete" && item.serverId) {
      await prisma.patient.delete({ where: { id: toDbId(item.serverId) } });
      return { serverId: item.serverId };
    }
  }

  if (item.entity === "medicine") {
    if (item.action === "create") {
      const data = medicineSchema.parse(item.payload);
      const medicine = await prisma.medicine.create({
        data: {
          doctorId: doctorDbId,
          name: data.name,
          type: data.type ?? emptyMed.type,
          dosage: data.dosage ?? emptyMed.dosage,
          quantity: data.quantity ?? emptyMed.quantity,
          period: data.period ?? emptyMed.period,
          timeOfUse: data.timeOfUse ?? emptyMed.timeOfUse,
        },
      });
      return { serverId: Number(medicine.id) };
    }
    if (item.action === "update" && item.serverId) {
      const data = medicineSchema.parse(item.payload);
      const medicine = await prisma.medicine.update({
        where: { id: toDbId(item.serverId) },
        data: {
          name: data.name,
          type: data.type ?? emptyMed.type,
          dosage: data.dosage ?? emptyMed.dosage,
          quantity: data.quantity ?? emptyMed.quantity,
          period: data.period ?? emptyMed.period,
          timeOfUse: data.timeOfUse ?? emptyMed.timeOfUse,
        },
      });
      return { serverId: Number(medicine.id) };
    }
    if (item.action === "delete" && item.serverId) {
      await prisma.medicine.delete({ where: { id: toDbId(item.serverId) } });
      return { serverId: item.serverId };
    }
  }

  if (item.entity === "prescription") {
    if (item.action === "create") {
      const data = prescriptionSchema.parse(item.payload);
      const rx = await createPrescription(doctorId, data);
      await Promise.all([
        upsertMedicinePresets(doctorId, data.items),
        upsertMedicinesFromPrescription(doctorId, data.items),
      ]);
      return { serverId: Number(rx.id), data: serializePrescription(rx) };
    }
    if (item.action === "update" && item.serverId) {
      const data = prescriptionSchema.parse(item.payload);
      const rx = await updatePrescription(doctorId, item.serverId, data);
      await Promise.all([
        upsertMedicinePresets(doctorId, data.items),
        upsertMedicinesFromPrescription(doctorId, data.items),
      ]);
      return { serverId: item.serverId, data: rx ? serializePrescription(rx) : undefined };
    }
    if (item.action === "delete" && item.serverId) {
      await prisma.prescription.delete({ where: { id: toDbId(item.serverId) } });
      return { serverId: item.serverId };
    }
  }

  if (item.entity === "appointment") {
    if (item.action === "create") {
      const data = appointmentSchema.parse(item.payload);
      const appointment = await prisma.appointment.create({
        data: {
          doctorId: doctorDbId,
          patientId: toDbId(data.patientId),
          appointmentDatetime: new Date(data.appointmentDatetime),
          bookingDate: data.bookingDate
            ? new Date(data.bookingDate)
            : new Date(new Date(data.appointmentDatetime).toDateString()),
          notes: data.notes ?? null,
          status: data.status ?? true,
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              phone: true,
              gender: true,
              birthdate: true,
            },
          },
        },
      });
      return {
        serverId: Number(appointment.id),
        data: serializeAppointment(appointment),
      };
    }
    if (item.action === "update" && item.serverId) {
      const data = appointmentSchema.parse(item.payload);
      const appointment = await prisma.appointment.update({
        where: { id: toDbId(item.serverId) },
        data: {
          patientId: toDbId(data.patientId),
          appointmentDatetime: new Date(data.appointmentDatetime),
          bookingDate: data.bookingDate
            ? new Date(data.bookingDate)
            : new Date(new Date(data.appointmentDatetime).toDateString()),
          notes: data.notes ?? null,
          status: data.status ?? true,
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              phone: true,
              gender: true,
              birthdate: true,
            },
          },
        },
      });
      return {
        serverId: Number(appointment.id),
        data: serializeAppointment(appointment),
      };
    }
    if (item.action === "delete" && item.serverId) {
      await prisma.appointment.delete({ where: { id: toDbId(item.serverId) } });
      return { serverId: item.serverId };
    }
  }

  throw new Error("عملية غير مدعومة");
}
