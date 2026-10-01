/**
 * "La dernière fois": for a movement, what the client did the last day it
 * was logged — the figure a lifter looks for before loading the bar. Read
 * from her own sets, never estimated. Plain module: the session page builds
 * the lines on the server.
 */
export type PastSet = { name: string; reps: number | null; weightKg: number | null; day: string };

export type LastTime = {
  day: string;
  summary: string;
  /** The heaviest load that day: where the stepper starts on a stand-in. */
  weightKg: number | null;
};

/** "62,5" in French, "62.5" in English; whole numbers bare. */
function figure(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 2, useGrouping: false });
}

/**
 * One line per movement name: the most recent day's sets, written
 * "3 × 8 · 60 kg" when they were all alike, or the count and the heaviest
 * set otherwise, in the caller's words ("3 séries, la plus lourde 8 × 62,5 kg").
 */
export function lastTimeLines(
  sets: PastSet[],
  locale: string,
  /** Words for a day of unequal sets: how many, and the heaviest. */
  mixed: (count: number, best: string) => string,
): Map<string, LastTime> {
  const lines = new Map<string, LastTime>();
  const names = [...new Set(sets.map((s) => s.name))];

  for (const name of names) {
    const mine = sets.filter((s) => s.name === name);
    const day = mine.reduce((latest, s) => (s.day > latest ? s.day : latest), "");
    const that = mine.filter((s) => s.day === day);
    if (that.length === 0) continue;

    const one = (s: PastSet) =>
      [s.reps != null ? String(s.reps) : null, s.weightKg != null && s.weightKg > 0 ? `${figure(s.weightKg, locale)} kg` : null]
        .filter(Boolean)
        .join(" × ");
    const alike = that.every((s) => s.reps === that[0].reps && s.weightKg === that[0].weightKg);
    const best = [...that].sort(
      (a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0) || (b.reps ?? 0) - (a.reps ?? 0),
    )[0];

    const summary = alike
      ? [`${that.length} × ${that[0].reps ?? "—"}`, that[0].weightKg ? `${figure(that[0].weightKg, locale)} kg` : null]
          .filter(Boolean)
          .join(" · ")
      : mixed(that.length, one(best));

    lines.set(name, {
      day: new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, { timeZone: "UTC", day: "numeric", month: "short" }),
      summary,
      weightKg: best.weightKg,
    });
  }
  return lines;
}
