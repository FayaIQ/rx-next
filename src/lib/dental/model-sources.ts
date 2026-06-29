/** Self-hosted anatomical GLB (optional). Place Dundee GLB here when available. */
export const ANATOMICAL_MODEL_PATH = "/models/dental/permanent-dentition.glb";

/** Interactive chart model (Poly by Google Teeth). */
export const INTERACTIVE_MODEL_PATH = "/models/dental/teeth-set.glb";

export const DUNDEE_PERMANENT_DENTITION = {
  sketchfabUrl:
    "https://sketchfab.com/3d-models/permanent-dentition-2f69d7b59c3e4a6a8bcae041bd8e591b",
  attribution:
    "Permanent Dentition — University of Dundee, School of Dentistry (CC BY)",
} as const;

export type DentalViewMode = "anatomical" | "interactive";

export const DENTAL_VIEW_MODE_LABELS: Record<DentalViewMode, string> = {
  anatomical: "تشريحي (CT)",
  interactive: "تفاعلي (تسجيل)",
};
