import { useQuery } from "@tanstack/react-query";
import { fetchFieldsOfflineFirst } from "@/lib/data/offline-api";
import { queryKeys } from "@/lib/query-keys";

export function usePatientFields() {
  return useQuery({
    queryKey: queryKeys.patientFields.all,
    queryFn: fetchFieldsOfflineFirst,
    staleTime: 60_000,
    retry: (failureCount) => navigator.onLine && failureCount < 1,
  });
}
