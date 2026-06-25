"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export function usePaginationState(resetKey?: string | number) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  const onPageChange = useCallback((next: number) => {
    setPage(next);
  }, []);

  const onPageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return { page, pageSize, setPage, setPageSize, onPageChange, onPageSizeChange };
}
