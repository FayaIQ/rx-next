import type { TranslateFn } from "@/i18n/locale-provider";

const TOOTH_STATUS_KEYS: Record<string, string> = {
  healthy: "dental.statusHealthy",
  caries: "dental.statusCaries",
  filled: "dental.statusFilled",
  crown: "dental.statusCrown",
  missing: "dental.statusMissing",
  root_canal: "dental.statusRootCanal",
  implant: "dental.statusImplant",
  fracture: "dental.statusFracture",
  watch: "dental.statusWatch",
};

const TREATMENT_TYPE_KEYS: Record<string, string> = {
  root_canal: "treatment.typeRootCanal",
  crown: "treatment.typeCrown",
  filled: "treatment.typeFilled",
  implant: "treatment.typeImplant",
  caries: "treatment.typeCaries",
  fracture: "treatment.typeFracture",
  extraction: "treatment.typeExtraction",
  cleaning: "treatment.typeCleaning",
  other: "treatment.typeOther",
};

const TEMPLATE_KEYS: Record<string, string> = {
  root_canal_standard: "dental.tplRootCanal",
  crown_standard: "dental.tplCrown",
  implant_standard: "dental.tplImplant",
  caries_standard: "dental.tplCaries",
  cleaning_single: "dental.tplCleaning",
};

const RECIPE_TEMPLATE_KEYS: Record<
  string,
  { name: string; desc: string }
> = {
  classic: { name: "recipe.tplClassic", desc: "recipe.tplClassicDesc" },
  modern: { name: "recipe.tplModern", desc: "recipe.tplModernDesc" },
  elegant: { name: "recipe.tplElegant", desc: "recipe.tplElegantDesc" },
  medical: { name: "recipe.tplMedical", desc: "recipe.tplMedicalDesc" },
  minimal: { name: "recipe.tplMinimal", desc: "recipe.tplMinimalDesc" },
};

export function tToothStatus(t: TranslateFn, status: string): string {
  const key = TOOTH_STATUS_KEYS[status];
  return key ? t(key) : status;
}

export function tTreatmentType(t: TranslateFn, type: string): string {
  const key = TREATMENT_TYPE_KEYS[type] ?? TOOTH_STATUS_KEYS[type];
  return key ? t(key) : type;
}

export function tTreatmentTemplate(t: TranslateFn, id: string): string {
  const key = TEMPLATE_KEYS[id];
  return key ? t(key) : id;
}

export function tToothQuadrant(t: TranslateFn, fdi: number): string {
  if (fdi >= 11 && fdi <= 18) return t("dental.quadUR");
  if (fdi >= 21 && fdi <= 28) return t("dental.quadUL");
  if (fdi >= 31 && fdi <= 38) return t("dental.quadLL");
  if (fdi >= 41 && fdi <= 48) return t("dental.quadLR");
  return "";
}

export function tRecipeTemplate(
  t: TranslateFn,
  id: string
): { name: string; description: string } | null {
  const keys = RECIPE_TEMPLATE_KEYS[id];
  if (!keys) return null;
  return { name: t(keys.name), description: t(keys.desc) };
}
