import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { loadClientDetail, formatHours } from "@/lib/clientDetail";
import { MetricCard } from "@/components/MetricCard";

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const detail = await loadClientDetail(supabase, id);
  if (!detail) notFound();

  const t = await getTranslations("detail");
  const tProse = await getTranslations("prose");
  const tDays = await getTranslations("days");
  const tRecord = await getTranslations("record");
  const tGoal = await getTranslations("goal");
  const tPhase = await getTranslations("phase");

  const { client, sleep, steps, adherence, sessionsThisWeek, week } = detail;

  // The meta line states only what the data supports.
  const meta = [
    client.goal && tGoal(client.goal),
    detail.blockLabel && detail.weekNumber
      ? `${detail.blockLabel} · sem. ${detail.weekNumber}`
      : detail.blockLabel,
    detail.phase && tPhase(detail.phase),
  ].filter(Boolean);

  // Every sentence here computes from the rows the chart beside it reads.
  const avgLabel = formatHours(sleep.avg);
  const targetLabel = formatHours(sleep.target);
  let prose: string | null = null;
  if (avgLabel) {
    prose =
      targetLabel != null
        ? tProse("sleep", { under: sleep.nightsUnderTarget, target: targetLabel, avg: avgLabel })
        : tProse("sleepNoTarget", {
            avg: avgLabel,
            nights: sleep.nights.filter((n) => n.hours != null).length,
          });

    if (detail.volumeCoefficient != null && detail.volumeCoefficient < 1) {
      prose += tProse("lutealTrim", {
        pct: Math.round((1 - detail.volumeCoefficient) * 100),
      });
    } else if (detail.intensityCoefficient != null && detail.intensityCoefficient > 1) {
      prose += tProse("intensityLift", {
        pct: Math.round((detail.intensityCoefficient - 1) * 100),
      });
    } else if (detail.intensityCoefficient != null && detail.intensityCoefficient < 1) {
      prose += tProse("intensityDrop", {
        pct: Math.round((1 - detail.intensityCoefficient) * 100),
      });
    }
  }

  const statusTone: Record<string, string> = {
    logged: "text-[var(--a1)]",
    "in-progress": "text-[var(--a2)]",
    scheduled: "text-[var(--ink3)]",
    rest: "text-[var(--ink3)]",
  };

  return (
    <div className="space-y-4 p-5">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-[var(--onA)]"
          style={{ background: "linear-gradient(140deg, var(--a1), var(--a2))" }}
        >
          {initialsOf(client.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[22px] font-extrabold leading-tight tracking-[-.04em]">
            {client.name}
          </h2>
          {meta.length > 0 && (
            <p className="truncate text-[11px] text-[var(--ink2)]">
              {meta.join(" · ")}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled
          title={t("noWeek")}
          className="shrink-0 rounded-r2 bg-[var(--a1)] px-3 py-2 text-[12px] font-semibold text-[var(--onA)] disabled:opacity-40"
        >
          {t("pushWeek")}
        </button>
      </header>

      <p className="glass rounded-r2 px-3 py-2 text-[11px] text-[var(--ink2)]">
        {client.cycle_tracking ? t("cycleOn") : t("cycleOff")}
      </p>

      <div className="flex gap-3">
        <MetricCard
          label={t("adherence")}
          value={adherence.pct == null ? "—" : `${adherence.pct}%`}
          sub={adherence.expected === 0 ? null : t("adherenceSub")}
          wash="wash-1"
        />
        <MetricCard
          label={t("sessions")}
          value={`${sessionsThisWeek.done} / ${sessionsThisWeek.total}`}
          sub={t("sessionsSub")}
          wash="wash-2"
        />
        <MetricCard
          label={t("sleep")}
          value={avgLabel ?? "—"}
          sub={targetLabel && t("sleepSub", { target: targetLabel })}
          wash="wash-3"
        />
        <MetricCard
          label={t("steps")}
          value={steps.latest == null ? "—" : steps.latest.toLocaleString("fr-FR")}
          sub={steps.avg == null ? null : t("stepsSub", { avg: steps.avg.toLocaleString("fr-FR") })}
          wash="wash-1"
        />
      </div>

      <section className="glass rounded-r3 p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
          {t("sleepSeven")}
        </h3>
        <div className="mt-3 flex gap-2">
          {sleep.nights.map((night) => (
            <div
              key={night.dayIndex}
              className="flex min-w-0 flex-1 flex-col items-center rounded-r2 border border-[var(--hair)] px-1 py-2"
            >
              <span className="truncate text-[10px] text-[var(--ink3)]">
                {tDays(String(night.dayIndex)).slice(0, 3)}
              </span>
              <span className="tnum mt-1 text-[12px] font-bold">
                {formatHours(night.hours) ?? "—"}
              </span>
            </div>
          ))}
        </div>
        <p className="tnum mt-3 text-[11px] leading-relaxed text-[var(--ink2)]">
          {prose ?? t("noSleep")}
        </p>
      </section>

      <section className="glass rounded-r3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
            {t("thisWeek")}
          </h3>
          {detail.blockLabel && (
            <span className="truncate text-[11px] text-[var(--ink3)]">
              {detail.blockLabel}
            </span>
          )}
        </div>

        {detail.blockLabel == null ? (
          <p className="mt-3 text-[11px] text-[var(--ink2)]">{t("noWeek")}</p>
        ) : (
          <ul className="mt-3">
            {week.map((day) => (
              <li
                key={day.dayIndex}
                className="flex items-center gap-3 border-b border-[var(--hair)] px-1 last:border-0"
                style={{ height: "36px" }}
              >
                <span className="w-10 shrink-0 text-[11px] text-[var(--ink3)]">
                  {tDays(String(day.dayIndex)).slice(0, 3)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                  {day.sessionName ?? t("rest")}
                </span>
                {day.status !== "rest" && (
                  <span className={`shrink-0 text-[10px] ${statusTone[day.status]}`}>
                    {t(day.status === "in-progress" ? "inProgress" : day.status)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass rounded-r3 p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink3)]">
          {tRecord("title")}
        </h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          {[
            [tRecord("goal"), client.goal && tGoal(client.goal)],
            [tRecord("injuries"), client.injuries.join(", ")],
            [tRecord("equipment"), client.equipment.join(", ")],
            [tRecord("days"), client.session_days.map((d) => tDays(String(d)).slice(0, 3)).join(", ")],
            [tRecord("sleepTarget"), targetLabel],
          ].map(([label, value]) => (
            <div key={label as string} className="min-w-0">
              <dt className="text-[var(--ink3)]">{label}</dt>
              <dd className="truncate text-[var(--ink)]">
                {value ? String(value) : tRecord("none")}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
