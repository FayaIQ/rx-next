/** Generic landscape template with a doctor profile sidebar. */
export const BLUE_SIDEBAR_RECIPE_TEMPLATE_ID = "sidebar_blue" as const;

export const BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS = {
  designMode: "design",
  designTemplate: BLUE_SIDEBAR_RECIPE_TEMPLATE_ID,
  paperSize: "A5_LANDSCAPE",
  fontSize: "15",
  color: "#182a79",
  designPatientX: 40,
  designPatientY: 13.3,
  designAgeX: 14,
  designAgeY: 13.3,
  designDateX: 8.7,
  designDateY: 22.6,
  designPhoneX: 35,
  designPhoneY: 18,
  designItemsX: 4,
  designItemsY: 29,
  designItemsWidth: 58,
  designItemsHeight: 58,
} as const;

const LEGACY_BLUE_SIDEBAR_CORE_POSITIONS = {
  designPatientX: 40,
  designPatientY: 13.3,
  designAgeX: 8.2,
  designAgeY: 13.3,
  designDateX: 8.3,
  designDateY: 22.6,
} as const;

type BlueSidebarCorePositions = {
  designPatientX: number;
  designPatientY: number;
  designAgeX: number;
  designAgeY: number;
  designDateX: number;
  designDateY: number;
};

/**
 * Keeps existing prescriptions on the corrected preset without overwriting a
 * layout that the doctor has deliberately moved in the editor.
 */
export function resolveBlueSidebarCorePositions(
  settings: BlueSidebarCorePositions
): BlueSidebarCorePositions {
  const stillUsesLegacyPreset = Object.entries(
    LEGACY_BLUE_SIDEBAR_CORE_POSITIONS
  ).every(([key, value]) => settings[key as keyof BlueSidebarCorePositions] === value);

  if (!stillUsesLegacyPreset) return settings;

  return {
    designPatientX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designPatientX,
    designPatientY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designPatientY,
    designAgeX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designAgeX,
    designAgeY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designAgeY,
    designDateX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designDateX,
    designDateY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designDateY,
  };
}

export function buildBlueSidebarQrValue(settings: {
  clinicName?: string | null;
  doctorName: string;
  qrValue?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
}): string {
  const customValue = settings.qrValue?.trim();
  if (customValue) return customValue;

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${settings.doctorName}`,
    settings.clinicName ? `ORG:${settings.clinicName}` : null,
    settings.phoneNumber ? `TEL:${settings.phoneNumber}` : null,
    settings.email ? `EMAIL:${settings.email}` : null,
    settings.address ? `ADR:;;${settings.address};;;;` : null,
    "END:VCARD",
  ];

  return lines.filter(Boolean).join("\n");
}
