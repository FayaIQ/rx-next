"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-provider";

type ImageItem = {
  id: number;
  toothFdi: number;
  imageUrl: string;
  imageType: string;
  caption: string | null;
  createdAt?: string;
};

export function ToothImageCompare({ images }: { images: ImageItem[] }) {
  const { t } = useLocale();
  const [toothFdi, setToothFdi] = useState<number | "all">("all");
  const [leftId, setLeftId] = useState<number | null>(null);
  const [rightId, setRightId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (toothFdi === "all") return images;
    return images.filter((img) => img.toothFdi === toothFdi);
  }, [images, toothFdi]);

  const teeth = useMemo(
    () => [...new Set(images.map((i) => i.toothFdi))].sort((a, b) => a - b),
    [images]
  );

  const left = filtered.find((i) => i.id === leftId) ?? filtered[0];
  const right =
    filtered.find((i) => i.id === rightId) ??
    filtered.find((i) => i.id !== left?.id) ??
    filtered[1];

  const typeLabel = (imageType: string) =>
    imageType === "xray" ? t("patientFile.xray") : t("patientFile.photo");

  if (images.length < 2) {
    return (
      <p className="text-sm text-rx-muted">{t("patientFile.compareNeedTwo")}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-md border px-2 text-sm"
          value={toothFdi === "all" ? "all" : String(toothFdi)}
          onChange={(e) => {
            const v = e.target.value;
            setToothFdi(v === "all" ? "all" : Number(v));
            setLeftId(null);
            setRightId(null);
          }}
        >
          <option value="all">{t("patientFile.allTeeth")}</option>
          {teeth.map((fdi) => (
            <option key={fdi} value={fdi}>
              {t("patientFile.toothOption", { fdi })}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border px-2 text-sm"
          value={left?.id ?? ""}
          onChange={(e) => setLeftId(Number(e.target.value))}
        >
          {filtered.map((img) => (
            <option key={img.id} value={img.id}>
              {t("patientFile.beforeOption", {
                fdi: img.toothFdi,
                type: typeLabel(img.imageType),
              })}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border px-2 text-sm"
          value={right?.id ?? ""}
          onChange={(e) => setRightId(Number(e.target.value))}
        >
          {filtered.map((img) => (
            <option key={img.id} value={img.id}>
              {t("patientFile.afterOption", {
                fdi: img.toothFdi,
                type: typeLabel(img.imageType),
              })}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {[left, right].map((img, idx) =>
          img ? (
            <div
              key={`${idx}-${img.id}`}
              className={cn(
                "overflow-hidden rounded-xl border bg-slate-50",
                idx === 0 ? "border-slate-300" : "border-teal-300"
              )}
            >
              <div className="border-b px-3 py-1.5 text-xs font-semibold text-slate-600">
                {t("patientFile.compareCaption", {
                  side: idx === 0 ? t("patientFile.before") : t("patientFile.after"),
                  fdi: img.toothFdi,
                  type: typeLabel(img.imageType),
                })}
              </div>
              <img
                src={img.imageUrl}
                alt=""
                className="aspect-square w-full object-contain bg-black/5"
              />
              {img.caption ? (
                <p className="p-2 text-xs text-slate-600">{img.caption}</p>
              ) : null}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
