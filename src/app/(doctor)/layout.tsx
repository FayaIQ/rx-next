import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireSubscription } from "@/lib/auth-server";
import { toUserId } from "@/lib/user-id";
import {
  getDoctorFallbackPath,
  isDoctorPathAllowed,
  listClinicFeatures,
} from "@/lib/clinic-features";
import { DoctorNavPill } from "@/components/layout/doctor-nav-pill";
import { DoctorShellExtras } from "@/components/layout/doctor-shell-extras";
import { ClinicFeaturesProvider } from "@/components/clinic/clinic-features-provider";
import { FeatureRouteGuard } from "@/components/clinic/feature-route-guard";

export const dynamic = "force-dynamic";

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSubscription();
  const doctorId = toUserId(session.user.id);

  const pathname = (await headers()).get("x-pathname");
  if (pathname && !(await isDoctorPathAllowed(doctorId, pathname))) {
    redirect(await getDoctorFallbackPath(doctorId));
  }

  const features = await listClinicFeatures(doctorId);

  return (
    <ClinicFeaturesProvider features={features}>
      <FeatureRouteGuard>
        <div className="min-h-screen">
          <div className="min-h-screen rx-app-bg pb-[var(--rx-nav-pill-offset)]">
            {children}
          </div>
          <DoctorNavPill />
          <DoctorShellExtras />
        </div>
      </FeatureRouteGuard>
    </ClinicFeaturesProvider>
  );
}
