"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, RotateCcw } from "lucide-react";
import { useLocale } from "@/i18n/locale-provider";
import { trackAnalyticsEvent } from "@/lib/analytics";

type DeviceKey = "phone" | "tablet" | "desktop";

type DeviceSpec = {
  frame: string;
  /** Intrinsic aspect of the frame PNG (w / h). */
  frameAspect: number;
  /** Screen cut-out inside the frame, measured from the PNG's alpha channel. */
  screen: { left: number; top: number; width: number; height: number };
  /** Logical viewport the demo renders at, so it hits the real breakpoints. */
  viewportWidth: number;
  /** Widest the frame is allowed to render. */
  maxWidth: number;
};

const DEVICES: Record<DeviceKey, DeviceSpec> = {
  phone: {
    frame: "/landing/iphone-frame.png",
    frameAspect: 1221 / 2463,
    screen: { left: 5.897, top: 6.902, width: 88.452, height: 90.621 },
    viewportWidth: 390,
    maxWidth: 300,
  },
  tablet: {
    frame: "/landing/ipad-frame.png",
    frameAspect: 2286 / 3168,
    screen: { left: 5.206, top: 6.85, width: 89.545, height: 85.354 },
    viewportWidth: 834,
    maxWidth: 440,
  },
  desktop: {
    frame: "/landing/live-demo-monitor.png",
    frameAspect: 2800 / 2234,
    screen: { left: 4.28, top: 5.28, width: 91.44, height: 74.58 },
    viewportWidth: 1440,
    maxWidth: 980,
  },
};

/** Aspect of the screen cut-out itself, derived from the frame measurements. */
function screenAspect(spec: DeviceSpec) {
  return (spec.screen.width / spec.screen.height) * spec.frameAspect;
}

function deviceForWidth(width: number): DeviceKey {
  // A non-positive width means the viewport hasn't been laid out yet; keep the
  // server-rendered desktop frame rather than flashing the phone one.
  if (width <= 0) return "desktop";
  if (width < 640) return "phone";
  if (width < 1024) return "tablet";
  return "desktop";
}

/**
 * The demo signs into a shared account. `credentialless` keeps that cookie in
 * an ephemeral jar so it can never become the visitor's own session — but it is
 * Chromium-only and silently ignored elsewhere (notably iOS/Safari), where the
 * cookie would leak out and the proxy would then bounce the visitor off every
 * page. So the live frame only runs where the isolation genuinely exists.
 */
function supportsCredentialless() {
  return (
    typeof HTMLIFrameElement !== "undefined" &&
    "credentialless" in HTMLIFrameElement.prototype
  );
}

/** Give up on a live frame that does not finish loading. */
const LOAD_TIMEOUT_MS = 30_000;

