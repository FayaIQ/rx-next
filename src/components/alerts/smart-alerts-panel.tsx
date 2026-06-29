"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, ChevronLeft, Info } from "lucide-react";
import { rxApi } from "@/lib/api/rx-client";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES = {
  danger: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
} as const;

export function SmartAlertsPanel({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ["smart-alerts"],
    queryFn: () => rxApi.alerts.smart(),
    refetchInterval: 5 * 60_000,
  });

  const alerts = data?.alerts ?? [];

  if (isLoading) return null;
  if (alerts.length === 0) return null;

  const visible = compact ? alerts.slice(0, 4) : alerts;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <Bell size={15} className="text-amber-600" />
        <span className="text-sm font-semibold text-slate-800">تنبيهات</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
          {data?.count ?? alerts.length}
        </span>
      </div>

      <ul className="divide-y divide-slate-100">
        {visible.map((alert) => {
          const Icon =
            alert.severity === "danger"
              ? AlertTriangle
              : alert.severity === "warning"
                ? AlertTriangle
                : Info;

          return (
            <li key={alert.id}>
              <Link
                href={alert.href}
                className={cn(
                  "flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-slate-50",
                  SEVERITY_STYLES[alert.severity]
                )}
              >
                <Icon size={14} className="mt-0.5 shrink-0 opacity-80" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{alert.title}</p>
                  <p className="line-clamp-2 text-xs opacity-90">{alert.message}</p>
                </div>
                <ChevronLeft size={14} className="shrink-0 opacity-50" />
              </Link>
            </li>
          );
        })}
      </ul>

      {compact && alerts.length > 4 ? (
        <p className="border-t border-slate-100 px-3 py-2 text-center text-xs text-slate-500">
          +{alerts.length - 4} تنبيهات أخرى
        </p>
      ) : null}
    </div>
  );
}
