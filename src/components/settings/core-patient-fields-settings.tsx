"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { rxApi, type RecipeSettingsDto } from "@/lib/api/rx-client";
import { normalizeRecipeSettingsDto, defaultRecipeSettingsForDoctor } from "@/lib/recipe-settings";
import { useLocale } from "@/i18n/locale-provider";

type CoreFieldKeys =
  | "showGender"
  | "showAge"
  | "showPhone"
  | "printName"
  | "printGender"
  | "printAge"
  | "printPhone";

export function CorePatientFieldsTable({
  settings,
  onPatch,
  showPositionHint = false,
}: {
  settings: RecipeSettingsDto;
  onPatch: <K extends CoreFieldKeys>(key: K, value: RecipeSettingsDto[K]) => void;
  showPositionHint?: boolean;
}) {
  const { t } = useLocale();

  return (
    <div className="space-y-3">
      {showPositionHint ? (
        <p className="text-sm text-rx-muted">
          {t("settings.coreHintWithLink")}{" "}
          <Link href="/recipe-settings" className="text-rx-primary hover:underline">
            {t("settings.dragFromDesign")}
          </Link>
          .
        </p>
      ) : (
        <p className="text-sm text-rx-muted">
          {t("settings.coreHintBasic")}{" "}
          <Link href="/recipe-settings" className="text-rx-primary hover:underline">
            {t("settings.setPrintPositions")}
          </Link>
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-rx-border">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-b border-rx-border bg-rx-bg-subtle text-rx-muted">
              <th className="px-3 py-2 text-right font-medium">
                {t("settings.fieldCol")}
              </th>
              <th className="px-3 py-2 text-center font-medium">
                {t("settings.showOnAdd")}
              </th>
              <th className="px-3 py-2 text-center font-medium">
                {t("settings.printOnRx")}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-rx-border/60">
              <td className="px-3 py-2">{t("settings.patientName")}</td>
              <td className="px-3 py-2 text-center">
                <input type="checkbox" checked disabled />
              </td>
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={settings.printName}
                  onChange={(e) => onPatch("printName", e.target.checked)}
                />
              </td>
            </tr>
            <tr className="border-b border-rx-border/60">
              <td className="px-3 py-2">{t("settings.gender")}</td>
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={settings.showGender}
                  onChange={(e) => onPatch("showGender", e.target.checked)}
                />
              </td>
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={settings.printGender}
                  onChange={(e) => onPatch("printGender", e.target.checked)}
                />
              </td>
            </tr>
            <tr className="border-b border-rx-border/60">
              <td className="px-3 py-2">{t("settings.age")}</td>
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={settings.showAge}
                  onChange={(e) => onPatch("showAge", e.target.checked)}
                />
              </td>
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={settings.printAge}
                  onChange={(e) => onPatch("printAge", e.target.checked)}
                />
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2">{t("settings.phone")}</td>
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={settings.showPhone}
                  onChange={(e) => onPatch("showPhone", e.target.checked)}
                />
              </td>
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={settings.printPhone}
                  onChange={(e) => onPatch("printPhone", e.target.checked)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CorePatientFieldsSettings() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<RecipeSettingsDto>(() =>
    defaultRecipeSettingsForDoctor(0)
  );

  const { data } = useQuery({
    queryKey: ["recipe-settings"],
    queryFn: () => rxApi.recipeSettings.get(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (data?.settings) {
      setSettings(normalizeRecipeSettingsDto(data.settings));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (next: RecipeSettingsDto) => rxApi.recipeSettings.update(next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-settings"] });
      toast.success(t("settings.coreFieldsSaved"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function patch<K extends CoreFieldKeys>(key: K, value: RecipeSettingsDto[K]) {
    setSettings((prev) => {
      const next = normalizeRecipeSettingsDto({ ...prev, [key]: value });
      saveMutation.mutate(next);
      return next;
    });
  }

  return <CorePatientFieldsTable settings={settings} onPatch={patch} />;
}
