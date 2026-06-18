import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { toUserId } from "@/lib/user-id";
import { loadPrescriptionDocument } from "@/lib/prescription-document-data";
import { fontFamilyCss } from "@/lib/recipe-settings";
import { itemsBoxSize } from "@/components/recipe/prescription-items-box";
import { paperDimensions, paperPageSizeCss } from "@/lib/recipe-paper";
import { resolveImageUrl } from "@/lib/image-url";
import { formatAge, genderLabel } from "@/lib/patient-utils";

type Params = { params: Promise<{ id: string }> };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function medicineLine(item: {
  name: string;
  dosage: string | null;
  quantity: string | null;
  period: string | null;
  timeOfUse: string | null;
}) {
  const parts = [item.dosage, item.quantity, item.period, item.timeOfUse]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part);
  return `<li><strong>${escapeHtml(item.name)}</strong>${parts.length ? ` — ${parts.map(escapeHtml).join(" — ")}` : ""}</li>`;
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.type !== "doctor") {
    redirect("/auth/signin");
  }

  const doctorId = toUserId(session.user.id);
  const { id } = await params;
  const data = await loadPrescriptionDocument(doctorId, Number(id));
  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const s = data.settings;
  const fontCss = fontFamilyCss(s.fontFamily);
  const itemsSize = itemsBoxSize(s);
  const dims = paperDimensions(s.paperSize);
  const designUrl = resolveImageUrl(s.designImagePath);
  const isImageMode = s.designMode === "image" && !!designUrl;

  const itemsHtml = data.items.map(medicineLine).join("");

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
      <div class="pos center" style="left:${s.designDateX}%;top:${s.designDateY}%">${new Date(data.prescriptionDate).toLocaleDateString("ar-SY")} · #${data.prescriptionNumber}</div>
      ${(data.printableFields ?? [])
        .filter((field) => field.value.trim())
        .map(
          (field) =>
            `<div class="pos center" style="left:${field.designX}%;top:${field.designY}%"><strong>${escapeHtml(field.name)}:</strong> ${escapeHtml(field.value)}</div>`
        )
        .join("")}
      <div class="pos items-box" style="left:${s.designItemsX}%;top:${s.designItemsY}%;width:${itemsSize.width}%;height:${itemsSize.height}%">${s.printDiagnosis && data.diagnosis ? `<p><strong>التشخيص:</strong> ${escapeHtml(data.diagnosis)}</p>` : ""}<ol>${itemsHtml}</ol></div>`;

  const classicExtras =
    !isImageMode
      ? `
      ${data.fieldValues
        ?.filter((f) => f.isPrintable !== false && f.value)
        .map(
          (f) =>
            `<p><strong>${escapeHtml(f.name)}:</strong> ${escapeHtml(f.value)}</p>`
        )
        .join("") ?? ""}
      ${data.xrayImage ? `<div style="margin-top:16px"><p><strong>أشعة</strong></p><img class="attach" src="${resolveImageUrl(data.xrayImage)}" alt=""/></div>` : ""}
      ${data.analysisImage ? `<div style="margin-top:16px"><p><strong>تحليل</strong></p><img class="attach" src="${resolveImageUrl(data.analysisImage)}" alt=""/></div>` : ""}`
      : "";

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>وصفة #${data.prescriptionNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    @page { size: ${paperPageSizeCss(s.paperSize)}; margin: 0; }
    body { font-family: ${fontCss}; font-size: ${s.fontSize}px; color: ${s.color}; margin: 0; padding: 0; }
    .wrap { position: relative; width: ${dims.width}; height: ${dims.height}; margin: 0 auto; overflow: hidden; background: white; }
    .bg { position: absolute; inset: 0; opacity: ${s.opacity}; z-index: 0; }
    .bg img { width: 100%; height: 100%; object-fit: fill; }
    .overlay { position: absolute; inset: 0; z-index: 1; }
    header { border-bottom: 1px solid ${s.color}33; padding: 24px; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { max-height: 64px; max-width: 64px; object-fit: contain; }
    ol { padding-right: 20px; margin: 0; }
    .pos { position: absolute; }
    .pos.center { transform: translate(-50%, -50%); }
    .items-box { overflow: hidden; word-break: break-word; overflow-wrap: anywhere; }
    .age-row { display: flex; gap: 12px; }
    img.attach { max-height: 180px; max-width: 100%; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin:12px">
    <button onclick="window.print()">طباعة / حفظ PDF</button>
  </div>
  <div class="wrap">
    ${isImageMode ? `<div class="bg"><img src="${designUrl}" alt=""/></div>` : ""}
    <div class="overlay">${positionedHtml}</div>
    ${
      !isImageMode
        ? `<div style="position:relative;z-index:2;padding:24px">
      <header>
        <div>
          <h1 style="margin:0;font-size:1.25rem">${escapeHtml(s.doctorName)}</h1>
          <p style="margin:4px 0;opacity:.8">${escapeHtml(s.doctorSpecialty)}</p>
          ${s.phoneNumber ? `<small>${escapeHtml(s.phoneNumber)}</small>` : ""}
        </div>
      </header>
      ${classicExtras}
    </div>`
        : ""
    }
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
