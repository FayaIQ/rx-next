import type { RecipeSettingsDto } from "@/lib/api/rx-client";
import {
  DEFAULT_ITEMS_BOX_HEIGHT,
  DEFAULT_ITEMS_BOX_WIDTH,
} from "@/components/recipe/prescription-items-box";
import {
  ACADEMIC_RECIPE_TEMPLATE_DEFAULTS,
  ACADEMIC_RECIPE_TEMPLATE_ID,
} from "@/lib/academic-recipe-template";

export const RECIPE_TEMPLATE_IDS = [
  ACADEMIC_RECIPE_TEMPLATE_ID,
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
    id: ACADEMIC_RECIPE_TEMPLATE_ID,
    name: "أكاديمي",
    description: "القالب الرسمي الافتراضي للطبيب والعيادة",
    swatch: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.color,
    defaults: {
      color: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.color,
      designPatientX: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designPatientX,
      designPatientY: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designPatientY,
      designAgeX: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designAgeX,
      designAgeY: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designAgeY,
      designDateX: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designDateX,
      designDateY: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designDateY,
      designPhoneX: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designPhoneX,
      designPhoneY: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designPhoneY,
      designItemsX: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designItemsX,
      designItemsY: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designItemsY,
      designItemsWidth: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designItemsWidth,
      designItemsHeight: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designItemsHeight,
    },
  },
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
    ...(templateId === ACADEMIC_RECIPE_TEMPLATE_ID
      ? {
          paperSize: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.paperSize,
          fontSize: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.fontSize,
        }
      : {}),
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
    case "academic":
      return `${base}
        .tpl-academic-top { position:absolute; top:0; left:0; right:0; height:7px; background:linear-gradient(90deg,#1e293b,${color}); }
        .tpl-academic-logo { position:absolute; top:4.6%; left:7%; width:14%; height:10%; display:flex; align-items:center; justify-content:center; padding:8px; border:1px solid #cbd5e1; border-radius:10px; background:#fff; box-shadow:0 2px 7px #0f172a14; }
        .tpl-academic-logo .tpl-logo { max-width:100%; max-height:100%; }
        .tpl-academic-head { position:absolute; top:2.6%; left:22%; right:8%; text-align:center; color:#0f172a; }
        .tpl-academic-clinic { margin:0; overflow:hidden; color:${color}; font-size:.86rem; font-weight:800; letter-spacing:.01em; white-space:nowrap; text-overflow:ellipsis; }
        .tpl-academic-head h1 { margin:3px 0 0; overflow:hidden; color:#0f172a; font-size:1.5rem; font-weight:900; line-height:1.12; white-space:nowrap; text-overflow:ellipsis; }
        .tpl-academic-specialty { margin:2px 0 0; overflow:hidden; color:${color}; font-size:.86rem; font-weight:800; white-space:nowrap; text-overflow:ellipsis; }
        .tpl-academic-title { margin:2px auto 0; max-width:94%; overflow:hidden; color:#475569; font-size:.62rem; line-height:1.2; white-space:nowrap; text-overflow:ellipsis; }
        .tpl-academic-license-wrap { position:absolute; top:15.2%; left:22%; right:8%; text-align:center; }
        .tpl-academic-license { display:inline-block; max-width:100%; margin:0; padding:1px 6px; overflow:hidden; border:1px solid #dbe3ee; border-radius:4px; background:#f8fafc; color:#475569; font-size:.59rem; font-weight:700; line-height:1.2; white-space:nowrap; text-overflow:ellipsis; }
        .tpl-academic-services { position:absolute; top:18.5%; left:8%; right:8%; overflow:hidden; color:#64748b; font-size:.59rem; line-height:1.2; text-align:center; white-space:nowrap; text-overflow:ellipsis; }
        .tpl-academic-rule-light { position:absolute; top:20.8%; left:8%; right:8%; height:1px; background:#cbd5e1; }
        .tpl-academic-rule-strong { position:absolute; top:21.5%; left:8%; right:8%; height:2px; background:${color}; }
        .tpl-academic-patient { position:absolute; top:23.55%; left:8%; right:8%; display:grid; grid-template-columns:1.45fr 1fr 1.05fr; gap:1.8%; direction:rtl; color:#334155; font-size:.68rem; font-weight:700; }
        .tpl-academic-field { display:flex; align-items:flex-end; gap:5px; min-width:0; white-space:nowrap; }
        .tpl-academic-dots { min-width:0; flex:1; height:1em; border-bottom:1px dotted #94a3b8; }
        .tpl-academic-patient-bottom { position:absolute; top:26.5%; left:8%; right:8%; height:1px; background:#dbe3ee; }
        .tpl-academic-writing-line { position:absolute; left:8%; right:8%; border-bottom:1px dashed #dbe3ee; }
        .tpl-academic-footer { position:absolute; left:8%; right:8%; bottom:4.3%; padding-top:5px; border-top:1.5px solid ${color}; color:#64748b; font-size:.63rem; line-height:1.25; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tpl-academic-footer strong { color:#0c4a6e; }
      `;
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
    | "clinicName"
    | "doctorName"
    | "doctorSpecialty"
    | "professionalTitle"
    | "licenseNumber"
    | "services"
    | "phoneNumber"
    | "email"
    | "address"
    | "additionalText1"
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
    .join("<br/>");

  const services = settings.services
    ?.split(/\r?\n/)
    .map((service) => service.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map(escapeHtml)
    .join(" • ");

  switch (id) {
    case "academic":
      return `<div class="tpl-shell"><div class="tpl-academic-top"></div>${logo ? `<div class="tpl-academic-logo">${logo}</div>` : ""}<div class="tpl-academic-head"><p class="tpl-academic-clinic">${escapeHtml(settings.clinicName || "RX Clinic")}</p><h1>${name}</h1><p class="tpl-academic-specialty">${specialty}</p>${settings.professionalTitle ? `<p class="tpl-academic-title">${escapeHtml(settings.professionalTitle)}</p>` : ""}</div>${settings.licenseNumber ? `<div class="tpl-academic-license-wrap"><p class="tpl-academic-license">رقم الإجازة أو النقابة: <span dir="ltr">${escapeHtml(settings.licenseNumber)}</span></p></div>` : ""}${services ? `<div class="tpl-academic-services">${services}</div>` : ""}<div class="tpl-academic-rule-light"></div><div class="tpl-academic-rule-strong"></div><div class="tpl-academic-patient"><div class="tpl-academic-field"><span>اسم المريض:</span><span class="tpl-academic-dots"></span></div><div class="tpl-academic-field"><span>العمر / الجنس:</span><span class="tpl-academic-dots"></span></div><div class="tpl-academic-field"><span>التاريخ:</span><span class="tpl-academic-dots"></span></div></div><div class="tpl-academic-patient-bottom"></div><div class="tpl-academic-writing-line" style="top:43%"></div><div class="tpl-academic-writing-line" style="top:56%"></div><div class="tpl-academic-writing-line" style="top:69%"></div>${contact ? `<div class="tpl-academic-footer">${settings.phoneNumber ? `<strong dir="ltr">${escapeHtml(settings.phoneNumber)}</strong>` : ""}${settings.phoneNumber && (settings.address || settings.email) ? " • " : ""}${escapeHtml(settings.address || settings.email || "")}</div>` : ""}</div>`;
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
