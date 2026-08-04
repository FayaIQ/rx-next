"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PAGE_SIZE_OPTIONS,
  type PaginationMeta,
} from "@/lib/pagination";
import { useLocale } from "@/i18n/locale-provider";

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
  const { t, locale } = useLocale();
  const { page, pageSize, total, totalPages, hasPrev, hasNext } = pagination;
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const isRtl = locale === "ar";
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div
      className={cn(
        "border-t border-rx-border/60 px-4 py-4",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-rx-text">
          {t("ui.showingRange", { from, to, total })}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={() => onPageChange(page - 1)}
            aria-label={t("ui.prevPage")}
            className="h-9 px-3 text-sm font-medium"
          >
            <PrevIcon size={16} className="me-1" />
            {isRtl ? "السابق" : "Prev"}
          </Button>

          {pageNumbers(page, totalPages).map((p, i) =>
            p === "ellipsis" ? (
              <span key={`ellipsis-${i}`} className="px-2 text-sm text-rx-muted">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="h-9 w-9 px-0 text-sm font-semibold"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
            aria-label={t("ui.nextPage")}
            className="h-9 px-3 text-sm font-medium"
          >
            {isRtl ? "التالي" : "Next"}
            <NextIcon size={16} className="ms-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
