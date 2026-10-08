import { paginateSlice, type PaginationMeta } from "@/lib/pagination";

export async function readMedicinePage<T>(sources: {
  online: boolean;
  page: number;
  pageSize: number;
  remote: () => Promise<{ medicines: T[]; pagination: PaginationMeta }>;
  local: () => Promise<T[]>;
}) {
  if (sources.online) {
    try {
      return await sources.remote();
    } catch {
      // A partial offline cache must never override a successful server search.
    }
  }
  const local = await sources.local();
  const { items, pagination } = paginateSlice(local, sources.page, sources.pageSize);
  return { medicines: items, pagination };
}
