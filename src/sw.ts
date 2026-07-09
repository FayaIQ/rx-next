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

/** Dynamic clinic APIs — never cache (queue, finances, live fields). */
const LIVE_API_PREFIXES = [
  "/api/appointments",
  "/api/finances",
  "/api/fields",
  "/api/recipe-settings",
  "/api/prescriptions/next-number",
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
  method: "GET" as const,
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

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...liveApiRules, ...liveAssetRules, ...defaultCache],
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
