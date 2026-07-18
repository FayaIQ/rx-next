"use client";

import { GlobalSearch } from "@/components/search/global-search";
import { SmartAlertsPanel } from "@/components/alerts/smart-alerts-panel";
import { useClinicFeatureEnabled } from "@/components/clinic/clinic-features-provider";

export function DoctorShellExtras() {
  const searchEnabled = useClinicFeatureEnabled("search");
  const alertsEnabled = useClinicFeatureEnabled("alerts");

  return (
    <>
      {searchEnabled ? <GlobalSearch /> : null}
      {alertsEnabled ? (
        <div className="pointer-events-none fixed left-3 top-20 z-40 hidden w-72 max-xl:hidden xl:block">
          <div className="pointer-events-auto">
            <SmartAlertsPanel compact />
          </div>
        </div>
      ) : null}
    </>
  );
}
