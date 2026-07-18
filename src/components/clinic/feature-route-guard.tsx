"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  resolveClinicFeatureForPath,
  isFeatureExemptPage,
} from "@/lib/clinic-features";
import { useClinicFeatures } from "@/components/clinic/clinic-features-provider";

export function FeatureRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { enabledMap, features } = useClinicFeatures();

  useEffect(() => {
    if (!pathname || isFeatureExemptPage(pathname)) return;

    const featureKey = resolveClinicFeatureForPath(pathname);
    if (!featureKey || enabledMap[featureKey]) return;

    const fallback =
      features.find((f) => f.enabled && f.navHref)?.navHref ?? "/subscription/expired";
    if (pathname !== fallback) {
      router.replace(fallback);
    }
  }, [pathname, enabledMap, features, router]);

  return <>{children}</>;
}
