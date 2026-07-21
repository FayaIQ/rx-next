"use client";

import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = useLocale();
  const isRtl = locale === "ar";

  return (
    <div className="min-h-screen">
      <AdminSidebar />
      <div
        className={cn(
          "min-h-screen rx-app-bg",
          isRtl
            ? "lg:mr-[var(--rx-sidebar-width)]"
            : "lg:ml-[var(--rx-sidebar-width)]"
        )}
      >
        {children}
      </div>
    </div>
  );
}
