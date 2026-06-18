import type { PatientFieldDto } from "@/lib/api/rx-client";

export function defaultFieldPosition(index: number) {
  return {
    designX: 88,
    designY: 26 + index * 5.5,
  };
}

export function sampleFieldValue(name: string): string {
  const key = name.trim().toLowerCase();
  if (key === "pr" || key.includes("pulse")) return "72";
  if (key === "bp" || key.includes("ضغط")) return "120/80";
  if (key === "temp" || key.includes("حرارة")) return "37.2";
  return "—";
}

export function fieldFontSize(size: PatientFieldDto["size"]) {
  if (size === "larg") return "1.05em";
  if (size === "small") return "0.85em";
  return "1em";
}

export function resolveFieldPosition(
  field: Pick<PatientFieldDto, "designX" | "designY">,
  index: number
) {
  return {
    x: field.designX ?? defaultFieldPosition(index).designX,
    y: field.designY ?? defaultFieldPosition(index).designY,
  };
}

export function isRecipeField(field: Pick<PatientFieldDto, "isPersonal" | "isActive">) {
  return field.isActive && !field.isPersonal;
}

export function isPrintableRecipeField(
  field: Pick<PatientFieldDto, "isPersonal" | "isActive" | "isPrintable">
) {
  return isRecipeField(field) && field.isPrintable;
}
