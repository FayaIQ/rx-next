"use client";

import type { RecipeSettingsDto } from "@/lib/api/rx-client";
import {
  RECIPE_TEMPLATES,
  type RecipeTemplateId,
} from "@/lib/recipe-templates";
import { cn } from "@/lib/utils";

type Props = {
  selected: string;
  designMode: string;
  onSelect: (id: RecipeTemplateId) => void;
};

function TemplateThumb({
  id,
  name,
  swatch,
  selected,
  onSelect,
}: {
  id: RecipeTemplateId;
  name: string;
  swatch: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border-2 text-right transition-all",
        selected
          ? "border-rx-primary shadow-md ring-2 ring-rx-primary/20"
          : "border-rx-border hover:border-rx-primary/40 hover:shadow-sm"
      )}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-white">
        {id === "classic" && (
          <>
            <div className="absolute inset-1 rounded border" style={{ borderColor: `${swatch}44` }} />
            <div className="absolute inset-x-1 top-1 h-[22%] rounded-t px-2 py-1.5" style={{ backgroundColor: swatch }}>
              <div className="h-1.5 w-2/3 rounded bg-white/80" />
              <div className="mt-1 h-1 w-1/2 rounded bg-white/50" />
            </div>
            <div className="absolute inset-x-1 top-[24%] h-[10%]" style={{ backgroundColor: `${swatch}12` }} />
            <div className="absolute inset-x-3 top-[38%] space-y-1">
              <div className="h-1 w-full rounded bg-slate-200" />
              <div className="h-1 w-4/5 rounded bg-slate-100" />
              <div className="h-1 w-3/5 rounded bg-slate-100" />
            </div>
          </>
        )}
        {id === "modern" && (
          <>
            <div className="absolute top-0 bottom-0 right-0 w-[10%]" style={{ backgroundColor: swatch }} />
            <div className="absolute inset-x-[12%] top-[14%] bottom-[10%] rounded-lg border" style={{ borderColor: `${swatch}33` }} />
            <div className="absolute left-3 top-2 space-y-1">
              <div className="h-1.5 w-10 rounded" style={{ backgroundColor: swatch }} />
              <div className="h-1 w-8 rounded bg-slate-200" />
            </div>
          </>
        )}
        {id === "elegant" && (
          <>
            <div className="absolute left-2 right-2 top-2 h-px" style={{ background: `linear-gradient(90deg,transparent,${swatch},transparent)` }} />
            <div className="absolute left-2 right-2 bottom-2 h-px" style={{ background: `linear-gradient(90deg,transparent,${swatch},transparent)` }} />
            <div className="absolute inset-x-0 top-[18%] text-center">
              <div className="text-[10px] font-bold" style={{ color: swatch }}>℞</div>
              <div className="mx-auto mt-1 h-1.5 w-12 rounded" style={{ backgroundColor: swatch }} />
            </div>
          </>
        )}
        {id === "medical" && (
          <>
            <div className="absolute inset-x-0 top-0 h-[24%] px-2 py-1.5 text-white" style={{ backgroundColor: swatch }}>
              <div className="flex justify-between">
                <div className="h-1.5 w-2/3 rounded bg-white/80" />
                <span className="text-[10px]">✚</span>
              </div>
            </div>
            <div
              className="absolute inset-x-1 bottom-1 top-[26%] opacity-50"
              style={{
                backgroundImage: `linear-gradient(${swatch}15 1px,transparent 1px),linear-gradient(90deg,${swatch}15 1px,transparent 1px)`,
                backgroundSize: "8px 8px",
              }}
            />
          </>
        )}
        {id === "minimal" && (
          <>
            <div className="absolute left-2 right-2 top-[12%] h-px" style={{ backgroundColor: `${swatch}55` }} />
            <div className="absolute left-2 top-2 space-y-1">
              <div className="h-1 w-10 rounded bg-slate-300" />
              <div className="h-1 w-6 rounded bg-slate-200" />
            </div>
            <div className="absolute inset-x-3 top-[22%] space-y-1.5">
              <div className="h-1 w-full rounded bg-slate-100" />
              <div className="h-1 w-4/5 rounded bg-slate-100" />
            </div>
          </>
        )}
      </div>
      <div className={cn("px-2 py-1.5 text-xs font-semibold", selected ? "bg-rx-primary/8 text-rx-primary" : "bg-rx-bg-subtle text-rx-text")}>
        {name}
      </div>
    </button>
  );
}

export function RecipeTemplatePicker({ selected, designMode, onSelect }: Props) {
  if (designMode === "image") return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-rx-text">قالب الوصفة</p>
        <p className="text-xs text-rx-muted">
          اختر تصميماً جاهزاً من النظام — يمكنك تعديل اللون والخط لاحقاً
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {RECIPE_TEMPLATES.map((template) => (
          <TemplateThumb
            key={template.id}
            id={template.id}
            name={template.name}
            swatch={template.swatch}
            selected={selected === template.id}
            onSelect={() => onSelect(template.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function RecipeTemplatePickerPreview({
  settings,
}: {
  settings: RecipeSettingsDto;
}) {
  const template = RECIPE_TEMPLATES.find((t) => t.id === settings.designTemplate);
  if (!template || settings.designMode === "image") return null;

  return (
    <p className="text-xs text-rx-muted">
      القالب الحالي: <strong className="text-rx-text">{template.name}</strong>
      {" — "}
      {template.description}
    </p>
  );
}
