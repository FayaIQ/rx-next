import { SecretarySidebar } from "@/components/layout/secretary-sidebar";
import { requireSecretaryArea } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function SecretaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSecretaryArea();

  return (
    <div className="min-h-screen">
      <SecretarySidebar />
      <div className="min-h-screen rx-app-bg lg:mr-[var(--rx-sidebar-width)]">
        {children}
      </div>
    </div>
  );
}
