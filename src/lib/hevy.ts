/**
 * Hevy's public API, for one thing only: her exercise templates.
 *
 * The key is a deployment env var rather than a column, because it is a
 * credential and a database is a poor place to keep one. That also means the
 * import runs against whoever's Pro account the key belongs to — fine while
 * there are two coaches and one of them has Pro, and worth revisiting if that
 * ever stops being true.
 *
 * Shape and limits taken from https://api.hevyapp.com/docs — pageSize maxes at
 * 100, and the docs ask that scheduled callers avoid the top of the hour.
 */
const BASE = "https://api.hevyapp.com/v1";

export type HevyTemplate = {
  id: string;
  title: string;
  type: string;
  primary_muscle_group: string | null;
  secondary_muscle_groups: string[] | null;
  equipment: string | null;
  is_custom: boolean;
};

export function hevyConfigured(): boolean {
  return Boolean(process.env.HEVY_API_KEY);
}

export type HevyResult =
  | { ok: true; templates: HevyTemplate[] }
  | { ok: false; reason: "not-configured" | "unauthorised" | "failed" };

export async function fetchExerciseTemplates(): Promise<HevyResult> {
  const key = process.env.HEVY_API_KEY;
  if (!key) return { ok: false, reason: "not-configured" };

  const templates: HevyTemplate[] = [];

  // Paginated, and bounded: a runaway page count must not become an open loop
  // against someone else's API.
  for (let page = 1; page <= 30; page += 1) {
    const response = await fetch(
      `${BASE}/exercise_templates?page=${page}&pageSize=100`,
      { headers: { "api-key": key }, cache: "no-store" },
    );

    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: "unauthorised" };
    }
    if (!response.ok) return { ok: false, reason: "failed" };

    const body = (await response.json()) as {
      page: number;
      page_count: number;
      exercise_templates: HevyTemplate[];
    };

    templates.push(...(body.exercise_templates ?? []));
    if (body.page >= body.page_count) break;
  }

  return { ok: true, templates };
}

/** "chest" → "Chest", "upper_back" → "Upper Back". Hevy sends snake case. */
export function titleise(value: string | null): string | null {
  if (!value) return null;
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Hevy writes the equipment into the title — "Bench Press (Barbell)". Our
 * catalogue keeps the two apart, so the parenthetical comes off when it only
 * repeats the equipment field.
 */
export function splitTitle(template: HevyTemplate): {
  name: string;
  equipment: string | null;
} {
  const equipment = titleise(template.equipment);
  const match = template.title.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match && equipment && match[2]!.toLowerCase() === equipment.toLowerCase()) {
    return { name: match[1]!.trim(), equipment };
  }
  return { name: template.title.trim(), equipment };
}
