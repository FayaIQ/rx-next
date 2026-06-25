import { prisma } from "@/lib/prisma";
import { toDbId, fromDbId } from "@/lib/bigint";
import type { PrescriptionInput } from "@/lib/validations/rx";
import type { Prisma } from "@prisma/client";
import {
  filterFieldValuesByIds,
  getRecipeFieldIdsForDoctor,
} from "@/lib/patient-field-value-service";

export async function getNextPrescriptionNumber(doctorId: number): Promise<number> {
  const last = await prisma.prescription.findFirst({
    where: { doctorId: toDbId(doctorId) },
    orderBy: { prescriptionNumber: "desc" },
    select: { prescriptionNumber: true },
  });
  return (last?.prescriptionNumber ?? 0) + 1;
}

const emptyMed = {
  type: "",
  dosage: "",
  quantity: "",
  period: "",
  timeOfUse: "",
};

export async function createPrescription(
  doctorId: number,
  data: PrescriptionInput
) {
  const doctorDbId = toDbId(doctorId);
  const [patient, prescriptionNumber] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: toDbId(data.patientId), doctorId: doctorDbId },
    }),
    getNextPrescriptionNumber(doctorId),
  ]);
  if (!patient) throw new Error("المريض غير موجود");

  const prescriptionDate = new Date(data.prescriptionDate);
  const recipeFieldIds = await getRecipeFieldIdsForDoctor(doctorId);
  const recipeFieldValues = filterFieldValuesByIds(
    data.fieldValues ?? [],
    recipeFieldIds
  );

  const prescription = await prisma.$transaction(async (tx) => {
    const created = await tx.prescription.create({
      data: {
        patientId: toDbId(data.patientId),
        doctorId: doctorDbId,
        prescriptionDate,
        diagnosis: data.diagnosis ?? null,
        additionalInfo: (data.additionalInfo ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        prescriptionNumber,
        items: {
          create: data.items.map((item) => ({
            name: item.name,
            type: item.type ?? null,
            dosage: item.dosage ?? null,
            quantity: item.quantity ?? null,
            period: item.period ?? null,
            timeOfUse: item.timeOfUse ?? null,
          })),
        },
        fieldValues: {
          create: recipeFieldValues.map((fv) => ({
            patientFieldId: toDbId(fv.patientFieldId),
            value: fv.value,
          })),
        },
      },
      include: {
        items: true,
        fieldValues: true,
        patient: true,
      },
    });

    if (data.diagnosis) {
      await tx.patient.update({
        where: { id: toDbId(data.patientId) },
        data: { diagnosis: data.diagnosis },
      });
    }

    return created;
  });

  return prescription;
}

