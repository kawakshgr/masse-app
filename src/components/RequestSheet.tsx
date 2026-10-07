import { getLocale, getTranslations } from "next-intl/server";
import { intl } from "@/lib/locale";
import { Icon } from "@/components/Icon";
import { SectionTitle } from "@/components/Pane";
import { RefuseRequest } from "@/components/RefuseRequest";
import { acceptClient } from "@/app/(coach)/clients/actions";
import { SESSIONS_PER_WEEK, TRAINING_AGES, ageFrom } from "@/lib/onboarding";
import { waLink } from "@/lib/whatsapp";
import { messageWriter } from "@/lib/coachMessages";
import type { ClientRow } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";
import { DUE_OFFSETS, dueOffsetFor } from "@/lib/checkIns";

/**
 * A sign-up waiting for the coach: everything the client answered on one
 * screen, and the two ways out — accept, and the coaching opens; refuse, and
 * the account is erased. Shown in place of the tabs, which have nothing yet.
 * Accepting sets the client's check-in day at the same time (7 Oct 2026):
 * hers from Admin unless she picks another.
 */
export async function RequestSheet({ client, callOver }: { client: ClientRow; callOver: boolean }) {
  const t = await getTranslations("request");
  const write = await messageWriter();
  const locale = intl(await getLocale());
  const tRecord = await getTranslations("record");
  const tOnb = await getTranslations("onboarding");
  const tGoal = await getTranslations("goal");
  const tDays = await getTranslations("days");
  const tEquip = await getTranslations("equipment");
  const tDue = await getTranslations("checkInDue");
  const supabase = await createClient();
  const { data: coach } = await supabase
    .from("coaches")
    .select("check_in_due_offset")
    .eq("id", client.coach_id)
    .maybeSingle();
  const coachDue = dueOffsetFor(null, coach?.check_in_due_offset);

  const first = client.first_name ?? client.name.split(/\s+/)[0] ?? client.name;
  const phone = client.whatsapp ?? client.phone;
  const age = client.birth_date ? ageFrom(client.birth_date) : null;
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { timeZone: "Europe/Paris", day: "numeric", month: "long" });

  const blocks: { icon: string; title: string; rows: [string, string | null | undefined][] }[] = [
    {
      icon: "programmes",
      title: t("goalBlock"),
      rows: [
        [tRecord("goal"), client.goal ? (client.goal === "Other" ? client.goal_other : tGoal(client.goal)) : null],
        [tRecord("obstacles"), client.obstacles],
        [tRecord("readiness"), client.readiness ? `${client.readiness} / 10` : null],
      ],
    },
    {
      icon: "chart",
      title: t("startBlock"),
      rows: [
        [
          tRecord("trainingAge"),
          client.training_age && (TRAINING_AGES as readonly string[]).includes(client.training_age)
            ? tOnb(`trainingAgeOpt.${client.training_age}`)
            : client.training_age,
        ],
        [
          tRecord("perWeek"),
          client.sessions_per_week && (SESSIONS_PER_WEEK as readonly string[]).includes(client.sessions_per_week)
            ? tOnb(`perWeekOpt.${client.sessions_per_week}`)
            : null,
        ],
        [tRecord("programmeNow"), client.current_programme],
        // None declared reads as such: an empty line would look unanswered.
        [tRecord("injuries"), client.injuries.length ? client.injuries.join(" · ") : t("noInjury")],
      ],
    },
    {
      icon: "calendar",
      title: t("frameBlock"),
      rows: [
        [tRecord("weeklyTime"), client.weekly_time],
        [
          tRecord("days"),
          [...client.session_days].sort((a, b) => a - b).map((d) => tDays(String(d)).slice(0, 3)).join(", "),
        ],
        [tRecord("equipment"), client.equipment.map((key) => (tEquip.has(key) ? tEquip(key) : key)).join(", ")],
      ],
    },
    {
      icon: "account",
      title: t("profileBlock"),
      rows: [
        [t("age"), age !== null ? `${age} ${tRecord("years")}` : null],
        [tRecord("height"), client.height_cm ? `${Number(client.height_cm)} cm` : null],
        [tRecord("startWeight"), client.start_weight_kg ? `${Number(client.start_weight_kg)} kg` : null],
        [tRecord("email"), client.email],
        ["WhatsApp", client.whatsapp],
        ["Instagram", client.instagram],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <section className="glass rounded-r3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="glass2 flex size-11 shrink-0 items-center justify-center rounded-r2 text-[var(--accent)]">
            <Icon name="account" size={24} />
          </span>
          {/* Wide enough to read: the buttons wrap under it on a narrow pane. */}
          <span className="min-w-[220px] flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">
              {t("kicker", { date: day(client.created_at) })}
            </span>
            <span className="block text-[14px] font-semibold">
              {callOver ? t("decideAfterCall") : t("decide", { first })}
            </span>
          </span>
          <form action={acceptClient} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="client_id" value={client.id} />
            <label className="flex items-center gap-2 text-[12px] text-[var(--ink2)]">
              {t("dueDay")}
              <select
                name="check_in_due_offset"
                defaultValue={dueOffsetFor(client.check_in_due_offset, coachDue)}
                className="h-10 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2.5 text-[13px] text-[var(--ink)]"
              >
                {DUE_OFFSETS.map((offset) => (
                  <option key={offset} value={offset}>
                    {tDue(`o${offset}`)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="cta h-10 rounded-rp px-5 text-[11.5px] font-bold uppercase tracking-[.1em] text-[var(--onA)]"
            >
              {t("accept")}
            </button>
          </form>
          <RefuseRequest
            clientId={client.id}
            firstName={first}
            declineLink={waLink(phone, write("decline", { first }))}
          />
        </div>
        <p className="mt-3 text-[12px] leading-[1.5] text-[var(--ink3)]">{t("hint")}</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {blocks.map((block) => (
          <section key={block.title} className="glass rounded-r3 p-4">
            <SectionTitle icon={block.icon}>{block.title}</SectionTitle>
            <dl className="mt-3 divide-y divide-[var(--hair)] text-[13px]">
              {block.rows.map(([label, value]) => (
                <div key={label} className="flex min-h-10 items-baseline justify-between gap-4 py-2">
                  <dt className="shrink-0 text-[var(--ink2)]">{label}</dt>
                  <dd className="tnum min-w-0 text-right font-semibold">{value || tRecord("none")}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
