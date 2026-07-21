"use client";

import { PositionedPrescriptionBlocks } from "@/components/prescription/positioned-prescription-blocks";
import { PrescriptionSystemCredit } from "@/components/prescription/prescription-system-credit";
import { PrescriptionTemplateShell } from "@/components/prescription/prescription-template-shell";
import type { RecipeSettingsDto } from "@/lib/recipe-settings";
import { fontFamilyCss } from "@/lib/recipe-settings";
import { paperDimensions } from "@/lib/recipe-paper";
import { resolveImageUrl } from "@/lib/image-url";
import { useLocale } from "@/i18n/locale-provider";

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
  hideDesignBackground = false,
}: {
  data: PrescriptionDocumentData;
  className?: string;
  /** Hide content blocks — recipe editor renders draggable overlays instead */
  editorMode?: boolean;
  /** Omit background image / template chrome (pre-printed paper). */
  hideDesignBackground?: boolean;
}) {
  const { t, dir } = useLocale();
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
  const showBackground = !hideDesignBackground;

  return (
    <article
      className={`prescription-doc relative mx-auto overflow-hidden bg-white shadow-sm ${className}`}
      dir={dir}
      data-paper-size={s.paperSize}
      data-hide-design-bg={hideDesignBackground ? "1" : undefined}
      style={{
        width: dims.width,
        height: dims.height,
        minHeight: dims.height,
        color,
        fontFamily: fontCss,
        fontSize,
      }}
    >
      {showBackground && isImageMode && (
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

      {showBackground && !isImageMode && (
        <PrescriptionTemplateShell settings={s} logoUrl={logoUrl} />
      )}

      {!editorMode && (
        <div className="absolute inset-0 z-10">
          <PositionedPrescriptionBlocks data={data} settings={s} />
        </div>
      )}

      {!editorMode && <PrescriptionSystemCredit color={color} />}

      {showBackground && !isImageMode && !editorMode && (xrayUrl || analysisUrl) && (
        <div className="relative z-20 mt-auto flex h-full flex-col justify-end p-6">
          <section className="grid gap-4 border-t pt-4 sm:grid-cols-2" style={{ borderColor: `${color}33` }}>
            {xrayUrl && (
              <div>
                <p className="mb-1 text-sm font-semibold">{t("home.xrayImage")}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={xrayUrl}
                  alt={t("home.xray")}
                  className="max-h-48 rounded border object-contain"
                />
              </div>
            )}
            {analysisUrl && (
              <div>
                <p className="mb-1 text-sm font-semibold">{t("home.analysisImage")}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={analysisUrl}
                  alt={t("home.analysis")}
                  className="max-h-48 rounded border object-contain"
                />
              </div>
            )}
          </section>
        </div>
      )}
    </article>
  );
}
