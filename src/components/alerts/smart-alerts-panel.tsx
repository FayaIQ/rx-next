"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, ChevronLeft, Info, X } from "lucide-react";
import { rxApi } from "@/lib/api/rx-client";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-provider";

const SEVERITY_STYLES = {
  danger: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
} as const;

const PANEL_COLLAPSED_KEY = "rx-smart-alerts-collapsed";
const DISMISSED_ALERTS_KEY = "rx-smart-alerts-dismissed";

function readDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(DISMISSED_ALERTS_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

function writeDismissedIds(ids: Set<string>) {
  sessionStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...ids]));
}

export function SmartAlertsPanel({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["smart-alerts"],
    queryFn: () => rxApi.alerts.smart(),
    refetchInterval: 5 * 60_000,
  });

  useEffect(() => {
    setCollapsed(sessionStorage.getItem(PANEL_COLLAPSED_KEY) === "1");
    setDismissedIds(readDismissedIds());
    setReady(true);
  }, []);

  const alerts = (data?.alerts ?? []).filter((a) => !dismissedIds.has(a.id));

  function collapsePanel() {
    setCollapsed(true);
    sessionStorage.setItem(PANEL_COLLAPSED_KEY, "1");
  }

  function expandPanel() {
    setCollapsed(false);
    sessionStorage.removeItem(PANEL_COLLAPSED_KEY);
  }

  function dismissAlert(id: string) {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeDismissedIds(next);
      return next;
    });
  }

  function dismissAll() {
    const next = new Set(dismissedIds);
    for (const alert of data?.alerts ?? []) next.add(alert.id);
    setDismissedIds(next);
    writeDismissedIds(next);
    collapsePanel();
  }

  if (!ready || isLoading) return null;
  if (alerts.length === 0 && !(data?.count ?? 0)) return null;

  const totalCount = data?.count ?? alerts.length;
  if (alerts.length === 0) {
    return (
      <button
        type="button"
        onClick={expandPanel}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500 shadow-sm hover:bg-slate-50"
        title={t("alerts.show")}
      >
        <Bell size={14} className="text-slate-400" />
        {t("alerts.noneNew")}
      </button>
    );
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={expandPanel}
        className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
        title={t("alerts.show")}
      >
        <Bell size={14} className="text-amber-600" />
        {t("alerts.count", { count: alerts.length })}
      </button>
    );
  }

  const visible = compact ? alerts.slice(0, 4) : alerts;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <Bell size={15} className="text-amber-600" />
        <span className="text-sm font-semibold text-slate-800">{t("alerts.title")}</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
          {alerts.length}
        </span>
        <div className="ms-auto flex items-center gap-0.5">
          {totalCount > 1 ? (
            <button
              type="button"
              onClick={dismissAll}
              className="rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              {t("alerts.hideAll")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={collapsePanel}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X size={15} />
          </button>
        </div>
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
            <li key={alert.id} className="relative">
              <Link
                href={alert.href}
                className={cn(
                  "flex items-start gap-2 pe-9 ps-3 py-2.5 transition-colors hover:bg-slate-50",
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
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dismissAlert(alert.id);
                }}
                className="absolute left-2 top-2 rounded p-1 text-current/40 hover:bg-black/5 hover:text-current/80"
                aria-label={t("alerts.dismiss")}
                title={t("alerts.hide")}
              >
                <X size={12} />
              </button>
            </li>
          );
        })}
      </ul>

      {compact && alerts.length > 4 ? (
        <p className="border-t border-slate-100 px-3 py-2 text-center text-xs text-slate-500">
          {t("alerts.more", { count: alerts.length - 4 })}
        </p>
      ) : null}
    </div>
  );
}
