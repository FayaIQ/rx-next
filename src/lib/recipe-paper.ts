export function paperDimensions(paperSize: string) {
  return paperSize === "A5"
    ? { width: "148mm", height: "210mm" }
    : { width: "210mm", height: "297mm" };
}

export function paperPageSizeCss(paperSize: string) {
  return paperSize === "A5" ? "A5 portrait" : "A4 portrait";
}
