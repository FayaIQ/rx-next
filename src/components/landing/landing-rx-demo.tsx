"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/locale-provider";

export function LandingRxDemo() {
  const { t, dir, locale } = useLocale();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [demoFrameReady, setDemoFrameReady] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Load the demo in an ephemeral credential context. This prevents the
    // demo Auth.js cookie from becoming the visitor's normal app session.
    iframe.setAttribute("credentialless", "");
    setDemoFrameReady(true);
  }, []);

  return (
    <div className="mt-12" dir={dir}>
      <div className="relative mx-auto aspect-[2800/2234] w-full max-w-[980px] md:w-[86%] xl:w-[80%]">
        <div
          className="absolute z-10 overflow-hidden bg-[#f5f8fa]"
          style={{
            left: "4.28%",
            top: "5.28%",
            width: "91.44%",
            height: "74.58%",
            borderRadius: "0.2%",
          }}
        >
          {!frameLoaded && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#f5f8fa] text-slate-700">
              <div className="text-center">
                <Loader2
                  className="mx-auto animate-spin text-[#10A6C3]"
                  size={30}
                />
                <p className="mt-3 text-sm font-semibold">
                  {locale === "en"
                    ? "Loading the live system…"
                    : "جاري تحميل النظام الحي…"}
                </p>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={demoFrameReady ? "/demo-preview" : undefined}
            title={t("landing.demoLockedTitle")}
            onLoad={() => {
              if (demoFrameReady) setFrameLoaded(true);
            }}
            className="absolute left-0 top-0 block border-0 bg-white"
            style={{
              width: "160%",
              height: "160%",
              transform: "scale(0.625)",
              transformOrigin: "top left",
            }}
            allow="clipboard-read; clipboard-write"
          />
        </div>

        <Image
          src="/landing/live-demo-monitor.png"
          alt=""
          fill
          sizes="(min-width: 1200px) 980px, 86vw"
          className="pointer-events-none z-20 object-contain drop-shadow-[0_28px_30px_rgba(15,23,42,0.14)]"
        />
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        {t("landing.demoNote")}
      </p>
    </div>
  );
}
