/* Dev / Serwist-disabled stub.
 * Clears old caches and unregisters itself — do NOT intercept fetch
 * (respondWith(fetch) causes "Failed to fetch" / broken navigations in Chrome).
 * Production `next build` regenerates this file from src/sw.ts.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      await self.clients.claim();
    })()
  );
});
