"use client";

import { createContext, useContext, useMemo } from "react";
import {
  CLINIC_FEATURE_KEYS,
  type ClinicFeatureKey,
} from "@/lib/clinic-features";

export type ClinicFeatureState = {
  key: ClinicFeatureKey;
  label: string;
  description: string;
  enabled: boolean;
  navHref: string | null;
};

const ClinicFeaturesContext = createContext<{
  features: ClinicFeatureState[];
  enabledMap: Record<ClinicFeatureKey, boolean>;
}>({
  features: [],
  enabledMap: Object.fromEntries(
    CLINIC_FEATURE_KEYS.map((key) => [key, true])
  ) as Record<ClinicFeatureKey, boolean>,
});

export function ClinicFeaturesProvider({
  features,
  children,
}: {
  features: ClinicFeatureState[];
  children: React.ReactNode;
}) {
  const value = useMemo(() => {
    const enabledMap = Object.fromEntries(
      CLINIC_FEATURE_KEYS.map((key) => {
        const row = features.find((f) => f.key === key);
        return [key, row?.enabled ?? true];
      })
    ) as Record<ClinicFeatureKey, boolean>;
    return { features, enabledMap };
  }, [features]);

  return (
    <ClinicFeaturesContext.Provider value={value}>
      {children}
    </ClinicFeaturesContext.Provider>
  );
}

export function useClinicFeatures() {
  return useContext(ClinicFeaturesContext);
}

export function useClinicFeatureEnabled(key: ClinicFeatureKey) {
  const { enabledMap } = useClinicFeatures();
  return enabledMap[key];
}
