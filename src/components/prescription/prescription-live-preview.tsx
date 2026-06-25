"use client";

import { useEffect, useRef, useState } from "react";
import { PrescriptionDocument } from "@/components/prescription/prescription-document";
import type { PrescriptionDocumentData } from "@/components/prescription/prescription-document";
import { paperDimensions } from "@/lib/recipe-paper";
import { cn } from "@/lib/utils";

type Props = {
  data: PrescriptionDocumentData;
  className?: string;
  label?: string;
};

function paperSizeMm(paperSize: string) {
  return paperSize === "A5"
    ? { width: 148, height: 210 }
    : { width: 210, height: 297 };
}

const PX_PER_MM = 3.7795275591;

export function PrescriptionLivePreview({
  data,
  className,
  label = "معاينة حية",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const paperSize = data.settings.paperSize;
  const dims = paperDimensions(paperSize);
  const sizeMm = paperSizeMm(paperSize);
  const paperWidthPx = sizeMm.width * PX_PER_MM;
  const paperHeightPx = sizeMm.height * PX_PER_MM;

  useEffect(() => {
    function updateScale() {
      const container = containerRef.current;
      if (!container) return;

      const availableW = container.clientWidth;
      if (availableW <= 0) return;

      setScale(availableW / paperWidthPx);
    }

    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [paperWidthPx]);

  const scaledWidth = paperWidthPx * scale;
  const scaledHeight = paperHeightPx * scale;

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-xl border border-rx-border bg-slate-100/80",
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-rx-border/80 bg-white/80 px-3 py-1.5">
        <p className="text-xs font-semibold text-rx-text">{label}</p>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-700">
          مباشر
        </span>
      </div>

      <div ref={containerRef} className="overflow-hidden">
        <div
          className="relative mx-auto"
          style={{
            width: scaledWidth,
            height: scaledHeight,
          }}
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: dims.width,
              height: dims.height,
              transform: `scale(${scale})`,
            }}
          >
            <PrescriptionDocument
              data={data}
              className="shadow-md ring-1 ring-black/5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