export async function updatePrescription(
  doctorId: number,
  prescriptionId: number,
  data: PrescriptionInput
) {
  const doctorDbId = toDbId(doctorId);
  const rxDbId = toDbId(prescriptionId);

  const existing = await prisma.prescription.findFirst({
    where: { id: rxDbId, doctorId: doctorDbId },
    include: { items: true },
  });
  if (!existing) throw new Error("الوصفة غير موجودة");

  const incomingIds = new Set(
    data.items.filter((i) => i.id).map((i) => toDbId(i.id as number))
  );
  const toDelete = existing.items.filter((i) => !incomingIds.has(i.id));
  const recipeFieldIds = await getRecipeFieldIdsForDoctor(doctorId);
  const recipeFieldValues = filterFieldValuesByIds(
    data.fieldValues ?? [],
    recipeFieldIds
  );

  const result = await prisma.$transaction(async (tx) => {
    await tx.prescription.update({
      where: { id: rxDbId },
      data: {
        patientId: toDbId(data.patientId),
        prescriptionDate: new Date(data.prescriptionDate),
        diagnosis: data.diagnosis ?? null,
        additionalInfo: (data.additionalInfo ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });

    for (const item of toDelete) {
      await tx.prescriptionItem.delete({ where: { id: item.id } });
    }

    await Promise.all(
      data.items.map((item) => {
        if (item.id) {
          return tx.prescriptionItem.update({
            where: { id: toDbId(item.id) },
            data: {
              name: item.name,
              type: item.type ?? null,
              dosage: item.dosage ?? null,
              quantity: item.quantity ?? null,
              period: item.period ?? null,
              timeOfUse: item.timeOfUse ?? null,
            },
          });
        }
        return tx.prescriptionItem.create({
          data: {
            prescriptionId: rxDbId,
            name: item.name,
            type: item.type ?? null,
            dosage: item.dosage ?? null,
            quantity: item.quantity ?? null,
            period: item.period ?? null,
            timeOfUse: item.timeOfUse ?? null,
          },
        });
      })
    );

    await tx.prescriptionFieldValue.deleteMany({
      where: { prescriptionId: rxDbId },
    });
    if (recipeFieldValues.length) {
      await tx.prescriptionFieldValue.createMany({
        data: recipeFieldValues.map((fv) => ({
          prescriptionId: rxDbId,
          patientFieldId: toDbId(fv.patientFieldId),
          value: fv.value,
        })),
      });
    }

    if (data.diagnosis) {
      await tx.patient.update({
        where: { id: toDbId(data.patientId) },
        data: { diagnosis: data.diagnosis },
      });
    }

    return tx.prescription.findUnique({
      where: { id: rxDbId },
      include: {
        items: true,
        fieldValues: { include: { patientField: true } },
        patient: true,
      },
    });
  });

  return result;
}

export function serializePrescription(prescription: {
  id: bigint | number;
  patientId: bigint | number;
  doctorId: bigint | number | null;
  prescriptionDate: Date | null;
  diagnosis: string | null;
  xrayImage?: string | null;
  analysisImage?: string | null;
  additionalInfo?: unknown;
  prescriptionNumber: number | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  items?: Array<{
    id: bigint | number;
    name: string;
    type: string | null;
    dosage: string | null;
    quantity: string | null;
    period: string | null;
    timeOfUse: string | null;
  }>;
  fieldValues?: Array<{
    id?: bigint | number;
    patientFieldId: bigint | number;
    value: string | null;
    patientField?: { name: string };
  }>;
  patient?: {
    id: bigint | number;
    name: string;
    gender: string;
    birthdate: Date | null;
    diagnosis: string | null;
    phone: string | null;
  };
}) {
  return {
    id: fromDbId(prescription.id),
    patientId: fromDbId(prescription.patientId),
    doctorId: prescription.doctorId ? fromDbId(prescription.doctorId) : null,
    prescriptionDate: prescription.prescriptionDate?.toISOString() ?? null,
    diagnosis: prescription.diagnosis,
    xrayImage: prescription.xrayImage ?? null,
    analysisImage: prescription.analysisImage ?? null,
    additionalInfo: prescription.additionalInfo ?? null,
    prescriptionNumber: prescription.prescriptionNumber,
    createdAt: prescription.createdAt?.toISOString() ?? null,
    updatedAt: prescription.updatedAt?.toISOString() ?? null,
    items: (prescription.items ?? []).map((item) => ({
      id: fromDbId(item.id),
      name: item.name,
      type: item.type,
      dosage: item.dosage,
      quantity: item.quantity,
      period: item.period,
      timeOfUse: item.timeOfUse,
    })),
    fieldValues: (prescription.fieldValues ?? []).map((fv) => ({
      patientFieldId: fromDbId(fv.patientFieldId),
      value: fv.value ?? "",
    })),
    patient: prescription.patient
      ? {
          id: fromDbId(prescription.patient.id),
          name: prescription.patient.name,
          gender: prescription.patient.gender,
          birthdate: prescription.patient.birthdate?.toISOString() ?? null,
          diagnosis: prescription.patient.diagnosis,
          phone: prescription.patient.phone,
        }
      : undefined,
  };
}

export { emptyMed };
