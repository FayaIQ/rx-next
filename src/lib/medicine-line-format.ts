export type MedicineLineItem = {
  name: string;
  type?: string | null;
  dosage?: string | null;
  quantity?: string | null;
  period?: string | null;
  timeOfUse?: string | null;
};

function cleanPart(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Latin-first segments (name, strength, qty) then Arabic instructions. */
export function splitMedicineLineSegments(item: MedicineLineItem): {
  latin: string[];
  arabic: string[];
} {
  const latin = [
    item.name,
    item.type,
    item.dosage,
    item.quantity,
  ]
    .map(cleanPart)
    .filter((part): part is string => !!part);

  const arabic = [item.period, item.timeOfUse]
    .map(cleanPart)
    .filter((part): part is string => !!part);

  return { latin, arabic };
}

export function formatMedicineLinePlain(item: MedicineLineItem): string {
  const { latin, arabic } = splitMedicineLineSegments(item);
  const latinText = latin.join(" — ");
  const arabicText = arabic.join(" — ");
  if (!arabicText) return latinText;
  if (!latinText) return arabicText;
  return `${latinText} — ${arabicText}`;
}

export function formatMedicineLineHtml(
  item: MedicineLineItem,
  escapeHtml: (text: string) => string
): string {
  const { latin, arabic } = splitMedicineLineSegments(item);
  const latinHtml = latin.map(escapeHtml).join(" — ");
  const arabicHtml = arabic.map(escapeHtml).join(" — ");

  if (!latinHtml) return arabicHtml;
  if (!arabicHtml) {
    return `<bdi dir="ltr" class="med-latin">${latinHtml}</bdi>`;
  }

  return `<bdi dir="ltr" class="med-latin">${latinHtml}</bdi><span class="med-arabic"> — ${arabicHtml}</span>`;
}

export const MEDICINE_LINE_STYLES = `
  .med-list { list-style: none; margin: 0; padding: 0; direction: rtl; text-align: right; }
  .med-list li { margin: 0 0 4px; direction: rtl; text-align: right; }
  .med-latin { unicode-bidi: isolate; direction: ltr; display: inline-block; text-align: left; font-weight: 600; }
  .med-arabic { unicode-bidi: plaintext; }
`;
