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
  data: Pick<PrescriptionDocumentData, "diagnosis" | "items">;
  settings: Pick<
    RecipeSettingsDto,
    "printDiagnosis" | "designImagePath"
  >;
}) {
  const { t } = useLocale();
  const usesPublicDemoBackground =
    settings.designImagePath === PUBLIC_DEMO_PRESCRIPTION_BACKGROUND;

  return (
    <div dir="ltr" className="text-left">
      {!usesPublicDemoBackground &&
        settings.printDiagnosis &&
        data.diagnosis && (
        <p
          className="mb-1 text-left"
          dir="ltr"
        >
          <strong>{t("recipe.diagnosis")} </strong>
          {data.diagnosis}
        </p>
      )}
      <div className="flex min-w-0 items-start gap-[0.65em]">
        <span
          aria-hidden="true"
          className="mt-[0.08em] inline-flex shrink-0 select-none items-start font-serif leading-none"
          style={{
            fontFamily: '"Times New Roman", Georgia, serif',
            fontSize: "3em",
          }}
        >
          <span>R</span>
          <span className="mt-[1.05em] -ms-[0.08em] text-[0.38em] italic">
            x
          </span>
        </span>
        <MedicineLineList
          items={data.items}
          className="min-w-0 flex-1 list-none space-y-0.5 p-0 text-left"
        />
      </div>
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
