import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { MESSAGES, fillMessage, isMessageKind, type MessageKind } from "@/lib/messages";

/** The messages the signed-in coach rewrote, read once per request. */
export const coachMessageBodies = cache(async (): Promise<Partial<Record<MessageKind, string>>> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  const { data } = await supabase.from("coach_messages").select("kind, body").eq("coach_id", user.id);
  const bodies: Partial<Record<MessageKind, string>> = {};
  for (const row of data ?? []) if (isMessageKind(row.kind)) bodies[row.kind] = row.body;
  return bodies;
});

/**
 * Writes one WhatsApp message: hers when she rewrote it, Masse's otherwise,
 * with the same values either way.
 */
export async function messageWriter() {
  const [bodies, t] = await Promise.all([coachMessageBodies(), getTranslations()]);
  return (kind: MessageKind, values: Record<string, string | number>) => {
    const own = bodies[kind];
    return own ? fillMessage(own, values) : t(MESSAGES[kind].key, values);
  };
}
