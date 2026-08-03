"use client";

import type { PrescriptionDocumentData } from "@/components/prescription/prescription-document";
import type { RecipeSettingsDto } from "@/lib/recipe-settings";
import { MedicineLineList } from "@/components/prescription/medicine-line";
import { useLocale } from "@/i18n/locale-provider";
import { PUBLIC_DEMO_PRESCRIPTION_BACKGROUND } from "@/lib/demo/constants";

export const DEFAULT_ITEMS_BOX_WIDTH = 84;
export const DEFAULT_ITEMS_BOX_HEIGHT = 45;

export function itemsBoxSize(settings: RecipeSettingsDto) {
  return {
    width: Math.min(92, Math.max(25, settings.designItemsWidth ?? DEFAULT_ITEMS_BOX_WIDTH)),
    height: Math.min(80, Math.max(15, settings.designItemsHeight ?? DEFAULT_ITEMS_BOX_HEIGHT)),
  };
}

export function PrescriptionItemsContent({
  data,
  settings,
}: {
  data: Pick<
    PrescriptionDocumentData,
    "diagnosis" | "documentKind" | "messageText" | "items"
  >;
  settings: Pick<
    RecipeSettingsDto,
    "printDiagnosis" | "designImagePath" | "designTemplate"
  >;
}) {
  const { t } = useLocale();
  const usesPublicDemoBackground =
    settings.designImagePath === PUBLIC_DEMO_PRESCRIPTION_BACKGROUND;
  const isAcademicTemplate = settings.designTemplate === "academic";

  return (
    <div
      dir={isAcademicTemplate ? "rtl" : "ltr"}
      className={isAcademicTemplate ? "text-right" : "text-left"}
    >
      {!usesPublicDemoBackground &&
        settings.printDiagnosis &&
        data.diagnosis && (
        <p
          className={isAcademicTemplate ? "mb-2 text-right" : "mb-1 text-left"}
          dir={isAcademicTemplate ? "rtl" : "ltr"}
        >
          <strong>{t("recipe.diagnosis")} </strong>
          {data.diagnosis}
        </p>
      )}
      {data.documentKind === "message" ? (
        <p
          className="whitespace-pre-wrap break-words text-start leading-relaxed [overflow-wrap:anywhere]"
          dir="auto"
        >
          {data.messageText}
        </p>
      ) : (
        <div
          className={
            isAcademicTemplate
              ? "min-w-0 text-left"
              : "flex min-w-0 items-start gap-[0.65em]"
          }
          dir="ltr"
        >
          <span
            aria-hidden="true"
            className={
              isAcademicTemplate
                ? "block w-max select-none font-black leading-none"
                : "mt-[0.08em] inline-flex shrink-0 select-none items-start font-black leading-none"
            }
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "2.1em",
              letterSpacing: "-0.06em",
            }}
          >
            RX
          </span>
          <MedicineLineList
            items={data.items}
            className={
              isAcademicTemplate
                ? "mt-[0.65em] min-w-0 list-none space-y-0.5 p-0 text-left"
                : "min-w-0 flex-1 list-none space-y-0.5 p-0 text-left"
            }
          />
        </div>
      )}
    </div>
  );
}

export function itemsBoxStyle(settings: RecipeSettingsDto) {
  const { width, height } = itemsBoxSize(settings);
  return {
    left: `${settings.designItemsX}%`,
    top: `${settings.designItemsY}%`,
    width: `${width}%`,
    height: `${height}%`,
  } as const;
}
