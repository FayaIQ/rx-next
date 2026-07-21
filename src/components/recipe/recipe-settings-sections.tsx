"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecipeSettingsDto } from "@/lib/api/rx-client";
import { PAPER_OPTIONS, fontFamilyCss } from "@/lib/recipe-settings";
import { RECIPE_FONT_OPTIONS } from "@/lib/recipe-fonts";
import { resolveImageUrl } from "@/lib/image-url";
import {
  RecipeTemplatePicker,
  RecipeTemplatePickerPreview,
} from "@/components/recipe/template-picker";
import type { RecipeTemplateId } from "@/lib/recipe-templates";
import { CorePatientFieldsTable } from "@/components/settings/core-patient-fields-settings";
import { useLocale } from "@/i18n/locale-provider";

const selectClassName =
  "h-11 w-full rounded-xl border border-rx-border bg-rx-surface px-3 text-sm focus:border-rx-primary focus:outline-none focus:ring-2 focus:ring-rx-primary/20";

type PatchFn = <K extends keyof RecipeSettingsDto>(
  key: K,
  value: RecipeSettingsDto[K]
) => void;

function ImageUploadField({
  label,
  path,
  onFile,
  disabled,
}: {
  label: string;
  path: string | null;
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const preview = path ? resolveImageUrl(path) : null;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-rx-border bg-rx-bg-subtle/40 p-3 sm:flex-row sm:items-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={label}
            className="h-16 w-16 shrink-0 rounded-lg border border-rx-border bg-white object-contain p-1"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-rx-border bg-white text-rx-muted">
            <Upload size={20} />
          </div>
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-rx-border bg-white px-3 py-2 text-sm font-medium text-rx-text shadow-sm transition-colors hover:bg-rx-bg-subtle">
          <Upload size={14} />
          {preview ? t("recipe.changeImage") : t("recipe.uploadImage")}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

export function DoctorInfoSection({
  form,
  onPatch,
}: {
  form: RecipeSettingsDto;
  onPatch: PatchFn;
}) {
  const { t } = useLocale();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("recipe.doctorClinicData")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="space-y-1.5">
          <Label>{t("recipe.doctorName")}</Label>
          <Input
            value={form.doctorName}
            onChange={(e) => onPatch("doctorName", e.target.value)}
            placeholder={t("recipe.doctorNamePh")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("recipe.specialty")}</Label>
          <Input
            value={form.doctorSpecialty}
            onChange={(e) => onPatch("doctorSpecialty", e.target.value)}
            placeholder={t("recipe.specialtyPh")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("recipe.headerExtra")}</Label>
          <Textarea
            rows={2}
            value={form.additionalText1 ?? ""}
            onChange={(e) => onPatch("additionalText1", e.target.value || null)}
            placeholder={t("recipe.headerExtraPh")}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("recipe.clinicPhone")}</Label>
            <Input
              dir="ltr"
              value={form.phoneNumber ?? ""}
              onChange={(e) => onPatch("phoneNumber", e.target.value || null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("recipe.email")}</Label>
            <Input
              type="email"
              dir="ltr"
              value={form.email ?? ""}
              onChange={(e) => onPatch("email", e.target.value || null)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t("recipe.address")}</Label>
          <Input
            value={form.address ?? ""}
            onChange={(e) => onPatch("address", e.target.value || null)}
            placeholder={t("recipe.addressPh")}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function AppearanceSection({
  form,
  onPatch,
}: {
  form: RecipeSettingsDto;
  onPatch: PatchFn;
}) {
  const { t } = useLocale();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("recipe.fontsColors")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t("recipe.fontType")}</Label>
          <select
            className={selectClassName}
            value={form.fontFamily}
            onChange={(e) => onPatch("fontFamily", e.target.value)}
            style={{ fontFamily: fontFamilyCss(form.fontFamily) }}
          >
            <optgroup label={t("recipe.fontsStandard")}>
              {RECIPE_FONT_OPTIONS.filter((f) => f.category === "standard").map(
                (f) => (
                  <option
                    key={f.value}
                    value={f.value}
                    style={{ fontFamily: fontFamilyCss(f.value) }}
                  >
                    {f.label} — {f.hint}
                  </option>
                )
              )}
            </optgroup>
            <optgroup label={t("recipe.fontsScript")}>
              {RECIPE_FONT_OPTIONS.filter((f) => f.category === "script").map(
                (f) => (
                  <option
                    key={f.value}
                    value={f.value}
                    style={{ fontFamily: fontFamilyCss(f.value) }}
                  >
                    {f.label} — {f.hint}
                  </option>
                )
              )}
            </optgroup>
          </select>
          <p
            className="rounded-lg border border-rx-border bg-rx-bg-subtle/50 px-3 py-2 text-sm leading-relaxed"
            data-recipe-font-preview
            style={{ fontFamily: fontFamilyCss(form.fontFamily) }}
          >
            {t("recipe.fontPreview")}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>{t("recipe.fontSize")}</Label>
          <Input
            value={form.fontSize}
            onChange={(e) => onPatch("fontSize", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("recipe.paperSize")}</Label>
          <select
            className={selectClassName}
            value={form.paperSize}
            onChange={(e) => onPatch("paperSize", e.target.value as "A4" | "A5")}
          >
            {PAPER_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("recipe.mainColor")}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              className="h-11 w-16 shrink-0 cursor-pointer p-1"
              value={form.color}
              onChange={(e) => onPatch("color", e.target.value)}
            />
            <Input
              value={form.color}
              onChange={(e) => onPatch("color", e.target.value)}
              className="font-mono text-xs"
              dir="ltr"
            />
          </div>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>
            {t("recipe.opacity", { pct: Math.round(form.opacity * 100) })}
          </Label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={form.opacity}
            onChange={(e) => onPatch("opacity", Number(e.target.value))}
            className="w-full accent-rx-primary"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function DesignTemplateSection({
  form,
  onPatch,
  onTemplateSelect,
  onDesignModeChange,
  onUpload,
  uploadPending,
}: {
  form: RecipeSettingsDto;
  onPatch: PatchFn;
  onTemplateSelect: (id: RecipeTemplateId) => void;
  onDesignModeChange: (mode: "design" | "image") => void;
  onUpload: (kind: "logo" | "design", file: File) => void;
  uploadPending?: boolean;
}) {
  const { t } = useLocale();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("recipe.bgStyle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["design", "image"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={form.designMode === mode ? "default" : "outline"}
                onClick={() => onDesignModeChange(mode)}
              >
                {mode === "design"
                  ? t("recipe.readyTemplates")
                  : t("recipe.customBgImage")}
              </Button>
            ))}
          </div>

          {form.designMode === "design" ? (
            <>
              <RecipeTemplatePicker
                selected={form.designTemplate ?? "classic"}
                designMode={form.designMode}
                onSelect={onTemplateSelect}
              />
              <RecipeTemplatePickerPreview settings={form} />
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-rx-muted">{t("recipe.imageModeHint")}</p>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rx-border bg-rx-bg-subtle/40 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-rx-border"
                  checked={form.printWithoutDesignImage}
                  onChange={(e) =>
                    onPatch("printWithoutDesignImage", e.target.checked)
                  }
                />
                <span>
                  <span className="font-medium text-rx-text">
                    {t("recipe.printWithoutBg")}
                  </span>
                  <span className="mt-0.5 block text-rx-muted">
                    {t("recipe.printWithoutBgHint")}
                  </span>
                </span>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("recipe.logoImages")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ImageUploadField
            label={t("recipe.clinicLogo")}
            path={form.logoPath}
            disabled={uploadPending}
            onFile={(file) => onUpload("logo", file)}
          />
          {form.designMode === "image" && (
            <ImageUploadField
              label={t("recipe.prescriptionBg")}
              path={form.designImagePath}
              disabled={uploadPending}
              onFile={(file) => onUpload("design", file)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PatientFieldsSection({
  form,
  onPatch,
}: {
  form: RecipeSettingsDto;
  onPatch: PatchFn;
}) {
  const { t } = useLocale();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("recipe.patientFieldsOnRx")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-rx-muted">
          {t("recipe.patientFieldsHintBefore")}{" "}
          <strong className="text-rx-text">{t("recipe.tabPreview")}</strong>{" "}
          {t("recipe.patientFieldsHintAfter")}
        </p>
        <CorePatientFieldsTable
          settings={form}
          onPatch={onPatch}
          showPositionHint={false}
        />
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-rx-border bg-rx-bg-subtle/40 px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-rx-border"
            checked={form.printDiagnosis}
            onChange={(e) => onPatch("printDiagnosis", e.target.checked)}
          />
          {t("recipe.printDiagnosisInBox")}
        </label>
      </CardContent>
    </Card>
  );
}
