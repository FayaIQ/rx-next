"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { ClipboardList, Pencil, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rxApi, type PatientFieldDto } from "@/lib/api/rx-client";
import { CorePatientFieldsSettings } from "@/components/settings/core-patient-fields-settings";
import { useLocale, type TranslateFn } from "@/i18n/locale-provider";

type FieldDraft = {
  name: string;
  size: "larg" | "medium" | "small";
  isPersonal: boolean;
  isPrintable: boolean;
};

type SectionProps = {
  title: string;
  description: string;
  icon: "patient" | "recipe";
  fields: PatientFieldDto[];
  defaults: FieldDraft;
  presets?: Array<{ name: string; size?: FieldDraft["size"] }>;
  showPrintHint?: boolean;
  allowPrint?: boolean;
  topContent?: React.ReactNode;
};

function emptyDraft(defaults: FieldDraft): FieldDraft {
  return { ...defaults, name: "" };
}

function FieldRow({
  field,
  onRefresh,
  allowPrint,
  allowMove,
  t,
}: {
  field: PatientFieldDto;
  onRefresh: () => void;
  allowPrint: boolean;
  allowMove: boolean;
  t: TranslateFn;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: field.name,
    size: field.size,
  });

  const updateField = useMutation({
    mutationFn: () =>
      rxApi.fields.update(field.id, {
        name: draft.name.trim(),
        size: draft.size,
        isPersonal: field.isPersonal,
        isPrintable: field.isPrintable,
      }),
    onSuccess: () => {
      onRefresh();
      setEditing(false);
      toast.success(t("settings.fieldUpdated"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleField = useMutation({
    mutationFn: (toggle: "active" | "printable") =>
      rxApi.fields.toggle(field.id, toggle),
    onSuccess: onRefresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const moveField = useMutation({
    mutationFn: () =>
      rxApi.fields.update(field.id, {
        name: field.name,
        size: field.size,
        isPersonal: !field.isPersonal,
        isPrintable: field.isPersonal ? field.isPrintable : true,
      }),
    onSuccess: () => {
      onRefresh();
      toast.success(
        field.isPersonal
          ? t("settings.becameRecipeField")
          : t("settings.becamePatientField")
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteField = useMutation({
    mutationFn: () => rxApi.fields.delete(field.id),
    onSuccess: () => {
      onRefresh();
      toast.success(t("settings.fieldDeleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border border-rx-border bg-rx-surface p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {editing ? (
          <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
            <select
              className="h-10 rounded-lg border border-rx-border px-3"
              value={draft.size}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  size: e.target.value as FieldDraft["size"],
                }))
              }
            >
              <option value="small">{t("settings.sizeSmall")}</option>
              <option value="medium">{t("settings.sizeMedium")}</option>
              <option value="larg">{t("settings.sizeLarge")}</option>
            </select>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{field.name}</span>
              <span className="text-rx-muted">({field.size})</span>
              {field.isPrintable && (
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
                  {t("settings.printable")}
                </span>
              )}
              {!field.isActive && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {t("settings.disabled")}
                </span>
              )}
            </div>
            {field.isPrintable && !field.isPersonal && (
              <Link
                href="/recipe-settings"
                className="text-xs text-rx-primary hover:underline"
              >
                {t("settings.positionOnRecipe")}
              </Link>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button
                size="sm"
                onClick={() => updateField.mutate()}
                disabled={!draft.name.trim() || updateField.isPending}
              >
                {t("common.save")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDraft({ name: field.name, size: field.size });
                  setEditing(false);
                }}
              >
                {t("common.cancel")}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil size={14} />
                {t("common.edit")}
              </Button>
              {allowPrint && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toggleField.mutate("printable")}
                  disabled={toggleField.isPending}
                >
                  {field.isPrintable
                    ? t("settings.cancelPrint")
                    : t("settings.print")}
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => toggleField.mutate("active")}
                disabled={toggleField.isPending}
              >
                {field.isActive
                  ? t("settings.deactivate")
                  : t("settings.activate")}
              </Button>
              {allowMove && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => moveField.mutate()}
                  disabled={moveField.isPending}
                >
                  {field.isPersonal
                    ? t("settings.moveToRecipe")
                    : t("settings.moveToPatient")}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteField.mutate()}
                disabled={deleteField.isPending}
              >
                <Trash2 size={14} className="text-rx-danger" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldsSection({
  title,
  description,
  icon,
  fields,
  defaults,
  presets = [],
  showPrintHint,
  allowPrint = false,
  topContent,
}: SectionProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<FieldDraft>(() => emptyDraft(defaults));

  const refresh = () => {
    for (const key of queryKeys.patientFields.invalidate()) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const addField = useMutation({
    mutationFn: (body: FieldDraft) => rxApi.fields.create(body),
    onSuccess: () => {
      refresh();
      setDraft(emptyDraft(defaults));
      setShowAddForm(false);
      toast.success(t("settings.fieldAdded"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon === "patient" ? <User size={18} /> : <ClipboardList size={18} />}
          {title}
        </CardTitle>
        <p className="text-sm text-rx-muted">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {topContent}

        {topContent && (
          <div className="space-y-2 border-t border-rx-border pt-4">
            <p className="text-sm font-medium text-rx-text">
              {t("settings.extraFields")}
            </p>
            <p className="text-xs text-rx-muted">{t("settings.extraFieldsHint")}</p>
          </div>
        )}

        {presets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.name}
                size="sm"
                variant="outline"
                disabled={addField.isPending}
                onClick={() =>
                  addField.mutate({
                    ...defaults,
                    name: preset.name,
                    size: preset.size ?? defaults.size,
                    isPrintable: defaults.isPrintable || !defaults.isPersonal,
                  })
                }
              >
                + {preset.name}
              </Button>
            ))}
          </div>
        )}

        {!showAddForm ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={15} />
            {t("settings.addCustomField")}
          </Button>
        ) : (
          <div className="grid gap-3 rounded-xl border border-dashed border-rx-border bg-rx-bg-subtle/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 lg:col-span-2">
              <Label>{t("settings.fieldName")}</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((f) => ({ ...f, name: e.target.value }))}
                placeholder={
                  icon === "patient"
                    ? t("settings.fieldNamePatientPh")
                    : t("settings.fieldNameRecipePh")
                }
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>{t("settings.size")}</Label>
              <select
                className="h-10 w-full rounded-lg border border-rx-border bg-rx-surface px-3 text-sm"
                value={draft.size}
                onChange={(e) =>
                  setDraft((f) => ({
                    ...f,
                    size: e.target.value as FieldDraft["size"],
                  }))
                }
              >
                <option value="small">{t("settings.sizeSmall")}</option>
                <option value="medium">{t("settings.sizeMedium")}</option>
                <option value="larg">{t("settings.sizeLarge")}</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2 text-sm">
              {!defaults.isPersonal && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-rx-border"
                    checked={draft.isPrintable}
                    onChange={(e) =>
                      setDraft((f) => ({ ...f, isPrintable: e.target.checked }))
                    }
                  />
                  {t("settings.printOnRecipe")}
                </label>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-2 lg:col-span-4">
              <Button
                onClick={() => addField.mutate(draft)}
                disabled={!draft.name.trim() || addField.isPending}
              >
                <Plus size={16} />
                {t("settings.add")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setDraft(emptyDraft(defaults));
                }}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        )}

        {showPrintHint && fields.some((f) => f.isPrintable) && (
          <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-800">
            {t("settings.printHintBefore")}{" "}
            <Link href="/recipe-settings" className="font-medium underline">
              {t("settings.recipeDesign")}
            </Link>{" "}
            {t("settings.printHintAfter")}
          </p>
        )}

        <div className="space-y-2">
          {fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              onRefresh={refresh}
              allowPrint={allowPrint}
              allowMove
              t={t}
            />
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-rx-muted">{t("settings.noFieldsYet")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PatientFieldsManager({ fields }: { fields: PatientFieldDto[] }) {
  const { t } = useLocale();
  const patientFields = fields.filter((f) => f.isPersonal);
  const recipeFields = fields.filter((f) => !f.isPersonal);

  return (
    <div className="space-y-6">
      <FieldsSection
        title={t("settings.patientFields")}
        description={t("settings.patientFieldsDesc")}
        icon="patient"
        fields={patientFields}
        topContent={<CorePatientFieldsSettings />}
        defaults={{
          name: "",
          size: "medium",
          isPersonal: true,
          isPrintable: false,
        }}
        presets={[
          { name: t("settings.presetAllergy") },
          { name: t("settings.presetNotes") },
          { name: t("settings.presetBloodType") },
        ]}
        allowPrint={false}
      />

      <FieldsSection
        title={t("settings.recipeFields")}
        description={t("settings.recipeFieldsDesc")}
        icon="recipe"
        fields={recipeFields}
        defaults={{
          name: "",
          size: "medium",
          isPersonal: false,
          isPrintable: true,
        }}
        presets={[{ name: "PR" }, { name: "BP" }, { name: "TEMP" }]}
        showPrintHint
        allowPrint
      />
    </div>
  );
}
