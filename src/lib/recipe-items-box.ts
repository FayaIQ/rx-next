import type { RecipeSettingsDto } from "@/lib/recipe-settings";

export const DEFAULT_ITEMS_BOX_WIDTH = 84;
export const DEFAULT_ITEMS_BOX_HEIGHT = 45;

export function itemsBoxSize(settings: RecipeSettingsDto) {
  return {
    width: Math.min(92, Math.max(25, settings.designItemsWidth ?? DEFAULT_ITEMS_BOX_WIDTH)),
    height: Math.min(80, Math.max(15, settings.designItemsHeight ?? DEFAULT_ITEMS_BOX_HEIGHT)),
  };
}
