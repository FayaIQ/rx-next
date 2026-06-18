"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, LogOut, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type SidebarTheme = "doctor" | "admin" | "secretary";

const themes: Record<
  SidebarTheme,
  { gradient: string; accent: string; signOutUrl: string }
> = {
  doctor: {
    gradient: "from-[#075985] via-[#0e7490] to-[#134e4a]",
    accent: "bg-white/15 text-white shadow-inner ring-1 ring-white/10",
    signOutUrl: "/auth/signin",
  },
  admin: {
    gradient: "from-[#0c4a6e] via-[#075985] to-[#082f49]",
    accent: "bg-white/15 text-white shadow-inner ring-1 ring-white/10",
    signOutUrl: "/auth/admin",
  },
  secretary: {
    gradient: "from-[#0f766e] via-[#0d9488] to-[#115e59]",
    accent: "bg-white/15 text-white shadow-inner ring-1 ring-white/10",
    signOutUrl: "/auth/login/secretary",
  },
};

type Props = {
  items: NavItem[];
  theme: SidebarTheme;
  brandSubtitle?: string;
};

function getInitials(name?: string | null) {
  if (!name) return "RX";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function SidebarShell({ items, theme, brandSubtitle }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const t = themes[theme];

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "fixed top-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg lg:hidden",
          t.gradient
        )}
        onClick={() => setOpen(!open)}
        aria-label="القائمة"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        style={{ width: "var(--rx-sidebar-width)" }}
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex flex-col bg-gradient-to-b text-white shadow-2xl transition-transform duration-300 ease-out lg:translate-x-0",
          t.gradient,
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-[var(--rx-header-height)] items-center border-b border-white/10 px-4">
          <BrandLogo
            variant="dark"
            size="sm"
            subtitle={brandSubtitle}
          />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? t.accent
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    "shrink-0 transition-transform group-hover:scale-110",
                    active ? "text-white" : "text-white/70"
                  )}
                />
                <span>{item.label}</span>
                {active && (
                  <span className="mr-auto h-1.5 w-1.5 rounded-full bg-teal-300" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-cyan-700 text-xs font-bold text-white">
              {getInitials(session?.user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {session?.user?.name ?? "مستخدم"}
              </p>
              <p className="truncate text-xs text-white/50" dir="ltr">
                {session?.user?.phoneNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: t.signOutUrl })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/15"
          >
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
