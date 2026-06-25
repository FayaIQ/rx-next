import type { ToothFdi } from "@/lib/dental/constants";
import {
  FDI_LOWER_LEFT,
  FDI_LOWER_RIGHT,
  FDI_UPPER_LEFT,
  FDI_UPPER_RIGHT,
} from "@/lib/dental/constants";

export type ToothTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
};

export type ToothKind = "molar" | "premolar" | "canine" | "incisor";

export function getToothKind(fdi: number): ToothKind {
  const unit = fdi % 10;
  if (unit >= 6) return "molar";
  if (unit >= 4) return "premolar";
  if (unit === 3) return "canine";
  return "incisor";
}

const TOOTH_SIZE: Record<ToothKind, [number, number, number]> = {
  molar: [0.3, 0.24, 0.22],
  premolar: [0.22, 0.22, 0.18],
  canine: [0.18, 0.3, 0.17],
  incisor: [0.16, 0.28, 0.14],
};

function layoutArch(
  ordered: readonly number[],
  y: number,
  arch: "upper" | "lower"
): Record<number, ToothTransform> {
  const result: Record<number, ToothTransform> = {};
  const count = ordered.length;

  ordered.forEach((fdi, index) => {
    const t = index / Math.max(count - 1, 1);
    const angle = Math.PI - t * Math.PI;
    const x = Math.cos(angle) * 1.12;
    const z = Math.sin(angle) * 0.42 + 0.18;
    const kind = getToothKind(fdi);
    const size = TOOTH_SIZE[kind];
    const edgeTilt = (t - 0.5) * 0.55;
    const pitch = arch === "upper" ? -0.22 - Math.abs(edgeTilt) * 0.12 : 0.22 + Math.abs(edgeTilt) * 0.12;

    result[fdi] = {
      position: [x, y, z],
      rotation: [pitch, (angle - Math.PI / 2) * 0.28, 0],
      size,
    };
  });

  return result;
}

const UPPER_ORDER = [...FDI_UPPER_RIGHT, ...FDI_UPPER_LEFT] as const;
const LOWER_ORDER = [
  ...[...FDI_LOWER_RIGHT].reverse(),
  ...[...FDI_LOWER_LEFT].reverse(),
] as const;

const UPPER = layoutArch(UPPER_ORDER, 0.34, "upper");
const LOWER = layoutArch(LOWER_ORDER, -0.34, "lower");

export const TOOTH_TRANSFORMS: Record<ToothFdi, ToothTransform> = {
  ...UPPER,
  ...LOWER,
} as Record<ToothFdi, ToothTransform>;
