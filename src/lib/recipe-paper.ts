export const PAPER_SIZE_IDS = ["A4", "A5", "A5_LANDSCAPE"] as const;

export type PaperSizeId = (typeof PAPER_SIZE_IDS)[number];

export function normalizePaperSize(paperSize: string | null | undefined): PaperSizeId {
  return PAPER_SIZE_IDS.includes(paperSize as PaperSizeId)
    ? (paperSize as PaperSizeId)
    : "A4";
}

export function paperDimensions(paperSize: string) {
  switch (normalizePaperSize(paperSize)) {
    case "A5":
      return { width: "148mm", height: "210mm" };
    case "A5_LANDSCAPE":
      return { width: "210mm", height: "148mm" };
    default:
      return { width: "210mm", height: "297mm" };
  }
}

export function paperDimensionsMm(paperSize: string) {
  switch (normalizePaperSize(paperSize)) {
    case "A5":
      return { width: 148, height: 210 };
    case "A5_LANDSCAPE":
      return { width: 210, height: 148 };
    default:
      return { width: 210, height: 297 };
  }
}

export function paperPageSizeCss(paperSize: string) {
  switch (normalizePaperSize(paperSize)) {
    case "A5":
      return "A5 portrait";
    case "A5_LANDSCAPE":
      return "A5 landscape";
    default:
      return "A4 portrait";
  }
}
