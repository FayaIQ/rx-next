import { prisma } from "@/lib/prisma";
import { toDbId, fromDbId } from "@/lib/bigint";
import { serializeRecipeSettings } from "@/lib/recipe-settings";
import { defaultFieldPosition } from "@/lib/patient-field-layout";
import type { PrescriptionDocumentData } from "@/components/prescription/prescription-document";

export async function loadPrescriptionDocument(
  doctorId: number,
  prescriptionId: number
): Promise<PrescriptionDocumentData | null> {
  const doctorDbId = toDbId(doctorId);
  const [prescription, settings, fieldDefs] = await Promise.all([
    prisma.prescription.findFirst({
      where: {
        id: toDbId(prescriptionId),
        doctorId: doctorDbId,
      },
      include: {
        items: true,
        patient: true,
        fieldValues: { include: { patientField: true } },
      },
    }),
    prisma.recipeSettings.findFirst({
      where: { doctorId: doctorDbId },
    }),
    prisma.patientField.findMany({
      where: {
        doctorId: doctorDbId,
        isActive: true,
        isPersonal: false,
        isPrintable: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!prescription || !settings) return null;

  const valueMap = new Map(
    prescription.fieldValues.map((fv) => [
      fromDbId(fv.patientFieldId),
      fv.value ?? "",
    ])
  );

  const printableFields = fieldDefs
    .map((field, index) => {
      const pos = defaultFieldPosition(index);
      return {
        id: fromDbId(field.id),
        name: field.name,
        value: valueMap.get(fromDbId(field.id)) ?? "",
        designX: field.designX != null ? Number(field.designX) : pos.designX,
        designY: field.designY != null ? Number(field.designY) : pos.designY,
        size: field.size as "larg" | "medium" | "small",
      };
    })
    .filter((field) => field.value.trim());

  return {
    prescriptionNumber: prescription.prescriptionNumber ?? 0,
    prescriptionDate:
      prescription.prescriptionDate?.toISOString() ?? new Date().toISOString(),
    diagnosis: prescription.diagnosis,
    patientName: prescription.patient.name,
    patientGender: prescription.patient.gender,
    patientBirthdate: prescription.patient.birthdate?.toISOString() ?? null,
    patientPhone: prescription.patient.phone,
    xrayImage: prescription.xrayImage,
    analysisImage: prescription.analysisImage,
    items: prescription.items.map((i) => ({
      id: fromDbId(i.id),
      name: i.name,
      type: i.type,
      dosage: i.dosage,
      quantity: i.quantity,
      period: i.period,
      timeOfUse: i.timeOfUse,
    })),
    fieldValues: prescription.fieldValues.map((fv) => ({
      name: fv.patientField.name,
      value: fv.value ?? "",
      isPrintable: fv.patientField.isPrintable,
    })),
    printableFields,
    settings: serializeRecipeSettings(settings),
  };
}

export async function loadPrintableFieldDefinitions(doctorId: number) {
  const fields = await prisma.patientField.findMany({
    where: {
      doctorId: toDbId(doctorId),
      isActive: true,
      isPersonal: false,
      isPrintable: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return fields.map((field, index) => {
    const pos = defaultFieldPosition(index);
    return {
      id: fromDbId(field.id),
      name: field.name,
      size: field.size as "larg" | "medium" | "small",
      designX: field.designX != null ? Number(field.designX) : pos.designX,
      designY: field.designY != null ? Number(field.designY) : pos.designY,
    };
  });
}
