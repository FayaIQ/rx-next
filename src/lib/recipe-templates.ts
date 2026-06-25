import type { RecipeSettingsDto } from "@/lib/api/rx-client";
import {
  DEFAULT_ITEMS_BOX_HEIGHT,
  DEFAULT_ITEMS_BOX_WIDTH,
} from "@/components/recipe/prescription-items-box";

export const RECIPE_TEMPLATE_IDS = [
  "classic",
  "modern",
  "elegant",
  "medical",
  "minimal",
] as const;

export type RecipeTemplateId = (typeof RECIPE_TEMPLATE_IDS)[number];

export type RecipeTemplateDefinition = {
  id: RecipeTemplateId;
  name: string;
  description: string;
  swatch: string;
  defaults: Pick<
    RecipeSettingsDto,
    | "color"
    | "designPatientX"
    | "designPatientY"
    | "designAgeX"
    | "designAgeY"
    | "designDateX"
    | "designDateY"
    | "designPhoneX"
    | "designPhoneY"
    | "designItemsX"
    | "designItemsY"
    | "designItemsWidth"
    | "designItemsHeight"
  >;
};

export const RECIPE_TEMPLATES: RecipeTemplateDefinition[] = [
  {
    id: "classic",
    name: "كلاسيكي",
    description: "ترويسة ملوّنة تقليدية للعيادات",
    swatch: "#117e65",
    defaults: {
      color: "#117e65",
      designPatientX: 72,
      designPatientY: 24,
      designAgeX: 28,
      designAgeY: 24,
      designDateX: 12,
      designDateY: 24,
      designPhoneX: 50,
      designPhoneY: 24,
      designItemsX: 8,
      designItemsY: 32,
      designItemsWidth: 84,
      designItemsHeight: 48,
    },
  },
  {
    id: "modern",
    name: "عصري",
    description: "شريط جانبي وأسلوب نظيف",
    swatch: "#0891b2",
    defaults: {
      color: "#0891b2",
      designPatientX: 78,
      designPatientY: 20,
      designAgeX: 55,
      designAgeY: 20,
      designDateX: 32,
      designDateY: 20,
      designPhoneX: 32,
      designPhoneY: 26,
      designItemsX: 14,
      designItemsY: 34,
      designItemsWidth: 80,
      designItemsHeight: 50,
    },
  },
  {
    id: "elegant",
    name: "أنيق",
    description: "خطوط زخرفية وعنوان مركّز",
    swatch: "#92400e",
    defaults: {
      color: "#92400e",
      designPatientX: 50,
      designPatientY: 28,
      designAgeX: 72,
      designAgeY: 28,
      designDateX: 28,
      designDateY: 28,
      designPhoneX: 50,
      designPhoneY: 33,
      designItemsX: 10,
      designItemsY: 38,
      designItemsWidth: 80,
      designItemsHeight: 46,
    },
  },
  {
    id: "medical",
    name: "طبي",
    description: "مظهر مستشفى احترافي بأزرق",
    swatch: "#1d4ed8",
    defaults: {
      color: "#1d4ed8",
      designPatientX: 75,
      designPatientY: 26,
      designAgeX: 42,
      designAgeY: 26,
      designDateX: 14,
      designDateY: 26,
      designPhoneX: 58,
      designPhoneY: 26,
      designItemsX: 8,
      designItemsY: 34,
      designItemsWidth: 84,
      designItemsHeight: 50,
    },
  },
  {
    id: "minimal",
    name: "بسيط",
    description: "مساحات بيضاء وخطوط رفيعة",
    swatch: "#334155",
    defaults: {
      color: "#334155",
      designPatientX: 80,
      designPatientY: 16,
      designAgeX: 55,
      designAgeY: 16,
      designDateX: 20,
      designDateY: 16,
      designPhoneX: 35,
      designPhoneY: 16,
      designItemsX: 8,
      designItemsY: 24,
      designItemsWidth: 84,
      designItemsHeight: 55,
    },
  },
];

export function isRecipeTemplateId(value: string): value is RecipeTemplateId {
  return RECIPE_TEMPLATE_IDS.includes(value as RecipeTemplateId);
}

export function getRecipeTemplate(id: string): RecipeTemplateDefinition {
  return (
    RECIPE_TEMPLATES.find((t) => t.id === id) ??
    RECIPE_TEMPLATES[0]!
  );
}

export function applyRecipeTemplate(
  current: RecipeSettingsDto,
  templateId: RecipeTemplateId
): RecipeSettingsDto {
  const template = getRecipeTemplate(templateId);
  return {
    ...current,
    designMode: "design",
    designTemplate: templateId,
    ...template.defaults,
    designItemsWidth:
      template.defaults.designItemsWidth ?? DEFAULT_ITEMS_BOX_WIDTH,
    designItemsHeight:
      template.defaults.designItemsHeight ?? DEFAULT_ITEMS_BOX_HEIGHT,
  };
}

