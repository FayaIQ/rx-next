import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { redirect } from "next/navigation";
import { loadPrescriptionDocument } from "@/lib/prescription-document-data";
import { fontFamilyCss } from "@/lib/recipe-settings";
import { getRecipeFontsCss } from "@/lib/recipe-fonts-server";
import {
  templatePrintHeaderHtml,
  templatePrintStyles,
} from "@/lib/recipe-templates";
import { itemsBoxSize } from "@/components/recipe/prescription-items-box";
import { paperDimensions, paperPageSizeCss } from "@/lib/recipe-paper";
import { resolveImageUrl } from "@/lib/image-url";
import { formatAge, formatPrescriptionDate, genderLabel } from "@/lib/patient-utils";

type Params = { params: Promise<{ id: string }> };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

import {
  formatMedicineLineHtml,
  MEDICINE_LINE_STYLES,
  type MedicineLineItem,
} from "@/lib/medicine-line-format";

export async function GET(req: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) {
    redirect("/auth/signin");
  }

  const doctorId = ctx.doctorId;
  const { id } = await params;
  const data = await loadPrescriptionDocument(doctorId, Number(id));
  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const s = data.settings;
  const origin = new URL(req.url).origin;
  const fontFacesCss = getRecipeFontsCss(origin);
  const fontCss = fontFamilyCss(s.fontFamily);
  const itemsSize = itemsBoxSize(s);
  const dims = paperDimensions(s.paperSize);
  const designUrl = resolveImageUrl(s.designImagePath, { origin });
  const logoUrl = resolveImageUrl(s.logoPath, { origin });
  const isImageMode = s.designMode === "image" && !!designUrl;
  const templateId = s.designTemplate ?? "classic";

  const itemsHtml = data.items
    .map(
      (item, index) =>
        `<li><span class="med-num">${index + 1}.</span> ${formatMedicineLineHtml(item as MedicineLineItem, escapeHtml)}</li>`
    )
    .join("");

  const ageGenderHtml =
    s.printAge || s.printGender
      ? `<div class="pos center" style="left:${s.designAgeX}%;top:${s.designAgeY}%">${s.printAge && data.patientBirthdate ? `<span>${formatAge(data.patientBirthdate)}</span>` : ""}${s.printGender ? `<span>${genderLabel(data.patientGender as "male" | "female")}</span>` : ""}</div>`
      : "";

  const phoneHtml =
    s.printPhone && data.patientPhone
      ? `<div class="pos center" style="left:${s.designPhoneX}%;top:${s.designPhoneY}%" dir="ltr">${escapeHtml(data.patientPhone)}</div>`
      : "";

  const positionedHtml = `
      ${s.printName ? `<div class="pos center" style="left:${s.designPatientX}%;top:${s.designPatientY}%">${escapeHtml(data.patientName)}</div>` : ""}
      ${ageGenderHtml}
      ${phoneHtml}
      <div class="pos center" style="left:${s.designDateX}%;top:${s.designDateY}%">${formatPrescriptionDate(data.prescriptionDate)}</div>
      ${(data.printableFields ?? [])
        .filter((field) => field.value.trim())
        .map(
          (field) =>
            `<div class="pos center" style="left:${field.designX}%;top:${field.designY}%">${isImageMode ? escapeHtml(field.value) : `<strong>${escapeHtml(field.name)}:</strong> ${escapeHtml(field.value)}`}</div>`
        )
        .join("")}
      <div class="pos items-box" style="left:${s.designItemsX}%;top:${s.designItemsY}%;width:${itemsSize.width}%;height:${itemsSize.height}%">${s.printDiagnosis && data.diagnosis ? `<p><strong>التشخيص:</strong> ${escapeHtml(data.diagnosis)}</p>` : ""}<ol class="med-list">${itemsHtml}</ol></div>`;

  const classicExtras =
    !isImageMode
      ? `
      ${data.xrayImage ? `<div style="position:relative;z-index:2;margin-top:16px;padding:0 24px"><p><strong>أشعة</strong></p><img class="attach" src="${resolveImageUrl(data.xrayImage, { origin })}" alt=""/></div>` : ""}
      ${data.analysisImage ? `<div style="position:relative;z-index:2;margin-top:16px;padding:0 24px"><p><strong>تحليل</strong></p><img class="attach" src="${resolveImageUrl(data.analysisImage, { origin })}" alt=""/></div>` : ""}`
      : "";

  const templateShell = !isImageMode
    ? templatePrintHeaderHtml(templateId, s, logoUrl, escapeHtml)
    : "";

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>وصفة #${data.prescriptionNumber}</title>
  <style>
    ${fontFacesCss}
    @page { size: ${paperPageSizeCss(s.paperSize)}; margin: 0; }
    body { font-family: ${fontCss}; font-size: ${s.fontSize}px; color: ${s.color}; margin: 0; padding: 0; }
    .wrap { position: relative; width: ${dims.width}; height: ${dims.height}; margin: 0 auto; overflow: hidden; background: white; }
    .bg { position: absolute; inset: 0; opacity: ${s.opacity}; z-index: 0; }
    .bg img { width: 100%; height: 100%; object-fit: fill; }
    .overlay { position: absolute; inset: 0; z-index: 1; }
    header { border-bottom: 1px solid ${s.color}33; padding: 24px; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { max-height: 64px; max-width: 64px; object-fit: contain; }
    ol { padding-right: 20px; margin: 0; }
    .med-num { font-family: ui-monospace, monospace; margin-left: 6px; }
    ${MEDICINE_LINE_STYLES}
    .pos { position: absolute; }
    .pos.center { transform: translate(-50%, -50%); }
    .items-box { overflow: hidden; word-break: break-word; overflow-wrap: anywhere; }
    .age-row { display: flex; gap: 12px; }
    img.attach { max-height: 180px; max-width: 100%; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; }
    ${!isImageMode ? templatePrintStyles(templateId, s.color) : ""}
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin:12px">
    <button onclick="window.print()">طباعة / حفظ PDF</button>
  </div>
  <div class="wrap">
    ${isImageMode ? `<div class="bg"><img src="${designUrl}" alt=""/></div>` : templateShell}
    <div class="overlay">${positionedHtml}</div>
    ${classicExtras}
  </div>
  <script>setTimeout(()=>window.print(),600)</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="prescription-${data.prescriptionNumber}.html"`,
    },
  });
}
