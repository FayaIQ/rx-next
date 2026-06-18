import { AdminSidebar } from "@/components/layout/admin-sidebar";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AdminSidebar />
      <div className="min-h-screen rx-app-bg lg:mr-[var(--rx-sidebar-width)]">
        {children}
      </div>
    </div>
  );
}
