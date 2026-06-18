"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { rxApi, type RecipeSettingsDto } from "@/lib/api/rx-client";
import { normalizeRecipeSettingsDto } from "@/lib/recipe-settings";

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
  return (
    <div className="space-y-3">
      {showPositionHint ? (
        <p className="text-sm text-rx-muted">
          تحكّم بظهور الحقول عند إضافة مريض جديد وطباعتها على الوصفة.{" "}
          <Link href="/recipe-settings" className="text-rx-primary hover:underline">
            اسحب موضع كل حقل من تصميم الوصفة
          </Link>
          .
        </p>
      ) : (
        <p className="text-sm text-rx-muted">
          الحقول الأساسية (الاسم، الجنس، العمر، الهاتف) عند إضافة مريض أو طباعة
          الوصفة.{" "}
          <Link href="/recipe-settings" className="text-rx-primary hover:underline">
            ضبط مواقع الطباعة ←
          </Link>
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-rx-border">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-b border-rx-border bg-rx-bg-subtle text-rx-muted">
              <th className="px-3 py-2 text-right font-medium">الحقل</th>
              <th className="px-3 py-2 text-center font-medium">يظهر عند الإضافة</th>
              <th className="px-3 py-2 text-center font-medium">يُطبَع على الوصفة</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-rx-border/60">
              <td className="px-3 py-2">اسم المريض</td>
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
              <td className="px-3 py-2">الجنس</td>
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
              <td className="px-3 py-2">العمر</td>
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
              <td className="px-3 py-2">الهاتف</td>
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
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<RecipeSettingsDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["recipe-settings"],
    queryFn: () => rxApi.recipeSettings.get(),
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
      toast.success("تم حفظ إعدادات الحقول");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function patch<K extends CoreFieldKeys>(key: K, value: RecipeSettingsDto[K]) {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = normalizeRecipeSettingsDto({ ...prev, [key]: value });
      saveMutation.mutate(next);
      return next;
    });
  }

  if (isLoading || !settings) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  return <CorePatientFieldsTable settings={settings} onPatch={patch} />;
}
