"use client";

import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSyncStore } from "@/stores/sync-store";
import { processSyncQueue } from "@/lib/sync/sync-engine";

const ConnectionStatus = dynamic(
  () =>
    import("@/components/layout/connection-status").then(
      (mod) => mod.ConnectionStatus
    ),
  {
    ssr: false,
    loading: () => (
      <span
        className="inline-block h-7 w-[4.75rem] shrink-0 rounded-full"
        aria-hidden
      />
    ),
  }
);

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  const { pendingCount, syncing, hydrating } = useSyncStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-rx-border/80 bg-rx-surface/80 backdrop-blur-xl">
      <div className="flex h-[var(--rx-header-height)] items-center justify-between gap-4 px-4 lg:px-6">
        <div className="min-w-0 pr-12 lg:pr-0">
          <h1 className="truncate text-lg font-bold text-rx-text">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-rx-muted">{subtitle}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actions}

          {mounted && (hydrating || syncing) && (
            <Badge variant="secondary" className="hidden gap-1 sm:inline-flex">
              <RefreshCw size={12} className="animate-spin" />
              {hydrating ? "تحميل" : "مزامنة"}
            </Badge>
          )}

          {mounted && pendingCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void processSyncQueue()}
              className="hidden border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 sm:inline-flex"
            >
              {pendingCount} معلّق
            </Button>
          )}

          <ConnectionStatus />
        </div>
      </div>
    </header>
  );
}
