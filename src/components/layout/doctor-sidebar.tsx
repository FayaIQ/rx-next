"use client";

import {
  Calendar,
  ClipboardList,
  Home,
  Pill,
  Settings,
  Smile,
  Users,
  FileText,
  Wallet,
  BarChart3,
} from "lucide-react";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { useLocale } from "@/i18n/locale-provider";

export function DoctorSidebar() {
  const { t } = useLocale();

  const navItems = [
    { href: "/home", label: t("nav.writePrescription"), icon: Home },
    { href: "/dates", label: t("nav.appointments"), icon: Calendar },
    { href: "/pharmaceutical", label: t("nav.medicines"), icon: Pill },
    { href: "/patients", label: t("nav.patients"), icon: Users },
    { href: "/dental", label: t("nav.dental"), icon: Smile },
    { href: "/finances", label: t("nav.finances"), icon: Wallet },
    { href: "/reports", label: t("nav.reports"), icon: BarChart3 },
    { href: "/prescriptions", label: t("nav.prescriptions"), icon: FileText },
    { href: "/recipe-settings", label: t("nav.recipeSettings"), icon: ClipboardList },
    { href: "/setting", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <SidebarShell
      theme="doctor"
      brandSubtitle={t("nav.doctorPanel")}
      items={navItems}
    />
  );
}
