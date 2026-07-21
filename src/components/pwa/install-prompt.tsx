"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/locale-provider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const { t } = useLocale();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pwa-install-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-lg lg:left-auto lg:right-6">
      <div className="text-sm">
        <p className="font-semibold">{t("pwa.title")}</p>
        <p className="text-rx-muted">{t("pwa.subtitle")}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          onClick={async () => {
            await deferred.prompt();
            setDeferred(null);
          }}
        >
          <Download size={14} />
          {t("pwa.install")}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            localStorage.setItem("pwa-install-dismissed", "1");
            setDismissed(true);
            setDeferred(null);
          }}
          aria-label={t("common.close")}
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
