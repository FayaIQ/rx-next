"use client";

import { SecretarySidebar } from "@/components/layout/secretary-sidebar";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

export default function SecretaryLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = useLocale();
  const isRtl = locale === "ar";

  return (
    <div className="min-h-screen">
      <SecretarySidebar />
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
