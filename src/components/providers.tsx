"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { DevServiceWorkerCleanup } from "@/components/pwa/dev-sw-cleanup";
import { LocaleProvider, useLocale } from "@/i18n/locale-provider";
import { SyncProvider } from "@/components/sync/sync-provider";

function AppToaster() {
  const { dir } = useLocale();
  return (
    <Toaster
      position="top-center"
      dir={dir}
      toastOptions={{
        className: "rounded-xl shadow-lg",
        style: {
          background: "#0f172a",
          color: "#f8fafc",
          border: "1px solid #334155",
          fontFamily: "var(--font-ibm-arabic)",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>
          <DevServiceWorkerCleanup />
          <SyncProvider>{children}</SyncProvider>
          <InstallPrompt />
          <AppToaster />
        </QueryClientProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
