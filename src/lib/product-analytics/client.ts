"use client";
import { measurementRoute, measurementVisitContext } from "@/lib/product-analytics/shared";

export function postProductEvent(event: string, practiceType?: "general" | "dental") {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production" || location.hostname !== "rx.faya.dev") return;
  const route = measurementRoute(location.pathname); if (!route) return;
  try {
    const body = JSON.stringify({ ...measurementVisitContext(practiceType), id: crypto.randomUUID(), route, metric: event, value: 1, device: innerWidth < 640 ? "mobile" : innerWidth < 1024 ? "tablet" : "desktop" });
    void fetch("/api/analytics/telemetry", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => undefined);
  } catch { /* Tracking does not control clinical or authentication operations. */ }
}
