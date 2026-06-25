import { useQuery } from "@tanstack/react-query";
import { fetchFieldsOfflineFirst } from "@/lib/data/offline-api";

export function usePatientFields() {
  return useQuery({
    queryKey: ["fields"],
    queryFn: fetchFieldsOfflineFirst,
    staleTime: 60_000,
    retry: (failureCount) => navigator.onLine && failureCount < 1,
  });
}
