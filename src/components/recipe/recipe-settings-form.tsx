"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Save,
  Eye,
  UserRound,
  Palette,
  LayoutTemplate,
  ListChecks,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { PageContent } from "@/components/ui/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import type { PrescriptionDocumentData } from "@/components/prescription/prescription-document";
import { RecipePreviewEditor } from "@/components/recipe/recipe-preview-editor";
import type { PositionKey } from "@/components/recipe/draggable-block";
import {
  DEFAULT_ITEMS_BOX_HEIGHT,
  DEFAULT_ITEMS_BOX_WIDTH,
} from "@/components/recipe/prescription-items-box";
import {
  AppearanceSection,
  DesignTemplateSection,
  DoctorInfoSection,
  PatientFieldsSection,
} from "@/components/recipe/recipe-settings-sections";
import { rxApi, type RecipeSettingsDto } from "@/lib/api/rx-client";
import { normalizeRecipeSettingsDto } from "@/lib/recipe-settings";
import { normalizePatientFieldsArray } from "@/lib/patient-field-display";
import { queryKeys } from "@/lib/query-keys";
import { sampleFieldValue } from "@/lib/patient-field-layout";
import { applyRecipeTemplate } from "@/lib/recipe-templates";
import { RecipeDesignerPageLoading } from "@/components/ui/page-loading";
import { cn } from "@/lib/utils";

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
    fontFamily: "cairo",
    fontSize: "14",
    opacity: 0.2,
    paperSize: "A4",
    color: "#117e65",
    logoPath: null,
    designImagePath: null,
    designMode: "design",
    designTemplate: "classic",
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

type SettingsTab = "preview" | "doctor" | "style" | "template" | "fields";

const TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof Eye;
}> = [
  { id: "preview", label: "المعاينة", icon: Eye },
  { id: "template", label: "التصميم", icon: LayoutTemplate },
  { id: "doctor", label: "الطبيب", icon: UserRound },
  { id: "style", label: "المظهر", icon: Palette },
  { id: "fields", label: "الحقول", icon: ListChecks },
];

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("template");
  const hydratedRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.recipeSettings.all,
    queryFn: () => rxApi.recipeSettings.get(),
  });

  const { data: fieldsData } = useQuery({
    queryKey: queryKeys.fieldsRecipe.all,
    queryFn: () => rxApi.fields.list(),
  });

  const [fieldPositions, setFieldPositions] = useState<
    Record<number, { designX: number; designY: number }>
  >({});

  useEffect(() => {
    if (data?.settings && !hydratedRef.current) {
      setForm(normalizeRecipeSettingsDto(data.settings));
      hydratedRef.current = true;
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form) throw new Error("لا توجد بيانات");
      return rxApi.recipeSettings.update(normalizeRecipeSettingsDto(form));
    },
    onSuccess: (res) => {
      const next = normalizeRecipeSettingsDto(res.settings);
      setForm(next);
      queryClient.setQueryData(queryKeys.recipeSettings.all, { settings: next });
      toast.success("تم حفظ إعدادات الوصفة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ kind, file }: { kind: "logo" | "design"; file: File }) =>
      rxApi.recipeSettings.upload(kind, file),
    onSuccess: (res) => {
      const next = normalizeRecipeSettingsDto(res.settings);
      setForm(next);
      queryClient.setQueryData(queryKeys.recipeSettings.all, { settings: next });
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
    const prev = fieldPositions[fieldId];
    setFieldPositions((current) => ({
      ...current,
      [fieldId]: { designX: x, designY: y },
    }));
    void rxApi.fields
      .updatePosition(fieldId, x, y)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.fieldsRecipe.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.patientFields.all });
      })
      .catch((e: Error) => {
        setFieldPositions((current) => {
          if (prev) return { ...current, [fieldId]: prev };
          const next = { ...current };
          delete next[fieldId];
          return next;
        });
        toast.error(e.message || "تعذّر حفظ موضع الحقل");
      });
  }

  if (isLoading || !form) {
    return <RecipeDesignerPageLoading />;
  }

  const printableRecipeFields = normalizePatientFieldsArray(fieldsData).filter(
    (f) => !f.isPersonal && f.isPrintable
  );

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
      <AppHeader
        title="تصميم الوصفة"
        subtitle="خصّص القالب، الحقول، وشكل الطباعة"
        actions={
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save size={15} />
            {saveMutation.isPending ? "جاري الحفظ..." : "حفظ التصميم"}
          </Button>
        }
      />

      <PageContent wide className="space-y-4 pb-24 xl:pb-8">
        <div className="sticky top-[var(--rx-header-height)] z-20 -mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-1.5 rounded-2xl border border-rx-border bg-rx-surface p-1.5 shadow-sm">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === id
                    ? "bg-rx-primary text-white shadow-sm"
                    : "text-rx-muted hover:bg-rx-bg-subtle hover:text-rx-text"
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
          <div
            className={cn(
              "space-y-3",
              activeTab !== "preview" && "hidden",
              "xl:block xl:sticky xl:top-[calc(var(--rx-header-height)+4.5rem)] xl:self-start"
            )}
          >
            <Card className="overflow-hidden">
              <CardContent className="space-y-3 p-4">
                <div className="rounded-xl bg-rx-primary-light/60 px-3 py-2 text-xs leading-relaxed text-rx-text-secondary">
                  اسحب الشريط العلوي لأي صندوق لتحريكه، والزاوية السفلية لتغيير
                  حجم صندوق الأدوية.
                </div>
                <RecipePreviewEditor
                  data={previewData}
                  onPositionChange={handlePositionChange}
                  onItemsSizeChange={handleItemsSizeChange}
                  onFieldPositionChange={handleFieldPositionChange}
                />
              </CardContent>
            </Card>
          </div>

          <div
            className={cn(
              "space-y-4",
              activeTab === "preview" && "hidden",
              "xl:block"
            )}
          >
            {activeTab === "doctor" && (
              <DoctorInfoSection form={form} onPatch={patch} />
            )}
            {activeTab === "style" && (
              <AppearanceSection form={form} onPatch={patch} />
            )}
            {activeTab === "template" && (
              <DesignTemplateSection
                form={form}
                onTemplateSelect={(id) =>
                  setForm((prev) =>
                    prev ? applyRecipeTemplate(prev, id) : prev
                  )
                }
                onDesignModeChange={(mode) => patch("designMode", mode)}
                onUpload={(kind, file) => uploadMutation.mutate({ kind, file })}
                uploadPending={uploadMutation.isPending}
              />
            )}
            {activeTab === "fields" && (
              <PatientFieldsSection form={form} onPatch={patch} />
            )}
          </div>
        </div>

        {activeTab !== "preview" && (
          <div className="fixed inset-x-0 bottom-[var(--rx-nav-pill-offset)] z-20 border-t border-rx-border bg-rx-surface/95 p-3 backdrop-blur-sm xl:hidden">
            <Button
              className="w-full"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save size={16} />
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ التصميم"}
            </Button>
          </div>
        )}
      </PageContent>
    </>
  );
}
