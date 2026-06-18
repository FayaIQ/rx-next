export type PatientCoreFieldVisibility = {
  showGender: boolean;
  showAge: boolean;
  showPhone: boolean;
};

export const DEFAULT_PATIENT_FIELD_VISIBILITY: PatientCoreFieldVisibility = {
  showGender: true,
  showAge: true,
  showPhone: true,
};

export type CoreFocusField = "name" | "gender" | "age" | "phone";

const FIELD_CHAIN: CoreFocusField[] = ["name", "gender", "age", "phone"];

function isFieldVisible(
  field: CoreFocusField,
  visibility: PatientCoreFieldVisibility
): boolean {
  if (field === "name") return true;
  if (field === "gender") return visibility.showGender;
  if (field === "age") return visibility.showAge;
  return visibility.showPhone;
}

export function visibleCoreFields(
  visibility: PatientCoreFieldVisibility
): CoreFocusField[] {
  return FIELD_CHAIN.filter((field) => isFieldVisible(field, visibility));
}

export function nextCoreField(
  current: CoreFocusField,
  visibility: PatientCoreFieldVisibility
): CoreFocusField | "submit" {
  const visible = visibleCoreFields(visibility);
  const idx = visible.indexOf(current);
  if (idx === -1 || idx === visible.length - 1) return "submit";
  return visible[idx + 1];
}

export function firstCoreFieldAfterName(
  visibility: PatientCoreFieldVisibility
): CoreFocusField | "submit" {
  return nextCoreField("name", visibility);
}

export function patientFieldVisibilityFromSettings(settings: {
  showGender?: boolean;
  showAge?: boolean;
  showPhone?: boolean;
}): PatientCoreFieldVisibility {
  return {
    showGender: settings.showGender ?? true,
    showAge: settings.showAge ?? true,
    showPhone: settings.showPhone ?? true,
  };
}
