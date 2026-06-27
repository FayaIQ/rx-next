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
          {preview ? "تغيير الصورة" : "رفع صورة"}
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
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">بيانات الطبيب والعيادة</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="space-y-1.5">
          <Label>اسم الطبيب</Label>
          <Input
            value={form.doctorName}
            onChange={(e) => onPatch("doctorName", e.target.value)}
            placeholder="د. أحمد محمد"
          />
        </div>
        <div className="space-y-1.5">
          <Label>التخصص</Label>
          <Input
            value={form.doctorSpecialty}
            onChange={(e) => onPatch("doctorSpecialty", e.target.value)}
            placeholder="طب عام، أطفال..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>نص إضافي في الترويسة</Label>
          <Textarea
            rows={2}
            value={form.additionalText1 ?? ""}
            onChange={(e) => onPatch("additionalText1", e.target.value || null)}
            placeholder="عيادة النور — استشارات يومية"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>هاتف العيادة</Label>
            <Input
              dir="ltr"
              value={form.phoneNumber ?? ""}
              onChange={(e) => onPatch("phoneNumber", e.target.value || null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              dir="ltr"
              value={form.email ?? ""}
              onChange={(e) => onPatch("email", e.target.value || null)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>العنوان</Label>
          <Input
            value={form.address ?? ""}
            onChange={(e) => onPatch("address", e.target.value || null)}
            placeholder="دمشق — المزة"
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
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">الخط والألوان</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>نوع الخط</Label>
          <select
            className={selectClassName}
            value={form.fontFamily}
            onChange={(e) => onPatch("fontFamily", e.target.value)}
            style={{ fontFamily: fontFamilyCss(form.fontFamily) }}
          >
            <optgroup label="خطوط عادية">
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
            <optgroup label="خطوط مزج / يدوية">
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
            معاينة الخط: وصفة طبية — أحمد محمد — Amoxicillin 500mg
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>حجم الخط (px)</Label>
          <Input
            value={form.fontSize}
            onChange={(e) => onPatch("fontSize", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>حجم الورق</Label>
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
          <Label>اللون الرئيسي</Label>
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
            شفافية خلفية الصورة ({Math.round(form.opacity * 100)}%)
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
  onTemplateSelect,
  onDesignModeChange,
  onUpload,
  uploadPending,
}: {
  form: RecipeSettingsDto;
  onTemplateSelect: (id: RecipeTemplateId) => void;
  onDesignModeChange: (mode: "design" | "image") => void;
  onUpload: (kind: "logo" | "design", file: File) => void;
  uploadPending?: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">نمط الخلفية</CardTitle>
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
                {mode === "design" ? "قوالب جاهزة" : "صورة خلفية مخصصة"}
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
            <p className="text-sm text-rx-muted">
              ارفع صورة خلفية للوصفة واضبط الشفافية من تبويب المظهر. يمكنك سحب
              الحقول في المعاينة لمواءمتها مع التصميم.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">الشعار والصور</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ImageUploadField
            label="شعار العيادة"
            path={form.logoPath}
            disabled={uploadPending}
            onFile={(file) => onUpload("logo", file)}
          />
          {form.designMode === "image" && (
            <ImageUploadField
              label="صورة خلفية الوصفة"
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
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">حقول المريض على الوصفة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-rx-muted">
          اختر ما يظهر عند إضافة المريض وما يُطبع على الوصفة. لتحريك المواضع،
          استخدم تبويب <strong className="text-rx-text">المعاينة</strong> واسحب
          الصناديق على التصميم.
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
          طباعة التشخيص ضمن صندوق الأدوية
        </label>
      </CardContent>
    </Card>
  );
}
