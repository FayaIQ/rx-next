"use client";
import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { isAnalyticsHost } from "@/lib/analytics";
import { captureAcquisition, measurementRoute, measurementVisitContext, type METRICS } from "@/lib/product-analytics/shared";

type MetricName = typeof METRICS[number];
function send(metric: MetricName, value: number, id: string, rawRoute: string, errorCode?: "script_error" | "postmessage_bridge" | "unhandled_rejection" | "api_error") {
  if (process.env.NODE_ENV !== "production" || !isAnalyticsHost(location.hostname)) return;
  const route = measurementRoute(rawRoute); if (!route) return;
  const width = innerWidth;
  const device = width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop";
  const body = JSON.stringify({ ...measurementVisitContext(), id, metric, value, route, device, ...(errorCode ? { errorCode } : {}) });
  try { void fetch("/api/analytics/telemetry", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => undefined); } catch { /* Never affect the task being measured. */ }
}

export function ProductMeasurement() {
  const pathname = usePathname();
  const initialRoute = useRef(pathname);
  const report = useCallback<Parameters<typeof useReportWebVitals>[0]>((metric) => {
    if (["LCP", "INP", "CLS", "TTFB", "FCP"].includes(metric.name)) send(metric.name as MetricName, metric.value, metric.id, initialRoute.current);
  }, []);
  useReportWebVitals(report);
  useEffect(() => { captureAcquisition(); }, []);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !isAnalyticsHost(location.hostname) || !measurementRoute(pathname)) return;
    const id = crypto.randomUUID();
    send("page_view", 1, `${id}:pageview`, pathname);
    let total = 0; let maximum = 0;
    const observers: PerformanceObserver[] = [];
    const flush = () => { if (total) { send("long_task_total", total, `${id}:longtotal`, pathname); send("long_task_max", maximum, `${id}:longmax`, pathname); } };
    try {
      if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
        const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) { total += entry.duration; maximum = Math.max(maximum, entry.duration); } });
        observer.observe({ type: "longtask" }); observers.push(observer);
      }
      const resources = new PerformanceObserver(list => { for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        if (entry.initiatorType !== "fetch" || !entry.name.startsWith(`${location.origin}/api/`) || entry.name.includes("/api/analytics/")) continue;
        // Resource URLs can contain search terms or IDs. Only their duration leaves this observer.
        send("api_duration", entry.duration, crypto.randomUUID(), pathname);
        if (entry.responseStatus >= 400) send("api_error", 1, crypto.randomUUID(), pathname, "api_error");
      } });
      resources.observe({ type: "resource" }); observers.push(resources);
    } catch { /* Older in-app browsers may not implement observers. */ }
    const onError = (event: ErrorEvent) => {
      const code = /postmessage|java object is gone/i.test(event.message) ? "postmessage_bridge" : "script_error";
      send("js_error", 1, crypto.randomUUID(), pathname, code);
    };
    const onRejection = () => send("js_error", 1, crypto.randomUUID(), pathname, "unhandled_rejection");
    const onHidden = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("error", onError); window.addEventListener("unhandledrejection", onRejection);
    document.addEventListener("visibilitychange", onHidden);
    return () => { flush(); observers.forEach(o => o.disconnect()); window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); document.removeEventListener("visibilitychange", onHidden); };
  }, [pathname]);
  return null;
}
