"use server";

import { createClient } from "@/lib/supabase/server";
import { pushReady, pushTo } from "@/lib/push";

/**
 * This device says yes to notifications: the browser's subscription is kept
 * against the signed-in person, with the language to write to it in. RLS
 * keeps each person to their own devices.
 */
export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  locale: string;
}): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !/^https:\/\//.test(input.endpoint)) return { ok: false };
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      locale: input.locale.startsWith("en") ? "en" : "fr",
    },
    { onConflict: "endpoint" },
  );
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

/** A test, to every device of the person asking. */
export async function sendTestPush(): Promise<{ sent: number; ready: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sent: 0, ready: pushReady() };
  const sent = await pushTo([user.id], (t) => ({ title: t("testTitle"), body: t("testBody"), url: "/", tag: "test" }));
  return { sent, ready: pushReady() };
}
