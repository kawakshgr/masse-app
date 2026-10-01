import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { createTranslator } from "next-intl";
import fr from "@/i18n/messages/fr.json";
import en from "@/i18n/messages/en.json";
import type { Database } from "@/lib/supabase/types";

/**
 * Web push (1 Oct 2026): what the iPhone app's reminders were, for the app
 * installed on the home screen. Sent with the service role — a coach cannot
 * read her client's devices, nor the morning job anyone's — and only when
 * the VAPID keys are set (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY).
 * The payload is encrypted end to end by the protocol; still, it carries
 * words a lock screen may show, so no figure of health in it.
 */

export type PushMessage = { title: string; body: string; url: string; tag?: string };
type Locale = "fr" | "en";
type Translate = (key: string, values?: Record<string, string | number>) => string;

export function pushReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function pushAdmin() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** The push strings in a device's language. */
export function pushT(locale: Locale): Translate {
  return createTranslator({ locale, messages: locale === "en" ? en : fr, namespace: "push" }) as unknown as Translate;
}

/**
 * Sends to every device of these people, each in its own language. Devices
 * the push service no longer knows (404, 410) are forgotten. Returns how
 * many notifications left; never throws — a notification is never worth
 * failing the action that caused it.
 */
export async function pushTo(
  userIds: string[],
  compose: (t: Translate, locale: Locale) => PushMessage | null,
): Promise<number> {
  return (await pushToWithReason(userIds, compose)).sent;
}

/**
 * The same, with why nothing left when nothing did — for the test button
 * and the logs. The reason never carries key material: the library's own
 * message, or the push service's status and answer.
 */
export async function pushToWithReason(
  userIds: string[],
  compose: (t: Translate, locale: Locale) => PushMessage | null,
): Promise<{ sent: number; reason: string | null }> {
  if (!pushReady()) {
    const missing = [
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      !process.env.VAPID_PRIVATE_KEY && "VAPID_PRIVATE_KEY",
      !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    return { sent: 0, reason: `missing ${missing.join(", ")}` };
  }
  if (userIds.length === 0) return { sent: 0, reason: "nobody" };
  let reason: string | null = null;
  try {
    webpush.setVapidDetails(
      "mailto:contact@masseapp.online",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
      process.env.VAPID_PRIVATE_KEY!.trim(),
    );
    const admin = pushAdmin();
    const { data: devices } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, locale")
      .in("user_id", userIds);

    let sent = 0;
    await Promise.all(
      (devices ?? []).map(async (device) => {
        const message = compose(pushT(device.locale), device.locale);
        if (!message) return;
        try {
          await webpush.sendNotification(
            { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
            JSON.stringify(message),
            { TTL: 60 * 60 * 12, urgency: "normal" },
          );
          sent += 1;
        } catch (error) {
          const { statusCode: status, body } = error as { statusCode?: number; body?: string };
          reason = status ? `push service ${status} ${String(body ?? "").slice(0, 120)}` : String((error as Error).message).slice(0, 160);
          console.error("push failed:", reason);
          if (status === 404 || status === 410) {
            await admin.from("push_subscriptions").delete().eq("id", device.id);
          }
        }
      }),
    );
    if ((devices ?? []).length === 0) reason = "no device";
    return { sent, reason: sent > 0 ? null : reason };
  } catch (error) {
    reason = String((error as Error).message).slice(0, 160);
    console.error("push failed:", reason);
    return { sent: 0, reason };
  }
}
