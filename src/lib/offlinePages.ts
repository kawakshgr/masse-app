/**
 * The client's pages kept on the device for opening without a network
 * (public/sw.js, 1 Oct 2026). Only one person's are ever there: arriving on
 * the sign-in page — after signing out, deleting the account or a session
 * gone — forgets them. Browser-only.
 */
export async function forgetOfflinePages(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  try {
    for (const key of await caches.keys()) if (key.endsWith("-pages")) await caches.delete(key);
  } catch {
    // Storage blocked: nothing was kept either.
  }
}
