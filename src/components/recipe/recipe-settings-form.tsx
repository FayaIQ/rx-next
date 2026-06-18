"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageContent } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrescriptionDocumentData } from "@/components/prescription/prescription-document";
import { RecipePreviewEditor } from "@/components/recipe/recipe-preview-editor";
import type { PositionKey } from "@/components/recipe/draggable-block";
import {
  DEFAULT_ITEMS_BOX_HEIGHT,
  DEFAULT_ITEMS_BOX_WIDTH,
} from "@/components/recipe/prescription-items-box";
import { rxApi, type RecipeSettingsDto } from "@/lib/api/rx-client";
import { FONT_OPTIONS, PAPER_OPTIONS, normalizeRecipeSettingsDto } from "@/lib/recipe-settings";
import { sampleFieldValue } from "@/lib/patient-field-layout";
import { resolveImageUrl } from "@/lib/image-url";
import { CorePatientFieldsTable } from "@/components/settings/core-patient-fields-settings";

const DEFAULT_PREVIEW: PrescriptionDocumentData = {
  prescriptionNumber: 1,
  prescriptionDate: new Date().toISOString(),
  diagnosis: "التهاب حلق حاد",
  patientName: "أحمد محمد",
  patientGender: "male",
  patientBirthdate: new Date(1990, 0, 1).toISOString(),
  patientPhone: "0991234567",
  items: [
    {
      id: 1,
      name: "Amoxicillin",
      dosage: "500mg",
      quantity: "1",
      period: "7 أيام",
      timeOfUse: "بعد الأكل",
    },
  ],
  settings: {
    id: 0,
    doctorId: 0,
    doctorName: "د. محمد",
    doctorSpecialty: "طب عام",
    additionalText1: null,
    phoneNumber: null,
    email: null,
    address: null,
    fontFamily: "Cairo",
    fontSize: "14",
    opacity: 0.2,
    paperSize: "A4",
    color: "#117e65",
    logoPath: null,
    designImagePath: null,
    designMode: "design",
    designImageScale: 1,
    designPatientX: 8,
    designPatientY: 6,
    designAgeX: 38,
    designAgeY: 1,
    designDateX: 46,
    designDateY: 1,
    designItemsX: 8,
    designItemsY: 15,
    designItemsWidth: DEFAULT_ITEMS_BOX_WIDTH,
    designItemsHeight: DEFAULT_ITEMS_BOX_HEIGHT,
    showGender: true,
    showAge: true,
    showPhone: true,
    printName: true,
    printAge: true,
    printGender: true,
    printPhone: false,
    printDiagnosis: true,
    designPhoneX: 88,
    designPhoneY: 42,
  },
};

function positionPatch(
  key: PositionKey,
  x: number,
  y: number
): Partial<RecipeSettingsDto> {
  switch (key) {
    case "patient":
      return { designPatientX: x, designPatientY: y };
    case "ageGender":
      return { designAgeX: x, designAgeY: y };
    case "phone":
      return { designPhoneX: x, designPhoneY: y };
    case "date":
      return { designDateX: x, designDateY: y };
    case "items":
      return { designItemsX: x, designItemsY: y };
  }
}

