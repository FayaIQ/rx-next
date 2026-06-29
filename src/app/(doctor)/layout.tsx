import { requireSubscription } from "@/lib/auth-server";
import { DoctorNavPill } from "@/components/layout/doctor-nav-pill";
import { DoctorShellExtras } from "@/components/layout/doctor-shell-extras";

export const dynamic = "force-dynamic";

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSubscription();

  return (
    <div className="min-h-screen">
      <div className="min-h-screen rx-app-bg pb-[var(--rx-nav-pill-offset)]">
        {children}
      </div>
      <DoctorNavPill />
      <DoctorShellExtras />
    </div>
  );
}
