import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { clientSession } from "@/lib/clientData";
import { Card, Kicker, ScreenHeader } from "@/components/client/ui";
import { PhaseBar, type PhaseSpan } from "@/components/client/PhaseBar";
import { CycleEntryCard, RemoveCycleEntry, SymptomNoteCard } from "@/components/client/CycleCards";

/**
 * Cycle — CycleView.swift. Two dates and a length, and nothing else leaves
 * the device. The phase is derived by the database at read time, so neither
 * client has a second opinion about which phase she is in.
 */
export default async function CyclePage() {
  const { supabase, client, today } = await clientSession();
  // A tab about her period for someone who never asked is worse than none.
  if (!client.cycle_tracking) redirect("/aujourdhui");

  const t = await getTranslations("entry");
  const tNav = await getTranslations("clientNav");
  const tPhase = await getTranslations("phase");
  const tChart = await getTranslations("cycleChart");

  const [entriesRes, stateRes] = await Promise.all([
    supabase
      .from("cycle_logs")
      .select("id, period_start_date, cycle_length_days")
      .order("period_start_date", { ascending: false })
      .limit(12),
    supabase.rpc("client_cycle_state", { p_client: client.id }),
  ]);

  const state = (stateRes.data ?? [])[0];

  // The phase widths belong to her cycle's length, not a textbook's.
  const spans: PhaseSpan[] = state?.cycle_length_days
    ? ((await supabase.rpc("cycle_phase_spans", { p_cycle_length: state.cycle_length_days }))
        .data ?? [])
    : [];

  const phase = state?.phase ?? null;
  const entries = entriesRes.data ?? [];

  return (
    <>
      <ScreenHeader
        kicker={tNav("cycle")}
        title={t("cycleTitle")}
        sub={phase ? capitalise(tPhase(phase)) : null}
        subTone="accent"
      />

      {spans.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <Kicker>{tChart("title")}</Kicker>
            {state?.day_of_cycle && state.cycle_length_days && (
              <span className="tnum text-[13px] text-[var(--ink2)]">
                {tChart("day", { day: state.day_of_cycle, length: state.cycle_length_days })}
              </span>
            )}
          </div>
          <PhaseBar
            spans={spans}
            current={phase}
            day={state?.day_of_cycle ?? null}
            length={state?.cycle_length_days ?? 28}
          />
        </Card>
      )}

      <CycleEntryCard today={today} />
      <SymptomNoteCard today={today} />

      {entries.length > 0 && (
        <Card className="space-y-2.5">
          <Kicker>{t("history")}</Kicker>
          <ul>
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2">
                <span className="tnum flex-1 text-[15px] font-semibold">{entry.period_start_date}</span>
                <span className="tnum text-[13px] text-[var(--ink3)]">{entry.cycle_length_days} j</span>
                <RemoveCycleEntry id={entry.id} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
