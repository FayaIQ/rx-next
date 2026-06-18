"use client";

import { Users, Calendar } from "lucide-react";
import { SidebarShell } from "@/components/layout/sidebar-shell";

const navItems = [
  { href: "/secretary/patients", label: "مرضى الطبيب", icon: Users },
  { href: "/secretary/dates", label: "المواعيد", icon: Calendar },
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
