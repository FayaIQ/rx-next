"use client";

import Image from "next/image";
import { useLocale } from "@/i18n/locale-provider";

export function LandingRxDemo() {
  const { t, dir } = useLocale();

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
          <Image
            src="/why-rx-img.png"
            alt={t("landing.demoLockedTitle")}
            fill
            sizes="(min-width: 1200px) 900px, 82vw"
            className="object-cover object-center"
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
