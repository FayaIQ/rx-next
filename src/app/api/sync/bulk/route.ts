import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
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
import { updateAppointmentVisitStatus } from "@/lib/visit-queue/service";
import { visitStatusSchema } from "@/lib/validations/visit-queue";
import { dentalChartUpdateSchema } from "@/lib/validations/dental";
import { treatmentSessionUpdateSchema, treatmentPlanCreateSchema } from "@/lib/validations/treatment";
import { serializeDentalChart } from "@/lib/dental/serializer";
import { createTreatmentPlanForPatient } from "@/lib/treatment/create-plan-service";
import {
  assertSessionAccess,
  parseDateKey,
  refreshPlanStatus,
} from "@/lib/treatment/plan-utils";
import {
  recordSessionVisit,
  syncSessionAppointment,
} from "@/lib/treatment/session-appointment";
import { serializeTreatmentSession } from "@/lib/treatment/serializer";
import { z } from "zod";

const bulkItemSchema = z.object({
  id: z.string(),
  entity: z.enum([
    "patient",
    "prescription",
    "medicine",
    "appointment",
    "field",
    "dental_chart",
    "treatment_session",
    "treatment_plan",
  ]),
  action: z.enum(["create", "update", "delete", "visit_status"]),
  payload: z.record(z.string(), z.unknown()),
  localId: z.string(),
  serverId: z.number().optional(),
});

export async function POST(request: Request) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;

  try {
    const body = await request.json();
    const items = z.array(bulkItemSchema).parse(body.items ?? []);

    if (ctx.userType === "secretary") {
      const forbidden = items.find((item) => item.entity !== "appointment");
      if (forbidden) {
        return apiError("المزامنة للسكرتير محصورة بالمواعيد والطابور", 403);
      }
    }

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
            allergies: data.allergies?.trim() || null,
            currentMedications: data.currentMedications?.trim() || null,
            portalInstructions: data.portalInstructions?.trim() || null,
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
            allergies: data.allergies?.trim() || null,
            currentMedications: data.currentMedications?.trim() || null,
            portalInstructions: data.portalInstructions?.trim() || null,
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
    if (item.action === "visit_status" && item.serverId) {
      const { visitStatus } = visitStatusSchema.parse(item.payload);
      const appointment = await updateAppointmentVisitStatus(
        doctorId,
        item.serverId,
        visitStatus
      );
      if (!appointment) throw new Error("الموعد غير موجود");
      return {
        serverId: item.serverId,
        data: serializeAppointment(appointment),
      };
    }
    if (item.action === "delete" && item.serverId) {
      await prisma.appointment.delete({ where: { id: toDbId(item.serverId) } });
      return { serverId: item.serverId };
    }
  }

  if (item.entity === "dental_chart" && item.action === "update") {
    const patientId = Number(item.payload.patientId ?? item.serverId);
    if (!patientId) throw new Error("معرّف المريض مطلوب");

    const patientDbId = toDbId(patientId);
    const patient = await prisma.patient.findFirst({
      where: { id: patientDbId, doctorId: doctorDbId },
    });
    if (!patient) throw new Error("المريض غير موجود");

    const data = dentalChartUpdateSchema.parse(item.payload);

    const chart = await prisma.$transaction(async (tx) => {
      const upserted = await tx.dentalChart.upsert({
        where: { patientId: patientDbId },
        create: {
          patientId: patientDbId,
          doctorId: doctorDbId,
          notes: data.notes ?? null,
        },
        update: { notes: data.notes ?? null },
      });

      for (const tooth of data.teeth) {
        if (tooth.status === "healthy" && !(tooth.notes?.trim())) {
          await tx.dentalToothRecord.deleteMany({
            where: { chartId: upserted.id, toothFdi: tooth.toothFdi },
          });
          continue;
        }

        await tx.dentalToothRecord.upsert({
          where: {
            chartId_toothFdi: {
              chartId: upserted.id,
              toothFdi: tooth.toothFdi,
            },
          },
          create: {
            chartId: upserted.id,
            toothFdi: tooth.toothFdi,
            status: tooth.status,
            notes: tooth.notes?.trim() || null,
          },
          update: {
            status: tooth.status,
            notes: tooth.notes?.trim() || null,
          },
        });
      }

      return tx.dentalChart.findUnique({
        where: { id: upserted.id },
        include: { teeth: true },
      });
    });

    if (!chart) throw new Error("فشل حفظ الطبلة");

    return {
      serverId: patientId,
      data: serializeDentalChart(chart),
    };
  }

  if (item.entity === "treatment_session" && item.action === "update" && item.serverId) {
    const sessionDbId = toDbId(item.serverId);
    const existing = await assertSessionAccess(sessionDbId, doctorDbId);
    if (!existing) throw new Error("الجلسة غير موجودة");

    const data = treatmentSessionUpdateSchema.parse(item.payload);

    const performedAt =
      data.status === "completed" && !data.performedAt
        ? new Date()
        : data.performedAt
          ? new Date(data.performedAt)
          : data.performedAt === null
            ? null
            : undefined;

    const session = await prisma.treatmentSession.update({
      where: { id: sessionDbId },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.scheduledDate !== undefined
          ? {
              scheduledDate: data.scheduledDate
                ? parseDateKey(data.scheduledDate)
                : null,
            }
          : {}),
        ...(performedAt !== undefined ? { performedAt } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
      },
    });

    await refreshPlanStatus(session.planId);

    if (data.scheduledDate !== undefined) {
      await syncSessionAppointment(session.id);
    }
    if (data.status === "completed") {
      await recordSessionVisit(session.id);
      await syncSessionAppointment(session.id);
    }

    const refreshed = await prisma.treatmentSession.findUnique({
      where: { id: sessionDbId },
    });

    return {
      serverId: item.serverId,
      data: serializeTreatmentSession(refreshed ?? session),
    };
  }

  if (item.entity === "treatment_plan" && item.action === "create") {
    const patientId = Number(item.payload.patientId);
    if (!patientId) throw new Error("معرّف المريض مطلوب");

    const patientDbId = toDbId(patientId);
    const patient = await prisma.patient.findFirst({
      where: { id: patientDbId, doctorId: doctorDbId },
    });
    if (!patient) throw new Error("المريض غير موجود");

    const data = treatmentPlanCreateSchema.parse(item.payload);
    const plan = await createTreatmentPlanForPatient(
      doctorId,
      patientDbId,
      data
    );

    return { serverId: plan.id, data: plan };
  }

  throw new Error("عملية غير مدعومة");
}
