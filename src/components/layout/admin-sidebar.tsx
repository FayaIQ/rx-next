"use client";

import {
  LayoutDashboard,
  Users,
  CreditCard,
  Stethoscope,
  UserCog,
  Package,
  ToggleLeft,
  BarChart3,
} from "lucide-react";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { useLocale } from "@/i18n/locale-provider";

export function AdminSidebar() {
  const { t, locale } = useLocale();

  const navItems = [
    {
      href: "/dashboard",
      label: t("nav.adminDashboard"),
      icon: LayoutDashboard,
      exact: true,
    },
    { href: "/dashboard/acquisition", label: locale === "ar" ? "التفعيل والأداء" : "Activation & performance", icon: BarChart3 },
    { href: "/dashboard/users", label: t("nav.users"), icon: Users },
    {
      href: "/dashboard/subscriptions",
      label: t("nav.subscriptions"),
      icon: CreditCard,
    },
    { href: "/dashboard/doctors", label: t("nav.doctors"), icon: Stethoscope },
    {
      href: "/dashboard/secretaries",
      label: t("nav.secretaries"),
      icon: UserCog,
    },
    { href: "/dashboard/packages", label: t("nav.packages"), icon: Package },
    {
      href: "/dashboard/features",
      label: t("nav.features"),
      icon: ToggleLeft,
    },
  ];

  return (
    <SidebarShell
      theme="admin"
      brandSubtitle={t("nav.adminPanel")}
      items={navItems}
    />
  );
}
