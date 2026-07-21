"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Calendar,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Pill,
  Settings,
  Smile,
  Users,
  Wallet,
  ListOrdered,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClinicFeatures } from "@/components/clinic/clinic-features-provider";
import { filterNavHref } from "@/lib/clinic-features";
import { useLocale } from "@/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  exact?: boolean;
};

const navItems: NavItem[] = [
  { href: "/home", labelKey: "nav.writePrescription", icon: Home, exact: true },
  { href: "/queue", labelKey: "nav.queue", icon: ListOrdered },
  { href: "/dates", labelKey: "nav.appointments", icon: Calendar },
  { href: "/pharmaceutical", labelKey: "nav.medicines", icon: Pill },
  { href: "/patients", labelKey: "nav.patients", icon: Users },
  { href: "/dental", labelKey: "nav.dental", icon: Smile },
  { href: "/finances", labelKey: "nav.finances", icon: Wallet },
  { href: "/reports", labelKey: "nav.reports", icon: BarChart3 },
  { href: "/prescriptions", labelKey: "nav.prescriptions", icon: FileText },
  { href: "/recipe-settings", labelKey: "nav.recipeSettings", icon: ClipboardList },
  { href: "/setting", labelKey: "nav.settings", icon: Settings },
];

function getInitials(name?: string | null) {
  if (!name) return "RX";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function DoctorNavPill() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { enabledMap } = useClinicFeatures();
  const { t } = useLocale();

  const visibleItems = navItems.filter((item) =>
    filterNavHref(item.href, enabledMap)
  );

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      aria-label={t("nav.main")}
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-white/60 bg-white/90 p-1.5 shadow-[0_8px_32px_rgb(8_51_68/0.18)] backdrop-blur-xl ring-1 ring-slate-900/5">
        <div className="flex max-w-[min(100vw-5rem,42rem)] items-center gap-0.5 overflow-x-auto rounded-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const label = t(item.labelKey);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                  active
                    ? "bg-gradient-to-br from-cyan-600 to-teal-700 text-white shadow-md shadow-cyan-900/25"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.25 : 2}
                  className={cn(
                    "transition-transform duration-200",
                    !active && "group-hover:scale-110"
                  )}
                />
              </Link>
            );
          })}
        </div>

        <div className="mx-0.5 h-8 w-px shrink-0 bg-slate-200" aria-hidden />

        <LanguageSwitcher variant="toggle" className="shrink-0 shadow-none" />

        <button
          type="button"
          title={session?.user?.name ?? t("common.logout")}
          onClick={() =>
            void signOut({ redirect: false }).then(() => {
              window.location.href = "/auth/signin";
            })
          }
          className="group flex shrink-0 items-center gap-2 rounded-full py-1.5 pe-2 ps-1.5 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-700 text-[0.65rem] font-bold text-white shadow-sm">
            {getInitials(session?.user?.name)}
          </span>
          <LogOut
            size={15}
            className="hidden opacity-70 transition-opacity group-hover:opacity-100 sm:block"
          />
        </button>
      </div>
    </nav>
  );
}