export function RecipeSettingsForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RecipeSettingsDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["recipe-settings"],
    queryFn: () => rxApi.recipeSettings.get(),
  });

  const { data: fieldsData } = useQuery({
    queryKey: ["fields"],
    queryFn: () => rxApi.fields.list(),
  });

  const [fieldPositions, setFieldPositions] = useState<
    Record<number, { designX: number; designY: number }>
  >({});

  useEffect(() => {
    if (data?.settings) setForm(normalizeRecipeSettingsDto(data.settings));
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form) throw new Error("لا توجد بيانات");
      return rxApi.recipeSettings.update(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-settings"] });
      toast.success("تم حفظ إعدادات الوصفة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ kind, file }: { kind: "logo" | "design"; file: File }) =>
      rxApi.recipeSettings.upload(kind, file),
    onSuccess: (res) => {
      setForm(res.settings);
      queryClient.invalidateQueries({ queryKey: ["recipe-settings"] });
      toast.success("تم رفع الصورة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function patch<K extends keyof RecipeSettingsDto>(
    key: K,
    value: RecipeSettingsDto[K]
  ) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handlePositionChange(key: PositionKey, x: number, y: number) {
    setForm((prev) => (prev ? { ...prev, ...positionPatch(key, x, y) } : prev));
  }

  function handleItemsSizeChange(width: number, height: number) {
    setForm((prev) =>
      prev
        ? { ...prev, designItemsWidth: width, designItemsHeight: height }
        : prev
    );
  }

  function handleFieldPositionChange(fieldId: number, x: number, y: number) {
    setFieldPositions((prev) => ({
      ...prev,
      [fieldId]: { designX: x, designY: y },
    }));
    void rxApi.fields.updatePosition(fieldId, x, y).then(() => {
      queryClient.invalidateQueries({ queryKey: ["fields"] });
    });
  }

  if (isLoading || !form) {
    return (
      <>
        <AppHeader title="تصميم الوصفة" />
        <PageContent>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </PageContent>
      </>
    );
  }

  const printableRecipeFields =
    fieldsData?.fields.filter((f) => !f.isPersonal && f.isPrintable) ?? [];

  const previewData: PrescriptionDocumentData = {
    ...DEFAULT_PREVIEW,
    settings: form,
    printableFields: printableRecipeFields.map((field) => {
      const override = fieldPositions[field.id];
      return {
        id: field.id,
        name: field.name,
        value: sampleFieldValue(field.name),
        designX: override?.designX ?? field.designX ?? 88,
        designY: override?.designY ?? field.designY ?? 26,
        size: field.size,
      };
    }),
  };

  return (
    <>
      <AppHeader title="تصميم الوصفة" subtitle="خصّص شكل وطباعة الوصفة" />
      <PageContent wide className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save size={16} />
            حفظ
          </Button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          {/* Preview — always visible, sticky on desktop */}
          <div className="xl:sticky xl:top-4 xl:self-start">
            <RecipePreviewEditor
              data={previewData}
              onPositionChange={handlePositionChange}
              onItemsSizeChange={handleItemsSizeChange}
              onFieldPositionChange={handleFieldPositionChange}
            />
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <Card hover>
              <CardHeader>
                <CardTitle>بيانات الطبيب</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="space-y-1">
                  <Label>اسم الطبيب</Label>
                  <Input
                    value={form.doctorName}
                    onChange={(e) => patch("doctorName", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>التخصص</Label>
                  <Input
                    value={form.doctorSpecialty}
                    onChange={(e) => patch("doctorSpecialty", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>نص إضافي</Label>
                  <Textarea
                    rows={2}
                    value={form.additionalText1 ?? ""}
                    onChange={(e) =>
                      patch("additionalText1", e.target.value || null)
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>الهاتف</Label>
                    <Input
                      value={form.phoneNumber ?? ""}
                      onChange={(e) =>
                        patch("phoneNumber", e.target.value || null)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>البريد</Label>
                    <Input
                      type="email"
                      value={form.email ?? ""}
                      onChange={(e) => patch("email", e.target.value || null)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>العنوان</Label>
                  <Input
                    value={form.address ?? ""}
                    onChange={(e) => patch("address", e.target.value || null)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card hover>
              <CardHeader>
                <CardTitle>المظهر</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>الخط</Label>
                  <select
                    className="h-11 w-full rounded-xl border border-rx-border bg-rx-surface px-3 text-sm"
                    value={form.fontFamily}
                    onChange={(e) => patch("fontFamily", e.target.value)}
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>حجم الخط</Label>
                  <Input
                    value={form.fontSize}
                    onChange={(e) => patch("fontSize", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>حجم الورق</Label>
                  <select
                    className="h-11 w-full rounded-xl border border-rx-border bg-rx-surface px-3 text-sm"
                    value={form.paperSize}
                    onChange={(e) =>
                      patch("paperSize", e.target.value as "A4" | "A5")
                    }
                  >
                    {PAPER_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>اللون</Label>
                  <Input
                    type="color"
                    value={form.color}
                    onChange={(e) => patch("color", e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>
                    شفافية خلفية الصورة ({Math.round(form.opacity * 100)}%)
                  </Label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={form.opacity}
                    onChange={(e) => patch("opacity", Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            <Card hover>
              <CardHeader>
                <CardTitle>وضع التصميم</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  {(["design", "image"] as const).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      variant={form.designMode === mode ? "default" : "outline"}
                      onClick={() => patch("designMode", mode)}
                    >
                      {mode === "design" ? "تصميم جاهز" : "صورة خلفية"}
                    </Button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>الشعار</Label>
                    {form.logoPath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveImageUrl(form.logoPath) ?? ""}
                        alt="شعار"
                        className="h-16 object-contain"
                      />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadMutation.mutate({ kind: "logo", file });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>صورة الخلفية (وضع الصورة)</Label>
                    {form.designImagePath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveImageUrl(form.designImagePath) ?? ""}
                        alt="خلفية"
                        className="h-16 object-contain"
                      />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadMutation.mutate({ kind: "design", file });
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card hover>
              <CardHeader>
                <CardTitle>حقول المريض الأساسية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CorePatientFieldsTable
                  settings={form}
                  onPatch={patch}
                  showPositionHint
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.printDiagnosis}
                    onChange={(e) => patch("printDiagnosis", e.target.checked)}
                  />
                  طباعة التشخيص على الوصفة
                </label>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  );
}
