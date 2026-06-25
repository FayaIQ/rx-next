import type { PrescriptionDocumentData } from "@/components/prescription/prescription-document";
import type { PatientFieldDto } from "@/lib/api/rx-client";
import { resolveFieldPosition } from "@/lib/patient-field-layout";
import {
  normalizeRecipeSettingsDto,
  type RecipeSettingsDto,
} from "@/lib/recipe-settings";

type PreviewItem = {
  id?: number;
  name: string;
  type: string;
  dosage: string;
  quantity: string;
  period: string;
  timeOfUse: string;
};

export function buildPrescriptionPreviewData(options: {
  settings: RecipeSettingsDto;
  prescriptionNumber: number | null;
  prescriptionDate: string;
  patientName: string;
  patientGender: string;
  patientBirthdate: string | null;
  patientPhone?: string | null;
  diagnosis: string;
  items: PreviewItem[];
  recipeFields: PatientFieldDto[];
  fieldValues: Record<number, string>;
  xrayImage?: string | null;
  analysisImage?: string | null;
}): PrescriptionDocumentData {
  const normalizedSettings = normalizeRecipeSettingsDto(options.settings);

  const printableFields = options.recipeFields
    .filter((f) => options.fieldValues[f.id]?.trim())
    .map((field, index) => {
      const pos = resolveFieldPosition(field, index);
      return {
        id: field.id,
        name: field.name,
        value: options.fieldValues[field.id] ?? "",
        designX: pos.x,
        designY: pos.y,
        size: field.size,
      };
    });

  return {
    prescriptionNumber: options.prescriptionNumber ?? 0,
    prescriptionDate: options.prescriptionDate,
    diagnosis: options.diagnosis || null,
    patientName: options.patientName,
    patientGender: options.patientGender,
    patientBirthdate: options.patientBirthdate,
    patientPhone: options.patientPhone,
    items: options.items
      .filter((i) => i.name.trim())
      .map((item, idx) => ({
        id: item.id ?? idx,
        name: item.name,
        type: item.type || null,
        dosage: item.dosage || null,
        quantity: item.quantity || null,
        period: item.period || null,
        timeOfUse: item.timeOfUse || null,
      })),
    printableFields,
    xrayImage: options.xrayImage,
    analysisImage: options.analysisImage,
    settings: normalizedSettings,
  };
}
