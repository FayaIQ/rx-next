/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Dynamic clinic APIs — never cache. */
const LIVE_API_PREFIXES = [
  "/api/auth",
  "/api/appointments",
  "/api/finances",
  "/api/fields",
  "/api/recipe-settings",
  "/api/prescriptions",
  "/api/patients",
  "/api/medicines",
  "/api/alerts",
  "/api/treatment-sessions",
  "/api/treatment-plans",
  "/api/sync",
  "/api/search",
  "/api/reports",
  "/api/features",
];

const LIVE_ASSET_PREFIXES = ["/api/storage/", "/uploads/"];

const liveApiRules = LIVE_API_PREFIXES.map((prefix) => ({
  matcher: ({
    sameOrigin,
    url: { pathname },
  }: {
    sameOrigin: boolean;
    url: URL;
  }) => sameOrigin && pathname.startsWith(prefix),
  handler: new NetworkOnly(),
}));

const liveAssetRules = LIVE_ASSET_PREFIXES.map((prefix) => ({
  matcher: ({
    sameOrigin,
    url: { pathname },
  }: {
    sameOrigin: boolean;
    url: URL;
  }) => sameOrigin && pathname.startsWith(prefix),
  handler: new NetworkOnly(),
}));

/** Never serve HTML pages from SW cache — prevents stale "logged-in" shells with dead sessions. */
const navigationRule = {
  matcher: ({ request }: { request: Request }) => request.mode === "navigate",
  handler: new NetworkOnly(),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    navigationRule,
    ...liveApiRules,
    ...liveAssetRules,
    ...defaultCache,
  ],
});

serwist.addEventListeners();

self.addEventListener("sync", (event) => {
  if (event.tag === "rx-sync") {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.postMessage({ type: "RX_SYNC" });
        }
      })()
    );
  }
});
