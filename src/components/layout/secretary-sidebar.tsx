"use client";

import { Users, Calendar, Wallet, Stethoscope } from "lucide-react";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { useLocale } from "@/i18n/locale-provider";

export function SecretarySidebar() {
  const { t } = useLocale();

  const navItems = [
    {
      href: "/secretary/desk",
      label: t("nav.secretaryDesk"),
      icon: Stethoscope,
    },
    { href: "/secretary/dates", label: t("nav.appointments"), icon: Calendar },
    {
      href: "/secretary/patients",
      label: t("nav.doctorPatients"),
      icon: Users,
    },
    { href: "/secretary/finances", label: t("nav.finances"), icon: Wallet },
  ];

  return (
    <SidebarShell
      theme="secretary"
      brandSubtitle={t("nav.secretaryPanel")}
      items={navItems}
    />
  );
}
