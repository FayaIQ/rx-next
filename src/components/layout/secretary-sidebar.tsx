"use client";

import { Users, Calendar, Wallet, Stethoscope } from "lucide-react";
import { SidebarShell } from "@/components/layout/sidebar-shell";

const navItems = [
  { href: "/secretary/desk", label: "واجهة الاستقبال", icon: Stethoscope },
  { href: "/secretary/dates", label: "المواعيد", icon: Calendar },
  { href: "/secretary/patients", label: "مرضى الطبيب", icon: Users },
  { href: "/secretary/finances", label: "المالية", icon: Wallet },
];

export function SecretarySidebar() {
  return (
    <SidebarShell
      theme="secretary"
      brandSubtitle="لوحة السكرتير"
      items={navItems}
    />
  );
}
