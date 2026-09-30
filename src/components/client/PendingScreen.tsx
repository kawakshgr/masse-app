import { getTranslations } from "next-intl/server";
import { clientSession } from "@/lib/clientData";
import { callLabel, callsShownFrom } from "@/lib/calls";
import { logoUrl } from "@/lib/logo";
import { Card, CardTitle, Kicker, ScreenHeader } from "@/components/client/ui";
import { CancelRequest } from "@/components/client/CancelRequest";
import { SignOutButton } from "@/components/client/SettingsControls";

/**
 * The whole app, while the coach has not answered the sign-up: the request
 * is with them, the video call if one was booked, and the way to withdraw.
 * Nothing else opens until the coach accepts.
 */
export async function PendingScreen() {
  const { supabase, client } = await clientSession();
  const t = await getTranslations("pending");
  const tCalls = await getTranslations("calls");

  const [{ data: coach }, { data: call }] = await Promise.all([
    supabase.from("coaches").select("name, first_name, logo_path, call_link").eq("id", client.coach_id).maybeSingle(),
    supabase
      .from("appointments")
      .select("id, starts_at, minutes")
      .is("cancelled_at", null)
      .gte("starts_at", callsShownFrom())
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
  ]);
  const coachName = coach?.first_name ?? coach?.name ?? "";
  const logo = logoUrl(coach?.logo_path);

  return (
    <>
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element -- a public storage URL, sized by its box
        <img src={logo} alt="" className="h-10 max-w-[160px] object-contain" />
      )}
      <ScreenHeader kicker={t("kicker")} title={t("title", { first: client.first_name ?? client.name })} />

      <Card className="space-y-2">
        <Kicker icon="send" accent>
          {t("sentKicker")}
        </Kicker>
        <CardTitle>{t("with", { coach: coachName })}</CardTitle>
        <p className="text-[15px] leading-[1.45] text-[var(--ink2)]">{call ? t("bodyCall") : t("body")}</p>
      </Card>

      {call && (
        <Card className="space-y-3">
          <Kicker icon="video" accent>
            {tCalls("kicker", { length: tCalls("length", { minutes: call.minutes }) })}
          </Kicker>
          <CardTitle>{tCalls("clientTitle", { coach: coachName })}</CardTitle>
          <p className="text-[15px] font-semibold first-letter:uppercase">{callLabel(call.starts_at)}</p>
          <div className="flex gap-2">
            {coach?.call_link && (
              <a
                href={coach.call_link}
                target="_blank"
                rel="noopener noreferrer"
                className="cta flex h-11 flex-1 items-center justify-center rounded-rp text-[14px] font-semibold text-[var(--on-accent)]"
              >
                {tCalls("join")}
              </a>
            )}
            <a
              href={`/rendez-vous/${call.id}`}
              className="flex h-11 flex-1 items-center justify-center rounded-rp bg-[var(--glass2)] text-[14px] font-semibold text-[var(--ink)]"
            >
              {tCalls("addToCalendar")}
            </a>
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <Kicker icon="privacy">{t("changeKicker")}</Kicker>
        <p className="text-[14px] leading-[1.45] text-[var(--ink2)]">{t("changeBody")}</p>
        <CancelRequest />
      </Card>

      <SignOutButton />
    </>
  );
}
