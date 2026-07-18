"use client";

import {
  LayoutDashboard,
  Users,
  CreditCard,
  Stethoscope,
  UserCog,
  Package,
  ToggleLeft,
} from "lucide-react";
import { SidebarShell } from "@/components/layout/sidebar-shell";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/users", label: "المستخدمون", icon: Users },
  { href: "/dashboard/subscriptions", label: "الاشتراكات", icon: CreditCard },
  { href: "/dashboard/doctors", label: "الأطباء", icon: Stethoscope },
  { href: "/dashboard/secretaries", label: "السكرتارية", icon: UserCog },
  { href: "/dashboard/packages", label: "الباقات", icon: Package },
  { href: "/dashboard/features", label: "تحكم الصفحات", icon: ToggleLeft },
];

export function AdminSidebar() {
  return (
    <SidebarShell
      theme="admin"
      brandSubtitle="إدارة النظام"
      items={navItems}
    />
  );
}
