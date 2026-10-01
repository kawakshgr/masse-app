/*
 * Masse service worker.
 *
 * Narrow on purpose. It caches the build's immutable static assets, and —
 * since 1 Oct 2026 — three of the client's own pages: Séance, Aujourd'hui
 * and Nutrition, so the app opens on the gym floor with no signal. Held sets
 * live in localStorage and sync on reconnect.
 *
 * Those pages are one person's, so: kept only when actually served (never a
 * redirect to sign-in), always fetched fresh first, and forgotten the moment
 * the sign-in page shows (lib/offlinePages.ts) — signing out, deleting the
 * account or a lapsed session all land there. Never a coach's page.
 */

const VERSION = "masse-v4";
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const OFFLINE_URL = "/hors-ligne";
const OFFLINE_PAGES = ["/seance", "/aujourdhui", "/nutrition"];
/** Past this, a weak signal gives way to the copy kept. */
const PATIENCE_MS = 4000;

/** Fresh when the network answers in time, the copy kept otherwise. */
function freshOrKept(request, key) {
  const network = fetch(request).then((response) => {
    if (response.ok && !response.redirected && response.type === "basic") {
      const copy = response.clone();
      caches.open(PAGES).then((cache) => cache.put(key, copy));
    }
    return response;
  });
  const kept = () => caches.open(PAGES).then((cache) => cache.match(key));
  const late = new Promise((resolve) => setTimeout(() => resolve(null), PATIENCE_MS));
  return Promise.race([network, late])
    .then((response) => response ?? kept().then((hit) => hit ?? network))
    .catch(() =>
      kept().then((hit) => hit ?? caches.match(OFFLINE_URL).then((page) => page ?? Response.error())),
    );
}

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

  // The client's three pages, as they stand, for opening without a signal.
  if (request.mode === "navigate" && OFFLINE_PAGES.includes(url.pathname) && !url.search) {
    event.respondWith(freshOrKept(request, url.pathname));
    return;
  }

  // Other pages: network only. On failure, the offline page — never a stale roster.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((hit) => hit ?? Response.error()),
      ),
    );
  }
});

/*
 * Notifications (1 Oct 2026). The server sends { title, body, url, tag };
 * a tap opens the app on that page, in the window already open if any.
 */
self.addEventListener("push", (event) => {
  let message = { title: "Masse", body: "", url: "/" };
  try {
    message = { ...message, ...event.data.json() };
  } catch {
    // A push without a readable payload still says something.
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      icon: "/icon-192.png?v=2",
      badge: "/icon-192.png?v=2",
      data: { url: message.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((open) => {
      const mine = open.find((client) => new URL(client.url).origin === self.location.origin);
      if (mine) return mine.focus().then(() => mine.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});

