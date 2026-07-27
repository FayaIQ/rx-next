import { useQuery } from "@tanstack/react-query";
import { fetchFieldsOfflineFirst } from "@/lib/data/offline-api";
import { queryKeys } from "@/lib/query-keys";
import { useSyncStore } from "@/stores/sync-store";

export function usePatientFields() {
  const online = useSyncStore((state) => state.online);

  return useQuery({
    queryKey: queryKeys.patientFields.all,
    queryFn: fetchFieldsOfflineFirst,
    staleTime: 60_000,
    retry: (failureCount) => online && failureCount < 1,
  });
}
