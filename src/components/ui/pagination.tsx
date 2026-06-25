"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PAGE_SIZE_OPTIONS,
  type PaginationMeta,
} from "@/lib/pagination";

type Props = {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
};

function pageNumbers(
  current: number,
  total: number
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("ellipsis");
  if (total > 1) pages.push(total);
  return pages;
}

export function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  className,
}: Props) {
  const { page, pageSize, total, totalPages, hasPrev, hasNext } = pagination;
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-rx-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-xs text-rx-muted">
        عرض{" "}
        <span className="font-medium text-rx-text">{from}</span>–
        <span className="font-medium text-rx-text">{to}</span> من{" "}
        <span className="font-medium text-rx-text">{total}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <select
            className="h-8 rounded-lg border border-rx-border bg-rx-surface px-2 text-xs focus:border-rx-primary focus:outline-none focus:ring-2 focus:ring-rx-primary/20"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="عدد العناصر في الصفحة"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / صفحة
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={!hasPrev}
            onClick={() => onPageChange(page - 1)}
            aria-label="الصفحة السابقة"
          >
            <ChevronRight size={16} />
          </Button>

          {pageNumbers(page, totalPages).map((p, i) =>
            p === "ellipsis" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-rx-muted">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="size-8 min-w-8 px-0"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
            aria-label="الصفحة التالية"
          >
            <ChevronLeft size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
