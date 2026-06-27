"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { MedicinePresetDto } from "@/lib/api/rx-client";
import {
  getMedicineFieldOptions,
  type MedicineFillField,
} from "@/lib/medicine-preset-utils";
import {
  filterMedicineGroups,
  findGroupForQuery,
  type MedicineGroup,
} from "@/lib/medicine-utils";
import { cn } from "@/lib/utils";

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
  compact?: boolean;
  /** Inline row on prescription mockup — same logic, minimal chrome */
  mockup?: boolean;
  isLastRow?: boolean;
  onAddRow?: () => void;
};

const USAGE_FIELDS = [
  ["type", "النوع"],
  ["dosage", "الجرعة"],
  ["quantity", "الكمية"],
  ["period", "المدة"],
  ["timeOfUse", "وقت الاستخدام"],
] as const;

function emptyUsageFields() {
  return {
    type: "",
    dosage: "",
    quantity: "",
    period: "",
    timeOfUse: "",
  };
}

function handleOptionListKeyDown(
  e: React.KeyboardEvent,
  optionCount: number,
  highlight: number,
  setHighlight: React.Dispatch<React.SetStateAction<number>>,
  onPick: (index: number) => void,
  onEnterWithoutPick?: () => void
) {
  if (optionCount === 0) return false;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    const next = highlight < 0 ? 0 : Math.min(highlight + 1, optionCount - 1);
    setHighlight(next);
    return true;
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    const next =
      highlight < 0 ? optionCount - 1 : Math.max(highlight - 1, 0);
    setHighlight(next);
    return true;
  }

  if (e.key === "Enter" && highlight >= 0) {
    e.preventDefault();
    onPick(highlight);
    return true;
  }

  if (e.key === "Tab" && !e.shiftKey && highlight >= 0) {
    e.preventDefault();
    onPick(highlight);
    return true;
  }

  if (e.key === "Enter" && highlight < 0 && onEnterWithoutPick) {
    e.preventDefault();
    onEnterWithoutPick();
    return true;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    setHighlight(-1);
    return true;
  }

  return false;
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
  compact = false,
  mockup = false,
  isLastRow = false,
  onAddRow,
}: Props) {
  const [focusedField, setFocusedField] = useState<MedicineFillField | null>(
    null
  );
  const [nameHighlight, setNameHighlight] = useState(-1);
  const [usageHighlight, setUsageHighlight] = useState(-1);

  const suggestions = useMemo(
    () => (isOpen ? filterMedicineGroups(groups, row.name) : []),
    [isOpen, groups, row.name]
  );

  useEffect(() => {
    if (nameHighlight < 0) return;
    document
      .getElementById(`${rowKey}-name-suggestion-${nameHighlight}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [nameHighlight, rowKey]);

  useEffect(() => {
    if (nameHighlight >= suggestions.length) {
      setNameHighlight(suggestions.length > 0 ? suggestions.length - 1 : -1);
    }
  }, [suggestions.length, nameHighlight]);

  const fieldOptions = useMemo(() => {
    const map = new Map<MedicineFillField, ReturnType<typeof getMedicineFieldOptions>>();
    for (const [field] of USAGE_FIELDS) {
      map.set(field, getMedicineFieldOptions(field, row, groups, presets));
    }
    return map;
  }, [row, groups, presets]);

  function selectGroup(selected: MedicineGroup) {
    onClose();
    onChange({
      ...row,
      name: selected.name,
      ...emptyUsageFields(),
    });
  }

  function commitName() {
    onClose();
    const trimmed = row.name.trim();
    if (!trimmed) return;
    const match = findGroupForQuery(groups, trimmed);
    if (match && match.name !== row.name) {
      onChange({ ...row, name: match.name });
    }
  }

  function autoFillSingleOption(field: MedicineFillField) {
    if (row[field].trim()) return;
    const options = fieldOptions.get(field) ?? [];
    if (options.length === 1) {
      onChange({ ...row, [field]: options[0]!.value });
    }
  }

  function handleLastFieldAdvance() {
    if (!isLastRow || !onAddRow) return false;
    onAddRow();
    return true;
  }

  function renderUsageField(field: MedicineFillField, label: string) {
    const options = fieldOptions.get(field) ?? [];
    const showDropdown = focusedField === field && options.length > 0;
    const activeHighlight = focusedField === field ? usageHighlight : -1;

    return (
      <div key={field} className={mockup ? "min-w-0" : "space-y-0.5"}>
        {!mockup && (
          <Label className={compact ? "rx-label" : undefined}>{label}</Label>
        )}
        <div className="relative">
          <Input
            fieldSize={mockup || compact ? "compact" : "default"}
            className={mockup ? "h-6 text-xs" : undefined}
            value={row[field]}
            autoComplete="off"
            aria-label={mockup ? label : undefined}
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            placeholder={mockup ? label.split(" ")[0] : undefined}
            data-rx-medicine-row={rowKey}
            data-rx-medicine-field={field}
            onFocus={() => {
              setFocusedField(field);
              setUsageHighlight(-1);
            }}
            onBlur={() => {
              setTimeout(() => {
                setFocusedField((current) =>
                  current === field ? null : current
                );
                setUsageHighlight(-1);
                autoFillSingleOption(field);
              }, 200);
            }}
            onChange={(e) => {
              setUsageHighlight(-1);
              onChange({ ...row, [field]: e.target.value });
            }}
            onKeyDown={(e) => {
              const isLastField = field === "timeOfUse";
              if (
                handleOptionListKeyDown(
                  e,
                  options.length,
                  activeHighlight,
                  setUsageHighlight,
                  (index) => {
                    const option = options[index];
                    if (!option) return;
                    onChange({ ...row, [field]: option.value });
                    setFocusedField(null);
                    setUsageHighlight(-1);
                  },
                  isLastField ? handleLastFieldAdvance : undefined
                )
              ) {
                return;
              }
              if (
                isLastField &&
                (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) &&
                handleLastFieldAdvance()
              ) {
                e.preventDefault();
              }
            }}
          />
          {showDropdown && (
            <ul
              role="listbox"
              className={
                mockup
                  ? "absolute z-[80] mt-0.5 max-h-40 w-full min-w-[8rem] overflow-y-auto rounded-md border border-rx-form-border bg-rx-surface text-xs shadow-lg"
                  : "absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-rx-form-border bg-rx-surface shadow-md"
              }
            >
              {options.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={index === activeHighlight}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    className={cn(
                      mockup
                        ? "w-full px-2 py-1.5 text-right hover:bg-rx-bg-subtle"
                        : "rx-list-item",
                      index === activeHighlight &&
                        "bg-rx-primary/15 font-semibold text-rx-primary ring-1 ring-inset ring-rx-primary/25"
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setUsageHighlight(index)}
                    onClick={() => {
                      onChange({ ...row, [field]: option.value });
                      setFocusedField(null);
                      setUsageHighlight(-1);
                    }}
                  >
                    <span>{option.value}</span>
                    {option.usageCount > 1 && (
                      <span className="mr-2 text-xs text-rx-muted">
                        ({option.usageCount}×)
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  const nameInput = (
    <div className={mockup ? "relative min-w-0" : "relative space-y-0.5 lg:col-span-2"}>
      {!mockup && (
        <Label className={compact ? "rx-label" : undefined}>الاسم</Label>
      )}
      <Input
        fieldSize={mockup || compact ? "compact" : "default"}
        className={mockup ? "h-6 text-xs" : undefined}
        value={row.name}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        name={`rx-medicine-${rowKey}`}
        id={`rx-medicine-${rowKey}`}
        data-rx-medicine-row={rowKey}
        data-rx-medicine-field="name"
        role="combobox"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-autocomplete="list"
        aria-label={mockup ? "اسم الدواء" : undefined}
        aria-activedescendant={
          nameHighlight >= 0
            ? `${rowKey}-name-suggestion-${nameHighlight}`
            : undefined
        }
        onFocus={() => {
          onOpen();
          setNameHighlight(-1);
        }}
        onClick={onOpen}
        onBlur={() => {
          setTimeout(() => {
            setNameHighlight(-1);
            commitName();
          }, 200);
        }}
        onChange={(e) => {
          setNameHighlight(-1);
          onChange({
            ...row,
            name: e.target.value,
            ...emptyUsageFields(),
          });
        }}
        onKeyDown={(e) => {
          if (
            handleOptionListKeyDown(
              e,
              suggestions.length,
              nameHighlight,
              setNameHighlight,
              (index) => {
                const selected = suggestions[index];
                if (selected) selectGroup(selected);
              },
              commitName
            )
          ) {
            return;
          }
        }}
      />
      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          className={
            mockup
              ? "absolute z-[80] mt-0.5 max-h-40 w-[min(100%,14rem)] overflow-y-auto rounded-md border border-rx-form-border bg-rx-surface text-xs shadow-lg"
              : "absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-rx-form-border bg-rx-surface shadow-md"
          }
        >
          {suggestions.map((g, index) => (
            <li
              key={g.key}
              id={`${rowKey}-name-suggestion-${index}`}
              role="option"
              aria-selected={index === nameHighlight}
            >
              <button
                type="button"
                tabIndex={-1}
                className={cn(
                  mockup
                    ? "w-full px-2 py-1.5 text-right hover:bg-rx-bg-subtle"
                    : "rx-list-item",
                  index === nameHighlight &&
                    "bg-rx-primary/15 font-semibold text-rx-primary ring-1 ring-inset ring-rx-primary/25"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setNameHighlight(index)}
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
  );

  const removeButton = (
    <div className={mockup ? "flex items-center justify-center" : "flex items-end"}>
      <Button
        variant="ghost"
        size="icon"
        className={mockup ? "size-6" : compact ? "size-8" : undefined}
        disabled={!canRemove}
        tabIndex={-1}
        onClick={onRemove}
      >
        <Trash2 size={mockup ? 12 : 16} className="text-rx-danger" />
      </Button>
    </div>
  );

  if (mockup) {
    return (
      <div className="space-y-0.5">
        <div className="grid grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,0.75fr))_auto] items-center gap-0.5">
          {nameInput}
          {USAGE_FIELDS.map(([field, label]) => renderUsageField(field, label))}
          {removeButton}
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div
        className={
          compact
            ? "grid gap-2 lg:grid-cols-7"
            : "grid gap-3 rounded-xl border border-rx-border bg-rx-bg-subtle/50 p-4 lg:grid-cols-7"
        }
      >
        {nameInput}
        {USAGE_FIELDS.map(([field, label]) => renderUsageField(field, label))}
        {removeButton}
      </div>
    </div>
  );
}
