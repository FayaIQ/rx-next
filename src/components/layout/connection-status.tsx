"use client";

import { Wifi, WifiOff, RefreshCw, CloudOff } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSyncStore } from "@/stores/sync-store";
import { useLocale } from "@/i18n/locale-provider";

export function ConnectionStatus() {
  const { online, syncing, hydrating, pendingCount, hydrated, subscriptionBlocked } =
    useSyncStore();
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        className="inline-block h-7 w-[4.75rem] shrink-0 rounded-full"
        aria-hidden
      />
    );
  }

  const busy = syncing || hydrating;
  const offlineReady = !online && hydrated;

  let label = t("sync.online");
  let icon = <Wifi size={13} />;
  let className = "bg-cyan-50 text-cyan-700";

  if (subscriptionBlocked) {
    label = t("sync.subscriptionEnded");
    icon = <CloudOff size={13} />;
    className = "bg-orange-50 text-orange-800";
  } else if (busy) {
    label = hydrating ? t("sync.loading") : t("sync.syncing");
    icon = <RefreshCw size={13} className="animate-spin" />;
    className = "bg-sky-50 text-sky-700";
  } else if (!online) {
    label = offlineReady ? t("sync.offline") : t("sync.noNet");
    icon = offlineReady ? <CloudOff size={13} /> : <WifiOff size={13} />;
    className = offlineReady
      ? "bg-amber-50 text-amber-800"
      : "bg-red-50 text-red-700";
  } else if (pendingCount > 0) {
    label = t("common.pending", { count: pendingCount });
    className = "bg-amber-50 text-amber-800";
  }

  return (
    <div
      className={cn(
        "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
        className
      )}
      title={subscriptionBlocked ? t("sync.subscriptionHint") : label}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
