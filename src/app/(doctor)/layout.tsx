import { requireSubscription } from "@/lib/auth-server";
import { DoctorNavPill } from "@/components/layout/doctor-nav-pill";
import { SyncProvider } from "@/components/sync/sync-provider";

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
        <SyncProvider>{children}</SyncProvider>
      </div>
      <DoctorNavPill />
    </div>
  );
}
