/**
 * The check-in summary a coach sends on WhatsApp: the week's figures in a
 * few lines, written from the same rows the review shows beside it — never
 * typed from memory. The coach adds their own words under it.
 *
 * Figures only. The client's answers and any pain are theirs already; they
 * are not repeated back.
 */
export type WeekFigures = {
  sessionsDone: number;
  sessionsPlanned: number;
  sleepAvgH: number | null;
  sleepNights: number;
  stepsAvg: number | null;
  stepsTarget: number | null;
};

export type SummaryWeek = {
  weekStart: string;
  bodyweight: number | null;
  waist: number | null;
  chest: number | null;
  hips: number | null;
  thigh: number | null;
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

const MEASURES = ["waist", "chest", "hips", "thigh"] as const;

export function composeSummary({
  firstName,
  week,
  previous,
  baseline,
  figures,
  locale,
  t,
}: {
  firstName: string;
  week: SummaryWeek;
  /** The check-in before this one, when there is one. */
  previous: SummaryWeek | null;
  /** The first check-in of all. */
  baseline: SummaryWeek | null;
  figures: WeekFigures | null;
  locale: string;
  /** Messages of the `summary` namespace. */
  t: Translate;
}): string {
  const num = (value: number, digits = 1) =>
    value.toLocaleString(locale, { maximumFractionDigits: digits });
  const signed = (value: number) => {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${num(Math.abs(rounded))}`;
  };
  const change = (now: number, before: number | null | undefined, unit: string) => {
    if (before == null) return null;
    const delta = Math.round((now - before) * 10) / 10;
    return delta === 0 ? t("stable") : `${signed(delta)} ${unit}`;
  };

  const date = new Date(`${week.weekStart}T12:00:00Z`).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
  });
  const lines: string[] = [];

  if (week.bodyweight != null) {
    const parts: string[] = [];
    const vsPrevious = change(week.bodyweight, previous?.bodyweight, "kg");
    if (vsPrevious) parts.push(t("vsPrevious", { delta: vsPrevious }));
    // The first check-in is worth naming only when it is not the previous one.
    if (baseline && baseline.weekStart !== previous?.weekStart && baseline.weekStart !== week.weekStart) {
      const sinceStart = change(week.bodyweight, baseline.bodyweight, "kg");
      if (sinceStart) parts.push(t("sinceStart", { delta: sinceStart }));
    }
    lines.push(
      t("weight", { value: num(week.bodyweight) }) + (parts.length ? ` (${parts.join(", ")})` : ""),
    );
  }

  const measures = MEASURES.flatMap((key) => {
    const value = week[key];
    if (value == null) return [];
    const delta = change(value, previous?.[key], "cm");
    return [t("measure", { label: t(key), value: num(value) }) + (delta ? ` (${delta})` : "")];
  });
  if (measures.length) lines.push(measures.join(" · "));

  if (figures) {
    if (figures.sessionsPlanned > 0) {
      lines.push(t("sessions", { done: figures.sessionsDone, planned: figures.sessionsPlanned }));
    }
    if (figures.sleepAvgH != null && figures.sleepNights > 0) {
      const whole = Math.floor(figures.sleepAvgH);
      const minutes = Math.round((figures.sleepAvgH - whole) * 60);
      lines.push(
        t("sleep", {
          hours: minutes === 60 ? `${whole + 1}h00` : `${whole}h${String(minutes).padStart(2, "0")}`,
          nights: figures.sleepNights,
        }),
      );
    }
    if (figures.stepsAvg != null) {
      lines.push(
        t("steps", { avg: num(figures.stepsAvg, 0) }) +
          (figures.stepsTarget ? ` ${t("stepsTarget", { target: num(figures.stepsTarget, 0) })}` : ""),
      );
    }
  }

  const greeting = firstName ? t("greeting", { first: firstName, date }) : t("greetingPlain", { date });
  const body = lines.length ? lines.map((line) => `• ${line}`).join("\n") : t("nothing");
  return `${greeting}\n\n${body}\n\n${t("closing")} `;
}
