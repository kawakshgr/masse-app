/**
 * Where Masse lives. One place, because three things depend on the exact
 * host: passkeys (bound to it for good), the redirect from the address used
 * before the domain existed, and links written outside a request.
 */
export const SITE_HOST = "masseapp.online";
export const SITE_URL = `https://${SITE_HOST}`;

/** The project's Vercel address, in use until 30 Sep 2026. */
export const OLD_HOST = "masse-app-bay.vercel.app";
