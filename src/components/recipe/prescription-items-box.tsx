import type { PrescriptionDocumentData } from "@/components/prescription/prescription-document";
import type { RecipeSettingsDto } from "@/lib/recipe-settings";

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
  settings: Pick<RecipeSettingsDto, "printDiagnosis">;
}) {
  return (
    <>
      {settings.printDiagnosis && data.diagnosis && (
        <p className="mb-1">
          <strong>التشخيص:</strong> {data.diagnosis}
        </p>
      )}
      <ol className="list-decimal pr-4">
        {data.items.map((item) => {
          const details = [item.dosage, item.quantity, item.period, item.timeOfUse]
            .map((part) => part?.trim())
            .filter(Boolean);
          return (
            <li key={item.id}>
              <span className="font-medium">{item.name}</span>
              {details.length > 0 && ` — ${details.join(" — ")}`}
            </li>
          );
        })}
      </ol>
    </>
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
