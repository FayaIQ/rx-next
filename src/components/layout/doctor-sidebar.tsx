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
} from "lucide-react";
import { SidebarShell } from "@/components/layout/sidebar-shell";

const navItems = [
  { href: "/home", label: "كتابة الوصفة", icon: Home },
  { href: "/dates", label: "المواعيد", icon: Calendar },
  { href: "/pharmaceutical", label: "مكتبة الأدوية", icon: Pill },
  { href: "/patients", label: "المرضى", icon: Users },
  { href: "/dental", label: "طبلة الأسنان", icon: Smile },
  { href: "/prescriptions", label: "سجل الوصفات", icon: FileText },
  { href: "/recipe-settings", label: "تصميم الوصفة", icon: ClipboardList },
  { href: "/setting", label: "الإعدادات", icon: Settings },
];

export function DoctorSidebar() {
  return (
    <SidebarShell
      theme="doctor"
      brandSubtitle="لوحة الطبيب"
      items={navItems}
    />
  );
}
