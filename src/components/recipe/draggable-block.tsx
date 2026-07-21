"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, MoveDiagonal2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-provider";

export type PositionKey = "patient" | "ageGender" | "phone" | "date" | "items";

type Props = {
  id: PositionKey | string;
  label: string;
  x: number;
  y: number;
  onMove: (x: number, y: number) => void;
  onSelect?: (id: PositionKey | string) => void;
  selected?: boolean;
  className?: string;
  children: React.ReactNode;
  anchor?: "center" | "top-start";
  widthPct?: number;
  heightPct?: number;
  onResize?: (width: number, height: number) => void;
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function round1(v: number) {
  return Math.round(v * 10) / 10;
}

export function DraggableBlock({
  id,
  label,
  x,
  y,
  onMove,
  onSelect,
  selected,
  className,
  children,
  anchor = "center",
  widthPct,
  heightPct,
  onResize,
}: Props) {
  const { t } = useLocale();
  const blockRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<"idle" | "drag" | "resize">("idle");
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const livePos = useRef({ x, y });
  const liveSize = useRef({
    w: widthPct ?? 0,
    h: heightPct ?? 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [live, setLive] = useState<{
    x: number;
    y: number;
    w?: number;
    h?: number;
  } | null>(null);

  const resizable = widthPct != null && heightPct != null && !!onResize;

  const displayX = live?.x ?? x;
  const displayY = live?.y ?? y;
  const displayW = live?.w ?? widthPct;
  const displayH = live?.h ?? heightPct;

  const getCanvasRect = useCallback(() => {
    return blockRef.current
      ?.closest("[data-recipe-canvas]")
      ?.getBoundingClientRect();
  }, []);

  const applyLivePosition = useCallback((nextX: number, nextY: number) => {
    livePos.current = { x: nextX, y: nextY };
    setLive((prev) => ({
      x: nextX,
      y: nextY,
      w: prev?.w,
      h: prev?.h,
    }));
  }, []);

  const applyLiveSize = useCallback((nextW: number, nextH: number) => {
    liveSize.current = { w: nextW, h: nextH };
    setLive((prev) => ({
      x: prev?.x ?? livePos.current.x,
      y: prev?.y ?? livePos.current.y,
      w: nextW,
      h: nextH,
    }));
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const rect = getCanvasRect();
      if (!rect) return;

      if (modeRef.current === "resize" && onResize) {
        const dx = ((e.clientX - resizeStart.current.x) / rect.width) * 100;
        const dy = ((e.clientY - resizeStart.current.y) / rect.height) * 100;
        const baseX = livePos.current.x;
        const baseY = livePos.current.y;
        const maxW = 100 - baseX;
        const maxH = 100 - baseY;
        applyLiveSize(
          clamp(resizeStart.current.w + dx, 25, Math.min(92, maxW)),
          clamp(resizeStart.current.h + dy, 15, Math.min(80, maxH))
        );
        return;
      }

      if (modeRef.current === "drag") {
        const nextX = clamp(
          ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.current.x,
          1,
          98
        );
        const nextY = clamp(
          ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.current.y,
          1,
          98
        );
        applyLivePosition(nextX, nextY);
      }
    },
    [applyLivePosition, applyLiveSize, getCanvasRect, onResize]
  );

  const endInteraction = useCallback(() => {
    if (modeRef.current === "drag") {
      onMove(round1(livePos.current.x), round1(livePos.current.y));
    }
    if (modeRef.current === "resize" && onResize) {
      onResize(round1(liveSize.current.w), round1(liveSize.current.h));
    }

    modeRef.current = "idle";
    setIsDragging(false);
    setIsResizing(false);
    setLive(null);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", endInteraction);
    window.removeEventListener("pointercancel", endInteraction);
  }, [handlePointerMove, onMove, onResize]);

  useEffect(() => {
    livePos.current = { x, y };
  }, [x, y]);

  useEffect(() => {
    if (widthPct != null && heightPct != null) {
      liveSize.current = { w: widthPct, h: heightPct };
    }
  }, [widthPct, heightPct]);

  useEffect(() => () => endInteraction(), [endInteraction]);

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-resize-handle]")) return;

      e.preventDefault();
      e.stopPropagation();
      onSelect?.(id);

      livePos.current = { x, y };

      const rect = getCanvasRect();
      const blockRect = blockRef.current?.getBoundingClientRect();
      if (rect && blockRect) {
        if (anchor === "center") {
          dragOffset.current = {
            x:
              ((blockRect.left + blockRect.width / 2 - rect.left) / rect.width) *
                100 -
              x,
            y:
              ((blockRect.top + blockRect.height / 2 - rect.top) / rect.height) *
                100 -
              y,
          };
        } else {
          dragOffset.current = {
            x: ((blockRect.left - rect.left) / rect.width) * 100 - x,
            y: ((blockRect.top - rect.top) / rect.height) * 100 - y,
          };
        }
      } else {
        dragOffset.current = { x: 0, y: 0 };
      }

      modeRef.current = "drag";
      setIsDragging(true);
      setLive({ x, y, w: widthPct, h: heightPct });
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", endInteraction);
      window.addEventListener("pointercancel", endInteraction);
    },
    [
      anchor,
      endInteraction,
      getCanvasRect,
      handlePointerMove,
      heightPct,
      id,
      onSelect,
      widthPct,
      x,
      y,
    ]
  );

  const startResize = useCallback(
    (e: React.PointerEvent) => {
      if (!onResize || widthPct == null || heightPct == null) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect?.(id);
      livePos.current = { x, y };
      liveSize.current = { w: widthPct, h: heightPct };
      modeRef.current = "resize";
      setIsResizing(true);
      setLive({ x, y, w: widthPct, h: heightPct });
      resizeStart.current = { x: e.clientX, y: e.clientY, w: widthPct, h: heightPct };
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", endInteraction);
      window.addEventListener("pointercancel", endInteraction);
    },
    [
      endInteraction,
      handlePointerMove,
      heightPct,
      id,
      onResize,
      onSelect,
      widthPct,
      x,
      y,
    ]
  );

  const active = selected || isDragging || isResizing;
  const interacting = isDragging || isResizing;

  return (
    <div
      ref={blockRef}
      className={cn(
        "group absolute touch-none select-none",
        anchor === "center" && "-translate-x-1/2 -translate-y-1/2",
        active && "z-30",
        !active && "z-10",
        className
      )}
      style={{
        left: `${displayX}%`,
        top: `${displayY}%`,
        ...(resizable && displayW != null && displayH != null
          ? { width: `${displayW}%`, height: `${displayH}%` }
          : {}),
        willChange: interacting ? "left, top, width, height" : undefined,
      }}
      onPointerDown={(e) => {
        onSelect?.(id);
        if (resizable) return;
        startDrag(e);
      }}
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-dashed",
          interacting
            ? "transition-none"
            : "transition-[border-color,background-color,box-shadow]",
          active
            ? "border-rx-primary bg-rx-primary/10 shadow-md"
            : "border-transparent hover:border-rx-primary/40 hover:bg-white/60",
          isDragging && "cursor-grabbing",
          !resizable && !isDragging && "cursor-grab"
        )}
      >
        {resizable ? (
          <div
            data-drag-handle
            className={cn(
              "flex shrink-0 cursor-grab items-center gap-1.5 border-b border-rx-primary/20 px-2 py-1.5 active:cursor-grabbing",
              active ? "bg-rx-primary text-white" : "bg-slate-700/75 text-white"
            )}
            onPointerDown={startDrag}
          >
            <GripVertical size={12} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
              {label}
            </span>
            <span className="text-[10px] opacity-75">{t("recipe.dragToMove")}</span>
          </div>
        ) : (
          <div
            data-drag-handle
            className={cn(
              "absolute -top-7 right-0 z-10 flex cursor-grab items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap active:cursor-grabbing",
              active
                ? "bg-rx-primary text-white"
                : "bg-slate-700/80 text-white opacity-0 group-hover:opacity-100"
            )}
          >
            <GripVertical size={10} />
            {label}
          </div>
        )}

        <div className="pointer-events-none min-h-0 flex-1 overflow-hidden p-2">
          <div className="h-full overflow-hidden break-words [overflow-wrap:anywhere]">
            {children}
          </div>
        </div>

        {resizable && (
          <div
            data-resize-handle
            role="presentation"
            title={t("recipe.dragToResize")}
            className={cn(
              "absolute bottom-0 left-0 z-20 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-tr bg-rx-primary text-white shadow",
              active ? "opacity-100" : "opacity-70 group-hover:opacity-100"
            )}
            onPointerDown={startResize}
          >
            <MoveDiagonal2 size={11} />
          </div>
        )}
      </div>
    </div>
  );
}
