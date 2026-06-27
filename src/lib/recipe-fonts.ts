export const RECIPE_FONT_IDS = [
  "cairo",
  "tajawal",
  "almarai",
  "amiri",
  "noto_naskh",
  "scheherazade",
  "markazi",
  "ibm_plex",
  "readex",
  "aref_ruqaa",
  "aref_ruqaa_ink",
  "lateef",
  "gulzar",
  "rakkas",
  "katibeh",
  "reem_kufi",
  "mirza",
] as const;

export type RecipeFontId = (typeof RECIPE_FONT_IDS)[number];

export type RecipeFontCategory = "standard" | "script";

export type RecipeFontOption = {
  value: RecipeFontId;
  label: string;
  hint: string;
  category: RecipeFontCategory;
};

const LEGACY_FONT_MAP: Record<string, RecipeFontId> = {
  Cairo: "cairo",
  cairo: "cairo",
  Tajawal: "tajawal",
  tajawal: "tajawal",
  FF_Shamel: "amiri",
  "FF Shamel": "amiri",
  Almarai: "almarai",
};

export const RECIPE_FONT_OPTIONS: RecipeFontOption[] = [
  { value: "cairo", label: "Cairo", hint: "عصري وواضح", category: "standard" },
  { value: "tajawal", label: "Tajawal", hint: "مريح للقراءة", category: "standard" },
  { value: "almarai", label: "Almarai", hint: "بسيط وأنيق", category: "standard" },
  { value: "amiri", label: "Amiri", hint: "تقليدي", category: "standard" },
  {
    value: "noto_naskh",
    label: "Noto Naskh",
    hint: "نسخ عربي",
    category: "standard",
  },
  {
    value: "scheherazade",
    label: "Scheherazade",
    hint: "كلاسيكي",
    category: "standard",
  },
  {
    value: "markazi",
    label: "Markazi",
    hint: "للعناوين",
    category: "standard",
  },
  {
    value: "ibm_plex",
    label: "IBM Plex Arabic",
    hint: "تقني نظيف",
    category: "standard",
  },
  { value: "readex", label: "Readex Pro", hint: "للنصوص", category: "standard" },
  {
    value: "aref_ruqaa",
    label: "Aref Ruqaa",
    hint: "رقعة — مزج",
    category: "script",
  },
  {
    value: "aref_ruqaa_ink",
    label: "Aref Ruqaa Ink",
    hint: "رقعة حبر — مزج",
    category: "script",
  },
  { value: "lateef", label: "Lateef", hint: "خط يدوي", category: "script" },
  { value: "gulzar", label: "Gulzar", hint: "نستعليق", category: "script" },
  { value: "rakkas", label: "Rakkas", hint: "زخرفي", category: "script" },
  { value: "katibeh", label: "Katibeh", hint: "ديواني", category: "script" },
  { value: "reem_kufi", label: "Reem Kufi", hint: "كوفي", category: "script" },
  { value: "mirza", label: "Mirza", hint: "نستعليق كلاسيكي", category: "script" },
];

/** @deprecated use RECIPE_FONT_OPTIONS */
export const FONT_OPTIONS = RECIPE_FONT_OPTIONS.map(({ value, label }) => ({
  value,
  label,
}));

export function isRecipeFontId(value: string): value is RecipeFontId {
  return (RECIPE_FONT_IDS as readonly string[]).includes(value);
}

export function migrateRecipeFontId(value: string | null | undefined): RecipeFontId {
  if (!value) return "cairo";
  const trimmed = value.trim();
  if (LEGACY_FONT_MAP[trimmed]) return LEGACY_FONT_MAP[trimmed]!;
  if (isRecipeFontId(trimmed)) return trimmed;
  return "cairo";
}

export function recipeFontFamilyName(id: RecipeFontId): string {
  return `RX ${id.replace(/_/g, " ")}`;
}

export function fontFamilyCss(family: string): string {
  const id = migrateRecipeFontId(family);
  const name = recipeFontFamilyName(id);
  return `"${name}", "RX cairo", "Cairo", sans-serif`;
}
