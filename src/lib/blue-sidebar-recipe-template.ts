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
  designAgeX: 8.2,
  designAgeY: 13.3,
  designDateX: 8.3,
  designDateY: 22.6,
  designPhoneX: 35,
  designPhoneY: 18,
  designItemsX: 4,
  designItemsY: 29,
  designItemsWidth: 58,
  designItemsHeight: 58,
} as const;

export function buildBlueSidebarQrValue(settings: {
  clinicName?: string | null;
  doctorName: string;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
}): string {
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