export function LandingRxDemo() {
  const { t, dir, locale } = useLocale();
  const screenRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [scale, setScale] = useState(0);
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null);
  const [live, setLive] = useState(false);
  const [srcReady, setSrcReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reportUnavailable = useCallback(() => {
    setLive(false);
    setSrcReady(false);
    setLoaded(false);
    setFailed(true);
    trackAnalyticsEvent("demo_failed");
  }, []);

  // Pick the frame that matches the visitor's screen.
  useEffect(() => {
    const pick = () => setDevice(deviceForWidth(window.innerWidth));
    pick();
    window.addEventListener("resize", pick);
    return () => window.removeEventListener("resize", pick);
  }, []);

  // Only attempt the live frame where the cookie can actually be isolated.
  useEffect(() => {
    setSupported(supportsCredentialless());
  }, []);

  // Scale the logical viewport down into the frame's screen cut-out.
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;

    const measure = () => {
      const { width } = el.getBoundingClientRect();
      if (width > 0) setScale(width / DEVICES[device].viewportWidth);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [device]);

  // The attribute has to land before the src does, so the iframe mounts blank
  // and only then gets its source.
  useEffect(() => {
    if (!iframeEl) return;
    iframeEl.setAttribute("credentialless", "");
    setSrcReady(true);
  }, [iframeEl]);

  useEffect(() => {
    if (!iframeEl || !srcReady) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeEl.contentWindow) return;
      if (event.data?.type === "rx-demo-ready") {
        setLoaded(true);
        trackAnalyticsEvent("demo_ready");
      } else if (event.data?.type === "rx-demo-failed") reportUnavailable();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [iframeEl, srcReady, reportUnavailable]);

  function startDemo() {
    if (!supported) return;
    setFailed(false);
    setLoaded(false);
    setSrcReady(false);
    setAttempt((value) => value + 1);
    setLive(true);
    trackAnalyticsEvent("demo_requested");
  }

  // Never let a stalled frame sit on a spinner forever.
  useEffect(() => {
    if (!live || !srcReady || loaded) return;
    const timer = setTimeout(() => {
      reportUnavailable();
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [live, srcReady, loaded, reportUnavailable]);

  const spec = DEVICES[device];
  const viewportHeight = Math.round(spec.viewportWidth / screenAspect(spec));
  const showSpinner = live && !loaded;

  return (
    <div className="mt-12" dir={dir}>
      <div
        className="relative mx-auto w-full"
        style={{
          maxWidth: spec.maxWidth,
          aspectRatio: `${spec.frameAspect}`,
        }}
      >
        <div
          ref={screenRef}
          className="absolute z-10 overflow-hidden bg-white"
          style={{
            left: `${spec.screen.left}%`,
            top: `${spec.screen.top}%`,
            width: `${spec.screen.width}%`,
            height: `${spec.screen.height}%`,
          }}
        >
          {!live && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#f5f8fa] p-4 text-center text-slate-700">
              <div className="max-w-sm space-y-4">
                <p className="text-sm font-semibold" role="status">
                  {supported === false
                    ? locale === "en" ? "Book a free walkthrough to explore RX on your device." : "احجز شرحاً مجانياً حتى تتعرّف على RX على جهازك."
                    : failed
                      ? locale === "en" ? "The demo could not start. Please try again." : "تعذّر تشغيل المعاينة. تگدر تعيد المحاولة."
                      : locale === "en" ? "Explore RX with a sample clinic." : "جرّب RX ببيانات عيادة تجريبية."}
                </p>
                {supported !== false && (
                  <button type="button" onClick={startDemo} disabled={supported === null}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0B5F5A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                    {failed ? <RotateCcw size={18} /> : <Play size={18} />}
                    {failed ? locale === "en" ? "Try again" : "إعادة المحاولة" : locale === "en" ? "Start demo" : "تشغيل التجربة"}
                  </button>
                )}
                <div className="flex flex-wrap justify-center gap-3 text-xs font-semibold">
                  <Link href="/auth/signup" className="text-[#0B5F5A] underline">{locale === "en" ? "Start free trial" : "ابدأ التجربة المجانية"}</Link>
                  <a href="https://wa.me/9647847076026" target="_blank" rel="noopener noreferrer" className="text-[#0B5F5A] underline">{locale === "en" ? "Free walkthrough" : "شرح مجاني"}</a>
                </div>
              </div>
            </div>
          )}
          {showSpinner && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#f5f8fa] text-slate-700">
              <div className="px-4 text-center">
                <Loader2
                  className="mx-auto animate-spin text-[#10A6C3]"
                  size={26}
                />
                <p className="mt-3 text-xs font-semibold sm:text-sm">
                  {locale === "en"
                    ? "Loading the live system…"
                    : "جاري تحميل النظام الحي…"}
                </p>
              </div>
            </div>
          )}

          {live && scale > 0 && (
            <iframe
              key={attempt}
              ref={setIframeEl}
              src={srcReady ? "/demo-preview" : undefined}
              title={t("landing.demoLockedTitle")}
              onError={reportUnavailable}
              className="absolute left-0 top-0 block border-0 bg-white"
              style={{
                width: spec.viewportWidth,
                height: viewportHeight,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              allow="clipboard-read; clipboard-write"
            />
          )}
        </div>

        <Image
          key={spec.frame}
          src={spec.frame}
          alt=""
          fill
          sizes={`${spec.maxWidth}px`}
          className="pointer-events-none z-20 object-contain drop-shadow-[0_28px_30px_rgba(15,23,42,0.14)]"
        />
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        {t("landing.demoNote")}
      </p>
    </div>
  );
}
