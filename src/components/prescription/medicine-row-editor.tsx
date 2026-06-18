"use client";

import { useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { MedicinePresetDto } from "@/lib/api/rx-client";
import {
  filterPresetsForMedicine,
  formatPresetLabel,
  hasUsageFields,
  pickAutoFillPreset,
  presetOptionKey,
  resolveMedicineFill,
} from "@/lib/medicine-preset-utils";
import {
  filterMedicineGroups,
  findGroupForQuery,
  findVariant,
  type MedicineGroup,
  uniqueTypes,
} from "@/lib/medicine-utils";

export type MedicineRowData = {
  id?: number;
  key: string;
  name: string;
  type: string;
  dosage: string;
  quantity: string;
  period: string;
  timeOfUse: string;
};

type Props = {
  row: MedicineRowData;
  rowKey: string;
  groups: MedicineGroup[];
  presets: MedicinePresetDto[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (row: MedicineRowData) => void;
  onRemove: () => void;
  canRemove: boolean;
};

const OTHER_FIELDS = [
  ["dosage", "الجرعة"],
  ["quantity", "الكمية"],
  ["period", "المدة"],
  ["timeOfUse", "وقت الاستخدام"],
] as const;

function applyPreset(row: MedicineRowData, preset: MedicinePresetDto): MedicineRowData {
  return {
    ...row,
    name: preset.name,
    type: preset.type,
    dosage: preset.dosage,
    quantity: preset.quantity,
    period: preset.period,
    timeOfUse: preset.timeOfUse,
  };
}

export function MedicineRowEditor({
  row,
  rowKey,
  groups,
  presets,
  isOpen,
  onOpen,
  onClose,
  onChange,
  onRemove,
  canRemove,
}: Props) {
  const lastAutoFillKey = useRef("");
  const group = findGroupForQuery(groups, row.name);
  const typeOptions = group ? uniqueTypes(group.variants) : [];
  const showTypeSelect = typeOptions.length > 0;
  const suggestions = isOpen ? filterMedicineGroups(groups, row.name) : [];

  const rowPresets = useMemo(
    () =>
      row.name.trim()
        ? filterPresetsForMedicine(presets, row.name, row.type)
        : [],
    [presets, row.name, row.type]
  );

  const allRowPresets = useMemo(
    () => (row.name.trim() ? filterPresetsForMedicine(presets, row.name) : []),
    [presets, row.name]
  );

  const mostUsedPreset = allRowPresets[0];

  const activePresetKey = useMemo(() => {
    const pool = rowPresets.length > 0 ? rowPresets : allRowPresets;
    const match = pool.find(
      (p) =>
        p.type === row.type &&
        p.dosage === row.dosage &&
        p.quantity === row.quantity &&
        p.period === row.period &&
        p.timeOfUse === row.timeOfUse
    );
    if (match) return presetOptionKey(match, pool.indexOf(match));
    return "";
  }, [
    rowPresets,
    allRowPresets,
    row.type,
    row.dosage,
    row.quantity,
    row.period,
    row.timeOfUse,
  ]);

  function tryAutoFill(name: string, type = row.type, force = false) {
    if (!name.trim()) return;
    if (!force && hasUsageFields(row)) return;

    const autoKey = `${name}|${type}|${presets.length}`;
    if (!force && lastAutoFillKey.current === autoKey) return;

    const filled = resolveMedicineFill(
      { ...row, name, type },
      groups,
      presets,
      name
    );
    if (!filled) return;

    const changed =
      filled.name !== row.name ||
      filled.type !== row.type ||
      filled.dosage !== row.dosage ||
      filled.quantity !== row.quantity ||
      filled.period !== row.period ||
      filled.timeOfUse !== row.timeOfUse;

    if (changed) {
      lastAutoFillKey.current = autoKey;
      onChange({ ...row, ...filled });
    }
  }

  useEffect(() => {
    if (!row.name.trim() || hasUsageFields(row)) return;
    tryAutoFill(row.name, row.type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presets, groups, row.name, row.type]);

  function selectGroup(selected: MedicineGroup) {
    onClose();
    lastAutoFillKey.current = "";
    const preset = pickAutoFillPreset(presets, selected.name);
    if (preset) {
      onChange(applyPreset(row, preset));
      return;
    }
    tryAutoFill(selected.name, "", true);
  }

  function selectType(type: string) {
    lastAutoFillKey.current = `manual|${row.name}|${type}`;

    const preset = pickAutoFillPreset(presets, row.name, type);
    if (preset) {
      onChange(applyPreset({ ...row, type }, preset));
      return;
    }

    if (group) {
      const variant = findVariant(group.variants, type);
      if (variant) {
        onChange({
          ...row,
          type,
          name: variant.name.trim(),
          dosage: variant.dosage?.trim() ?? "",
          quantity: variant.quantity?.trim() ?? "",
          period: variant.period?.trim() ?? "",
          timeOfUse: variant.timeOfUse?.trim() ?? "",
        });
        return;
      }
    }

    onChange({ ...row, type });
  }

  function commitNameOnBlur() {
    onClose();
    if (!row.name.trim() || hasUsageFields(row)) return;
    tryAutoFill(row.name.trim(), row.type, true);
  }

  function selectPreset(presetId: string) {
    const pool = rowPresets.length > 0 ? rowPresets : allRowPresets;
    const preset = pool.find(
      (p, index) => presetOptionKey(p, index) === presetId
    );
    if (preset) onChange(applyPreset(row, preset));
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-3 rounded-xl border border-rx-border/80 bg-rx-bg-subtle/30 p-4 lg:grid-cols-7">
        <div className="relative space-y-1 lg:col-span-2">
          <Label>الاسم</Label>
          <Input
            value={row.name}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name={`rx-medicine-${rowKey}`}
            id={`rx-medicine-${rowKey}`}
            role="combobox"
            aria-expanded={isOpen && suggestions.length > 0}
            aria-autocomplete="list"
            onFocus={onOpen}
            onClick={onOpen}
            onBlur={() => {
              setTimeout(() => {
                commitNameOnBlur();
              }, 200);
            }}
            onChange={(e) => {
              lastAutoFillKey.current = "";
              onChange({
                ...row,
                name: e.target.value,
                type: "",
                dosage: "",
                quantity: "",
                period: "",
                timeOfUse: "",
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitNameOnBlur();
              }
            }}
          />
          {isOpen && suggestions.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-rx-border bg-rx-surface shadow-xl"
            >
              {suggestions.map((g) => (
                <li key={g.key} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className="block w-full border-b border-rx-border/40 px-4 py-2.5 text-right text-sm transition-colors last:border-0 hover:bg-rx-primary-light"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectGroup(g)}
                  >
                    <span className="font-medium">{g.name}</span>
                    {g.variants.length > 1 && (
                      <span className="mr-2 text-xs text-rx-muted">
                        ({g.variants.length} أنواع)
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <Label>النوع</Label>
          {showTypeSelect ? (
            <select
              className="flex h-11 w-full rounded-xl border border-rx-border bg-rx-surface px-3 text-sm shadow-sm focus:border-rx-primary focus:outline-none focus:ring-2 focus:ring-rx-primary/20"
              value={row.type}
              onChange={(e) => selectType(e.target.value)}
            >
              <option value="">— اختر النوع —</option>
              {typeOptions.map((type) => (
                <option key={type || "__default__"} value={type}>
                  {type || "افتراضي"}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={row.type}
              autoComplete="off"
              onChange={(e) => selectType(e.target.value)}
              onBlur={() => tryAutoFill(row.name, row.type.trim(), true)}
              placeholder="النوع"
            />
          )}
        </div>

        {OTHER_FIELDS.map(([key, label]) => (
          <div key={key} className="space-y-1">
            <Label>{label}</Label>
            <Input
              value={row[key]}
              autoComplete="off"
              onChange={(e) => onChange({ ...row, [key]: e.target.value })}
            />
          </div>
        ))}

        <div className="flex items-end">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canRemove}
            onClick={onRemove}
          >
            <Trash2 size={16} className="text-rx-danger" />
          </Button>
        </div>
      </div>

      {allRowPresets.length > 1 && (
        <div className="rounded-xl border border-rx-primary/20 bg-rx-primary-light/30 px-4 py-3">
          <Label className="mb-1.5 block text-xs text-rx-muted">
            إعدادات محفوظة ({allRowPresets.length}) — تم اختيار الأكثر استخداماً
            {mostUsedPreset && mostUsedPreset.usageCount > 1
              ? ` (${mostUsedPreset.usageCount}×)`
              : ""}
          </Label>
          <select
            className="flex h-10 w-full rounded-lg border border-rx-border bg-rx-surface px-3 text-sm focus:border-rx-primary focus:outline-none focus:ring-2 focus:ring-rx-primary/20"
            value={activePresetKey}
            onChange={(e) => selectPreset(e.target.value)}
          >
            {allRowPresets.map((preset, index) => (
              <option
                key={presetOptionKey(preset, index)}
                value={presetOptionKey(preset, index)}
              >
                {formatPresetLabel(preset)}
                {index === 0 ? " ★" : ""}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
