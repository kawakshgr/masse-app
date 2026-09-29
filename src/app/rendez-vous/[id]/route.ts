import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { callIcs, callLabel } from "@/lib/calls";

/**
 * The calendar file for one booked call, for either side of it. RLS decides
 * who may read the row: the coach who holds the call, or the client who
 * booked it. Anyone else gets a 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 401 });

  const { data: call } = await supabase
    .from("appointments")
    .select("id, coach_id, client_id, starts_at, minutes, cancelled_at")
    .eq("id", id)
    .maybeSingle();
  if (!call) return new Response(null, { status: 404 });

  const [{ data: coach }, { data: client }] = await Promise.all([
    supabase.from("coaches").select("name, call_link").eq("id", call.coach_id).maybeSingle(),
    supabase.from("clients").select("name").eq("id", call.client_id).maybeSingle(),
  ]);

  const t = await getTranslations("calls");
  const forCoach = user.id === call.coach_id;
  const other = (forCoach ? client?.name : coach?.name) ?? "Masse";
  const link = coach?.call_link ?? null;

  const ics = callIcs({
    id: call.id,
    startsAt: call.starts_at,
    minutes: call.minutes,
    title: t("icsTitle", { name: other }),
    description: [t("icsWhen", { when: callLabel(call.starts_at), minutes: call.minutes }), link && t("icsLink", { link })]
      .filter(Boolean)
      .join("\n"),
    link,
    cancelled: call.cancelled_at !== null,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="visio-masse.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
