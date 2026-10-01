import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { intl } from "@/lib/locale";
import { queueNow } from "@/lib/coachData";
import { QueuePanel } from "@/components/QueuePanel";
import { authUser } from "@/lib/supabase/auth";

/**
 * Where the coach lands: beside her roster, what needs her today — the
 * "À traiter" list — rather than an empty pane asking her to pick someone.
 */
export default async function ClientsIndexPage() {
  const supabase = await createClient();
  const locale = intl(await getLocale());
  const [items, { data: coach }] = await Promise.all([
    queueNow(locale),
    // Her video link goes into the confirmation message of each booked call.
    authUser().then((user) => supabase.from("coaches").select("call_link").eq("id", user?.id ?? "").maybeSingle()),
  ]);
  return <QueuePanel items={items} callLink={coach?.call_link ?? null} locale={locale} />;
}
