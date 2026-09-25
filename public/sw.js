/*
 * Masse service worker.
 *
 * Deliberately narrow. It caches the build's immutable static assets and
 * nothing else — never a rendered page.
 *
 * Caching authenticated HTML would put one person's roster in a cache that the
 * next person on that device could be served. The offline promise is kept the
 * honest way instead: held sets live in localStorage and sync on reconnect,
 * and opening the app with no connection lands on a page that says so.
 */

const VERSION = "masse-v2";
const SHELL = `${VERSION}-shell`;
const OFFLINE_URL = "/hors-ligne";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) =>
        cache.addAll([OFFLINE_URL, "/icon-192.png?v=2", "/icon-512.png?v=2"]),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Supabase, fonts, anything not ours: left alone entirely.
  if (url.origin !== self.location.origin) return;

  // Auth and server actions must always hit the network.
  if (url.pathname.startsWith("/auth") || url.searchParams.has("_rsc")) return;

  // Hashed build output is immutable, so it is safe and useful to keep.
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icon-")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Pages: network only. On failure, the offline page — never a stale roster.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((hit) => hit ?? Response.error()),
      ),
    );
  }
});
