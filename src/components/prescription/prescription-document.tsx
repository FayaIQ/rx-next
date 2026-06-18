import { PositionedPrescriptionBlocks } from "@/components/prescription/positioned-prescription-blocks";
import type { RecipeSettingsDto } from "@/lib/recipe-settings";
import { fontFamilyCss } from "@/lib/recipe-settings";
import { paperDimensions } from "@/lib/recipe-paper";
import { resolveImageUrl } from "@/lib/image-url";

export type PrescriptionDocumentData = {
  prescriptionNumber: number;
  prescriptionDate: string;
  diagnosis: string | null;
  patientName: string;
  patientGender: string;
  patientBirthdate: string | null;
  patientPhone?: string | null;
  items: Array<{
    id: number;
    name: string;
    type?: string | null;
    dosage: string | null;
    quantity: string | null;
    period: string | null;
    timeOfUse: string | null;
  }>;
  fieldValues?: Array<{
    name: string;
    value: string;
    isPrintable?: boolean;
  }>;
  printableFields?: Array<{
    id: number;
    name: string;
    value: string;
    designX: number;
    designY: number;
    size: "larg" | "medium" | "small";
  }>;
  xrayImage?: string | null;
  analysisImage?: string | null;
  settings: RecipeSettingsDto;
};

export function PrescriptionDocument({
  data,
  className = "",
  editorMode = false,
}: {
  data: PrescriptionDocumentData;
  className?: string;
  /** Hide content blocks — recipe editor renders draggable overlays instead */
  editorMode?: boolean;
}) {
  const s = data.settings;
  const fontCss = fontFamilyCss(s.fontFamily);
  const fontSize = `${s.fontSize}px`;
  const color = s.color;
  const dims = paperDimensions(s.paperSize);
  const logoUrl = resolveImageUrl(s.logoPath);
  const designUrl = resolveImageUrl(s.designImagePath);
  const xrayUrl = resolveImageUrl(data.xrayImage);
  const analysisUrl = resolveImageUrl(data.analysisImage);
  const isImageMode = s.designMode === "image" && !!designUrl;

  const printableFields =
    data.fieldValues?.filter((f) => f.isPrintable !== false && f.value) ?? [];

  return (
    <article
      className={`prescription-doc relative mx-auto overflow-hidden bg-white shadow-sm ${className}`}
      dir="rtl"
      data-paper-size={s.paperSize}
      style={{
        width: dims.width,
        height: dims.height,
        minHeight: dims.height,
        color,
        fontFamily: fontCss,
        fontSize,
      }}
    >
      {isImageMode && (
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={designUrl}
            alt=""
            className="h-full w-full object-fill"
            style={{ opacity: s.opacity }}
          />
        </div>
      )}

      {!editorMode && (
        <div className="absolute inset-0 z-10">
          <PositionedPrescriptionBlocks data={data} settings={s} />
        </div>
      )}

      {!isImageMode && !editorMode && (
        <div className="relative z-20 flex h-full flex-col p-6">
          <header
            className="mb-4 border-b pb-4"
            style={{ borderColor: `${color}33` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-xl font-bold">{s.doctorName}</h1>
                <p className="text-sm opacity-80">{s.doctorSpecialty}</p>
                {s.additionalText1 && (
                  <p className="text-xs opacity-70">{s.additionalText1}</p>
                )}
                <div className="flex flex-wrap gap-x-4 text-xs opacity-70">
                  {s.phoneNumber && <span>{s.phoneNumber}</span>}
                  {s.email && <span>{s.email}</span>}
                  {s.address && <span>{s.address}</span>}
                </div>
              </div>
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="شعار"
                  className="h-16 w-16 object-contain"
                />
              )}
            </div>
          </header>

          {printableFields.length > 0 && (
            <section className="mb-4 grid gap-1 text-sm sm:grid-cols-2">
              {printableFields.map((f) => (
                <p key={f.name}>
                  <strong>{f.name}:</strong> {f.value}
                </p>
              ))}
            </section>
          )}

          {(xrayUrl || analysisUrl) && (
            <section className="mt-auto grid gap-4 border-t pt-4 sm:grid-cols-2">
              {xrayUrl && (
                <div>
                  <p className="mb-1 text-sm font-semibold">صورة الأشعة</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={xrayUrl}
                    alt="أشعة"
                    className="max-h-48 rounded border object-contain"
                  />
                </div>
              )}
              {analysisUrl && (
                <div>
                  <p className="mb-1 text-sm font-semibold">صورة التحليل</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={analysisUrl}
                    alt="تحليل"
                    className="max-h-48 rounded border object-contain"
                  />
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </article>
  );
}
