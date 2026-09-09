import type { RecipeSettingsDto } from "@/lib/api/rx-client";
import {
  DEFAULT_ITEMS_BOX_HEIGHT,
  DEFAULT_ITEMS_BOX_WIDTH,
} from "@/components/recipe/prescription-items-box";
import {
  ACADEMIC_RECIPE_TEMPLATE_DEFAULTS,
  ACADEMIC_RECIPE_TEMPLATE_ID,
} from "@/lib/academic-recipe-template";
import {
  BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS,
  BLUE_SIDEBAR_RECIPE_TEMPLATE_ID,
} from "@/lib/blue-sidebar-recipe-template";

export const RECIPE_TEMPLATE_IDS = [
  ACADEMIC_RECIPE_TEMPLATE_ID,
  BLUE_SIDEBAR_RECIPE_TEMPLATE_ID,
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
  > &
    Partial<Pick<RecipeSettingsDto, "paperSize" | "fontSize">>;
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
      paperSize: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.paperSize,
      fontSize: ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.fontSize,
    },
  },
  {
    id: BLUE_SIDEBAR_RECIPE_TEMPLATE_ID,
    name: "جانبي أزرق",
    description: "بطاقة طبيب جانبية قابلة للتخصيص بمقاس A5 أفقي",
    swatch: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.color,
    defaults: {
      color: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.color,
      designPatientX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designPatientX,
      designPatientY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designPatientY,
      designAgeX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designAgeX,
      designAgeY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designAgeY,
      designDateX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designDateX,
      designDateY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designDateY,
      designPhoneX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designPhoneX,
      designPhoneY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designPhoneY,
      designItemsX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designItemsX,
      designItemsY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designItemsY,
      designItemsWidth: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designItemsWidth,
      designItemsHeight: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designItemsHeight,
      paperSize: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.paperSize,
      fontSize: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.fontSize,
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
    case "sidebar_blue":
      return `${base}
        .tpl-sidebar-panel { position:absolute; top:0; right:0; bottom:8.7%; width:32%; overflow:hidden; border-bottom-left-radius:9px; background:${color}; color:#fff; text-align:center; }
        .tpl-sidebar-photo { width:56%; aspect-ratio:1; margin:1.2% auto 0; overflow:hidden; border:3px solid #fff; border-radius:999px; background:#fff2; }
        .tpl-sidebar-photo img, .tpl-sidebar-photo .tpl-logo { width:100%; height:100%; max-width:100%; max-height:100%; object-fit:cover; }
        .tpl-sidebar-photo-placeholder { display:flex; align-items:center; justify-content:center; width:100%; height:100%; font-size:1.35rem; font-weight:900; }
        .tpl-sidebar-qr { width:26%; margin:1.1% auto 0; }
        .tpl-sidebar-qr svg { display:block; width:100%; height:auto; }
        .tpl-sidebar-copy { padding:0 7%; }
        .tpl-sidebar-kicker { margin:.55em 0 0; font-size:.73rem; font-weight:800; line-height:1.1; }
        .tpl-sidebar-name { margin:.08em 0 0; font-size:1.05rem; font-weight:900; line-height:1.15; }
        .tpl-sidebar-specialty { margin:.4em 0 0; font-size:.61rem; font-weight:800; line-height:1.25; }
        .tpl-sidebar-services { max-height:7.3em; margin:.35em 0 0; overflow:hidden; font-size:.52rem; font-weight:700; line-height:1.28; white-space:pre-line; }
        .tpl-sidebar-title { max-height:3em; margin:.35em 0 0; overflow:hidden; font-size:.54rem; font-weight:800; line-height:1.2; white-space:pre-line; }
        .tpl-sidebar-license { margin:.4em 0 0; font-size:.48rem; font-weight:700; line-height:1.2; }
        .tpl-sidebar-footer { position:absolute; right:0; bottom:0; left:0; height:8.7%; display:flex; align-items:center; justify-content:space-between; gap:1.5em; padding:0 2.2%; background:${color}; color:#fff; font-size:.58rem; font-weight:800; }
        .tpl-sidebar-contact { display:flex; align-items:center; gap:.5em; min-width:0; }
        .tpl-sidebar-contact-copy { min-width:0; line-height:1.25; text-align:left; }
        .tpl-sidebar-contact-copy div { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .tpl-sidebar-icon { display:inline-flex; align-items:center; justify-content:center; width:1.7em; height:1.7em; flex:none; border:2px solid #fff; border-radius:999px; font-size:1.1em; }
        .tpl-sidebar-patient-label { position:absolute; top:11.2%; right:34%; color:#050505; font-size:.83rem; font-weight:900; }
        .tpl-sidebar-patient-band { position:absolute; top:11.4%; left:3.8%; width:50.5%; height:3.9%; border-radius:8px; background:#e1e1e1; }
        .tpl-sidebar-age-label { position:absolute; top:11.62%; left:13.6%; color:#050505; font-size:.8rem; font-weight:900; }
        .tpl-sidebar-age-line { position:absolute; top:13.45%; left:4.9%; width:6.4%; border-bottom:1.5px solid #333; }
        .tpl-sidebar-name-line { position:absolute; top:13.45%; left:21.9%; width:30.3%; border-bottom:1.5px solid #333; }
        .tpl-sidebar-date-label { position:absolute; top:21%; left:13.8%; color:#050505; font-size:.82rem; font-weight:900; }
      `;
    case "academic":
      return `${base}
        .tpl-academic-top { position:absolute; top:0; left:0; right:0; height:7px; background:linear-gradient(90deg,#1e293b,${color}); }
        .tpl-academic-logo { position:absolute; top:4.6%; left:7%; width:14%; height:10%; display:flex; align-items:center; justify-content:center; padding:8px; border:1px solid #cbd5e1; border-radius:10px; background:#fff; box-shadow:0 2px 7px #0f172a14; }
        .tpl-academic-logo .tpl-logo { max-width:100%; max-height:100%; }
        .tpl-academic-head { position:absolute; top:2.6%; left:22%; right:8%; text-align:center; color:#0f172a; }
        .tpl-academic-clinic { margin:0; overflow:hidden; color:${color}; font-size:.86rem; font-weight:800; letter-spacing:.01em; white-space:nowrap; text-overflow:ellipsis; }
        .tpl-academic-head h1 { margin:3px 0 0; overflow:hidden; color:#0f172a; font-size:1.5rem; font-weight:900; line-height:1.12; white-space:nowrap; text-overflow:ellipsis; }
        .tpl-academic-specialty { margin:2px 0 0; overflow:hidden; color:${color}; font-size:.86rem; font-weight:800; white-space:nowrap; text-overflow:ellipsis; }
        .tpl-academic-title { margin:2px auto 0; max-width:94%; color:#475569; font-size:.62rem; line-height:1.2; overflow-wrap:anywhere; white-space:pre-line; }
        .tpl-academic-license-wrap { position:absolute; top:15.2%; left:22%; right:8%; text-align:center; }
        .tpl-academic-license { display:inline-block; max-width:100%; margin:0; padding:1px 6px; overflow:hidden; border:1px solid #dbe3ee; border-radius:4px; background:#f8fafc; color:#475569; font-size:.59rem; font-weight:700; line-height:1.2; white-space:nowrap; text-overflow:ellipsis; }
        .tpl-academic-services { position:absolute; top:17.8%; left:8%; right:8%; max-height:7%; overflow:hidden; color:#64748b; font-size:.59rem; line-height:1.2; text-align:center; }
        .tpl-academic-rule-light { position:absolute; top:25%; left:8%; right:8%; height:1px; background:#cbd5e1; }
        .tpl-academic-rule-strong { position:absolute; top:25.7%; left:8%; right:8%; height:2px; background:${color}; }
        .tpl-academic-patient { position:absolute; top:27.75%; left:8%; right:8%; display:grid; grid-template-columns:1.45fr 1fr 1.05fr; gap:1.8%; direction:rtl; color:#334155; font-size:.68rem; font-weight:700; }
        .tpl-academic-field { display:flex; align-items:flex-end; gap:5px; min-width:0; white-space:nowrap; }
        .tpl-academic-dots { min-width:0; flex:1; height:1em; border-bottom:1px dotted #94a3b8; }
        .tpl-academic-patient-bottom { position:absolute; top:30.7%; left:8%; right:8%; height:1px; background:#dbe3ee; }
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
  escapeHtml: (s: string) => string,
  qrSvg = ""
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
    .join("<br/>");

  switch (id) {
    case "sidebar_blue":
      return `<div class="tpl-shell"><div class="tpl-sidebar-panel"><div class="tpl-sidebar-photo">${logo || `<div class="tpl-sidebar-photo-placeholder">RX</div>`}</div>${qrSvg ? `<div class="tpl-sidebar-qr">${qrSvg}</div>` : ""}<div class="tpl-sidebar-copy">${settings.additionalText1 ? `<p class="tpl-sidebar-kicker">${escapeHtml(settings.additionalText1)}</p>` : ""}<h1 class="tpl-sidebar-name">${name}</h1><p class="tpl-sidebar-specialty">${specialty}</p>${services ? `<p class="tpl-sidebar-services">${services}</p>` : ""}${settings.professionalTitle ? `<p class="tpl-sidebar-title">${escapeHtml(settings.professionalTitle)}</p>` : ""}${settings.licenseNumber ? `<p class="tpl-sidebar-license">رقم التسجيل <span dir="ltr">${escapeHtml(settings.licenseNumber)}</span></p>` : ""}</div></div><div class="tpl-sidebar-patient-band"></div><div class="tpl-sidebar-patient-label">اسم المريض</div><div class="tpl-sidebar-age-label">العمر :</div><div class="tpl-sidebar-age-line"></div><div class="tpl-sidebar-name-line"></div><div class="tpl-sidebar-date-label">التاريخ :</div><div class="tpl-sidebar-footer"><div class="tpl-sidebar-contact"><span class="tpl-sidebar-icon">☎</span><div class="tpl-sidebar-contact-copy">${settings.phoneNumber ? `<div dir="ltr">${escapeHtml(settings.phoneNumber)}</div>` : ""}${settings.email ? `<div dir="ltr">${escapeHtml(settings.email)}</div>` : ""}</div></div><div class="tpl-sidebar-contact"><span class="tpl-sidebar-icon">●</span><div>${escapeHtml(settings.address || settings.clinicName || "")}</div></div></div></div>`;
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
