"use client";

import { Wifi, WifiOff, RefreshCw, CloudOff } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSyncStore } from "@/stores/sync-store";

export function ConnectionStatus() {
  const { online, syncing, hydrating, pendingCount, hydrated, subscriptionBlocked } =
    useSyncStore();
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

  let label = "متصل";
  let icon = <Wifi size={13} />;
  let className = "bg-cyan-50 text-cyan-700";

  if (subscriptionBlocked) {
    label = "انتهى الاشتراك";
    icon = <CloudOff size={13} />;
    className = "bg-orange-50 text-orange-800";
  } else if (busy) {
    label = hydrating ? "تحميل" : "مزامنة";
    icon = <RefreshCw size={13} className="animate-spin" />;
    className = "bg-sky-50 text-sky-700";
  } else if (!online) {
    label = offlineReady ? "أوفلاين" : "بدون نت";
    icon = offlineReady ? <CloudOff size={13} /> : <WifiOff size={13} />;
    className = offlineReady
      ? "bg-amber-50 text-amber-800"
      : "bg-red-50 text-red-700";
  } else if (pendingCount > 0) {
    label = `${pendingCount} معلّق`;
    className = "bg-amber-50 text-amber-800";
  }

  return (
    <div
      className={cn(
        "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
        className
      )}
      title={
        subscriptionBlocked
          ? "انتهى الاشتراك — البيانات المحلية متاحة بدون مزامنة"
          : !online
          ? offlineReady
            ? "وضع أوفلاين — البيانات المحلية جاهزة"
            : "لا يوجد اتصال"
          : busy
            ? "جاري مزامنة البيانات"
            : pendingCount > 0
              ? "تغييرات بانتظار الرفع للسيرفر"
              : "متصل ومزامَن"
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
