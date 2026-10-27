"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { DevServiceWorkerCleanup } from "@/components/pwa/dev-sw-cleanup";
import { LocaleProvider, useLocale } from "@/i18n/locale-provider";
import { SyncProvider } from "@/components/sync/sync-provider";
import { GoogleTags } from "@/components/analytics/google-tags";
import { ProductMeasurement } from "@/components/analytics/product-measurement";
import { MicrosoftClarity } from "@/components/analytics/microsoft-clarity";
import { MetaPixel } from "@/components/analytics/meta-pixel";

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
            // Offline-aware functions must run to read IndexedDB or cached responses.
            networkMode: "always",
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
          mutations: {
            // Queue persistence belongs to the offline API, not a paused query mutation.
            networkMode: "always",
          },
        },
      })
  );

  return (
    <SessionProvider>
      <MicrosoftClarity />
      <GoogleTags />
      <MetaPixel />
      <ProductMeasurement />
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
