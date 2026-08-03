/**
 * Canonical settings for the prescription created during doctor onboarding.
 * Keep this module free of React/client imports so registration and API routes
 * can safely reuse the same field coordinates.
 */
export const ACADEMIC_RECIPE_TEMPLATE_ID = "academic" as const;

/** Coordinates shipped with the first academic template release. */
export const ACADEMIC_RECIPE_TEMPLATE_LAYOUT_V1 = {
  designPatientX: 67,
  designPatientY: 24.5,
  designAgeX: 39,
  designAgeY: 24.5,
  designDateX: 15,
  designDateY: 24.5,
} as const;

export const ACADEMIC_RECIPE_TEMPLATE_DEFAULTS = {
  designMode: "design",
  designTemplate: ACADEMIC_RECIPE_TEMPLATE_ID,
  paperSize: "A5",
  fontSize: "17",
  color: "#075985",
  designPatientX: 69.5,
  designPatientY: 24.55,
  designAgeX: 41,
  designAgeY: 24.55,
  designDateX: 17,
  designDateY: 24.55,
  designPhoneX: 50,
  designPhoneY: 27,
  designItemsX: 8,
  designItemsY: 28.5,
  designItemsWidth: 84,
  designItemsHeight: 62,
} as const;
