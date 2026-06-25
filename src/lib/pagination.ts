export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const rawSize =
    parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) ||
    DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(100, Math.max(5, rawSize));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

export function buildPaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

export function paginateSlice<T>(
  items: T[],
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: buildPaginationMeta(safePage, pageSize, total),
  };
}

export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: number
): { pageItems: T[]; pagination: PaginationMeta } {
  const result = paginateSlice(items, page, pageSize);
  return { pageItems: result.items, pagination: result.pagination };
}

export function monthBookingRange(month: Date): {
  bookingFrom: string;
  bookingTo: string;
} {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const bookingFrom = `${year}-${pad(monthIndex + 1)}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const bookingTo = `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`;
  return { bookingFrom, bookingTo };
}
