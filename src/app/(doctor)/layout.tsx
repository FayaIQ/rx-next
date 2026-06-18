import { requireSubscription } from "@/lib/auth-server";
import { DoctorSidebar } from "@/components/layout/doctor-sidebar";
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
      <DoctorSidebar />
      <div
        className="min-h-screen rx-app-bg transition-[margin] lg:mr-[var(--rx-sidebar-width)]"
      >
        <SyncProvider>{children}</SyncProvider>
      </div>
    </div>
  );
}
