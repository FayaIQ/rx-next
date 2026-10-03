import { FDI_ALL, type ToothFdi } from "./constants";

export type ToothTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
};
export type ToothKind = "molar" | "premolar" | "canine" | "incisor";

/** Permanent dentition only. ADA ISO mapping: units 1–2 incisors, 3 canine,
 * 4–5 premolars, 6–8 molars. Quadrants are from the patient's perspective.
 * https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/publications/cdt/ada_utds_value_set_v1_2022_aug.pdf
 */
export function getToothKind(fdi: number): ToothKind {
  if (!(FDI_ALL as readonly number[]).includes(fdi)) throw new Error("Invalid permanent FDI tooth");
  const unit = fdi % 10;
  if (unit >= 6) return "molar";
  if (unit >= 4) return "premolar";
  return unit === 3 ? "canine" : "incisor";
}

/** Schematic crown dimensions and arch coordinates, not patient anatomy. */
export const TOOTH_TRANSFORMS = Object.fromEntries(FDI_ALL.map((fdi) => {
  const quadrant = Math.floor(fdi / 10);
  const unit = fdi % 10;
  const upper = quadrant <= 2;
  // Frontal view: patient right is screen left; no model rotation/mirroring.
  const side = quadrant === 1 || quadrant === 4 ? -1 : 1;
  const step = unit - 1;
  const kind = getToothKind(fdi);
  const size: [number, number, number] = kind === "molar" ? [0.26, 0.25, 0.28]
    : kind === "premolar" ? [0.22, 0.27, 0.24]
    : kind === "canine" ? [0.18, 0.32, 0.19] : [unit === 1 && upper ? 0.2 : 0.16, 0.28, 0.13];
  return [fdi, {
    position: [side * (0.12 + 0.26 * step), upper ? 0.36 : -0.36, 0.8 - 0.035 * step * step],
    rotation: [0, side * Math.atan(0.27 * step), 0],
    size,
  } satisfies ToothTransform];
})) as Record<ToothFdi, ToothTransform>;
