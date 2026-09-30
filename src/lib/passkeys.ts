import { SITE_HOST } from "@/lib/site";

/**
 * Passkeys (Face ID, a fingerprint, the device's code) as a quicker way back
 * in. The e-mail code stays the first sign-in and the fallback: a passkey is
 * registered from settings, once signed in, and lives on the device.
 *
 * A passkey is bound to the domain it was made on (Supabase's Relying Party
 * ID). Anywhere else — the vercel.app address, localhost — the browser
 * refuses it, so nothing about passkeys is offered there.
 */
export const PASSKEY_DOMAIN = SITE_HOST;

/** Whether this page may offer passkeys: the right address, a capable browser. */
export function passkeysHere(): boolean {
  if (typeof window === "undefined" || !("PublicKeyCredential" in window)) return false;
  const host = window.location.hostname;
  return host === PASSKEY_DOMAIN || host.endsWith(`.${PASSKEY_DOMAIN}`);
}

/** The person closed the prompt or let it time out: not an error to report. */
export function passkeyCancelled(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name ?? "";
  const message = (error as { message?: string } | null)?.message ?? "";
  return /NotAllowed|Abort/i.test(name) || /not allowed|cancel|abort|timed out/i.test(message);
}