export function templatePrintStyles(
  templateId: string,
  color: string
): string {
  const id = isRecipeTemplateId(templateId) ? templateId : "classic";

  const base = `
    .tpl-shell { position:absolute; inset:0; z-index:0; pointer-events:none; }
    .tpl-header { padding:20px 24px 14px; }
    .tpl-header h1 { margin:0; font-size:1.2rem; font-weight:700; }
    .tpl-header p { margin:4px 0 0; opacity:.85; font-size:.85rem; }
    .tpl-logo { max-height:56px; max-width:56px; object-fit:contain; }
  `;

  switch (id) {
    case "modern":
      return `${base}
        .tpl-bar { position:absolute; top:0; right:0; width:6%; height:100%; background:${color}; }
        .tpl-frame { position:absolute; left:10%; top:12%; right:4%; bottom:6%; border:2px solid ${color}22; border-radius:12px; }
        .tpl-header { position:absolute; top:0; left:10%; right:4%; display:flex; justify-content:space-between; align-items:flex-start; }
      `;
    case "elegant":
      return `${base}
        .tpl-top-line, .tpl-bottom-line { position:absolute; left:8%; right:8%; height:3px; background:linear-gradient(90deg,transparent,${color},transparent); }
        .tpl-top-line { top:5%; }
        .tpl-bottom-line { bottom:5%; }
        .tpl-header { text-align:center; padding-top:8%; }
        .tpl-ornament { display:inline-block; width:40px; height:2px; background:${color}; vertical-align:middle; margin:0 8px; }
      `;
    case "medical":
      return `${base}
        .tpl-header-bar { position:absolute; top:0; left:0; right:0; height:17%; background:${color}; color:#fff; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; }
        .tpl-grid { position:absolute; inset:18% 6% 6%; background-image:linear-gradient(${color}08 1px,transparent 1px),linear-gradient(90deg,${color}08 1px,transparent 1px); background-size:24px 24px; }
        .tpl-cross { font-size:2rem; opacity:.9; }
      `;
    case "minimal":
      return `${base}
        .tpl-rule { position:absolute; top:10%; left:8%; right:8%; height:1px; background:${color}44; }
        .tpl-header { position:absolute; top:4%; left:8%; right:8%; display:flex; justify-content:space-between; align-items:flex-start; }
        .tpl-header h1 { font-size:1rem; font-weight:600; }
      `;
    default:
      return `${base}
        .tpl-border { position:absolute; inset:10px; border:2px solid ${color}44; border-radius:4px; }
        .tpl-header-bar { position:absolute; top:10px; left:10px; right:10px; height:16%; background:${color}; color:#fff; border-radius:4px 4px 0 0; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; }
        .tpl-patient-band { position:absolute; left:10px; right:10px; top:calc(16% + 10px); height:7%; background:${color}0d; border-bottom:1px solid ${color}22; }
      `;
  }
}

export function templatePrintHeaderHtml(
  templateId: string,
  settings: Pick<
    RecipeSettingsDto,
    "doctorName" | "doctorSpecialty" | "phoneNumber" | "email" | "address" | "additionalText1"
  >,
  logoUrl: string | null,
  escapeHtml: (s: string) => string
): string {
  const id = isRecipeTemplateId(templateId) ? templateId : "classic";
  const name = escapeHtml(settings.doctorName);
  const specialty = escapeHtml(settings.doctorSpecialty);
  const logo = logoUrl
    ? `<img class="tpl-logo" src="${logoUrl}" alt=""/>`
    : "";

  const contact = [
    settings.phoneNumber,
    settings.email,
    settings.address,
  ]
    .filter(Boolean)
    .map((v) => escapeHtml(v!))
    .join(" · ");

  switch (id) {
    case "modern":
      return `<div class="tpl-shell"><div class="tpl-bar"></div><div class="tpl-frame"></div><div class="tpl-header"><div><h1 style="color:inherit">${name}</h1><p>${specialty}</p>${contact ? `<small>${contact}</small>` : ""}</div>${logo}</div></div>`;
    case "elegant":
      return `<div class="tpl-shell"><div class="tpl-top-line"></div><div class="tpl-bottom-line"></div><div class="tpl-header"><span class="tpl-ornament"></span><div><h1>${name}</h1><p>${specialty}</p></div><span class="tpl-ornament"></span>${logo ? `<div style="margin-top:8px">${logo}</div>` : ""}</div></div>`;
    case "medical":
      return `<div class="tpl-shell"><div class="tpl-header-bar"><div><h1>${name}</h1><p style="opacity:.9">${specialty}</p></div><div style="display:flex;align-items:center;gap:12px"><span class="tpl-cross">✚</span>${logo}</div></div><div class="tpl-grid"></div></div>`;
    case "minimal":
      return `<div class="tpl-shell"><div class="tpl-rule"></div><div class="tpl-header"><div><h1>${name}</h1><p style="font-size:.8rem;opacity:.7">${specialty}</p></div>${logo}</div></div>`;
    default:
      return `<div class="tpl-shell"><div class="tpl-border"></div><div class="tpl-header-bar"><div><h1>${name}</h1><p style="opacity:.9">${specialty}</p>${settings.additionalText1 ? `<small>${escapeHtml(settings.additionalText1)}</small>` : ""}</div>${logo}</div><div class="tpl-patient-band"></div></div>`;
  }
}
