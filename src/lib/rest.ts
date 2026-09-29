/**
 * Rest between sets: exact or a range, in seconds. One formatter for the
 * editor, the client's session and the printed week, so they never disagree.
 * Plain module: server and client components both use it.
 */
export const REST_PRESETS: [number, number][] = [
  [30, 30],
  [45, 45],
  [60, 60],
  [75, 75],
  [90, 90],
  [120, 120],
  [120, 180],
  [180, 180],
  [180, 240],
  [180, 300],
  [240, 300],
];

function part(seconds: number, unit: boolean): string {
  if (seconds < 120 && seconds % 60 !== 0) return unit ? `${seconds} s` : String(seconds);
  const minutes = seconds / 60;
  const shown = Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1).replace(".", ",");
  return unit ? `${shown} min` : shown;
}

/** "90 s", "2 min", "2–3 min" — or null when no rest was set. */
export function restLabel(min: number | null | undefined, max: number | null | undefined): string | null {
  const lo = min ?? max;
  const hi = max ?? min;
  if (!lo || !hi) return null;
  if (lo === hi) return part(lo, true);
  // A range reads in one unit: both in seconds, or both in minutes.
  const seconds = hi < 120 && (lo % 60 !== 0 || hi % 60 !== 0);
  return seconds ? `${lo}–${hi} s` : `${part(lo, false)}–${part(hi, false)} min`;
}

/** A preset's value for a <select>, and back. */
export const restKey = (min: number | null | undefined, max: number | null | undefined) =>
  min || max ? `${min ?? max}-${max ?? min}` : "";
export function parseRestKey(key: string): { rest_min_s: number | null; rest_max_s: number | null } {
  const [min, max] = key.split("-").map(Number);
  return min && max ? { rest_min_s: min, rest_max_s: max } : { rest_min_s: null, rest_max_s: null };
}
