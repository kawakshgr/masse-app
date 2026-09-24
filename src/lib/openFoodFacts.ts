/**
 * Open Food Facts stands in for MyFitnessPal, whose public API was withdrawn in
 * 2019 and whose partner programme is closed to new applicants. Open Food Facts
 * is free, needs no key, and is a French project — which suits a French-first
 * product better than MyFitnessPal would have.
 */

// Search-a-licious, not /api/v2/search: the v2 endpoint filters by tags and
// silently ignores free text — searching "flocons d'avoine" there returned the
// whole database, starting with fromage blanc and mineral water.
const ENDPOINT = "https://search.openfoodfacts.org/search";

// Their policy asks for an identifying User-Agent on every call.
const USER_AGENT = "Masse/0.1 (coaching software; https://masseapp.fr)";

export type FoodCandidate = {
  code: string;
  name: string;
  brand: string | null;
  kcal100: number | null;
  protein100: number | null;
  carbs100: number | null;
  fat100: number | null;
};

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export async function searchOpenFoodFacts(
  term: string,
  limit = 12,
): Promise<FoodCandidate[]> {
  const query = term.trim();
  if (query.length < 2) return [];

  const url = new URL(ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", String(limit));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      // Their index moves slowly; a day of caching is plenty and spares them.
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // A search that cannot reach them is an empty result, never a crash: the
    // coach can always type the food in by hand.
    return [];
  }

  if (!response.ok) return [];

  let payload: { hits?: unknown[] };
  try {
    payload = (await response.json()) as { hits?: unknown[] };
  } catch {
    return [];
  }

  const products = Array.isArray(payload.hits) ? payload.hits : [];

  return products
    .map((raw) => {
      const product = raw as {
        code?: string;
        product_name?: string;
        product_name_fr?: string;
        // This index returns brands as an array, unlike the older endpoints.
        brands?: string | string[];
        nutriments?: Record<string, unknown>;
      };
      const n = product.nutriments ?? {};
      const name = (product.product_name_fr ?? product.product_name ?? "").trim();
      if (name === "") return null;

      const brands = Array.isArray(product.brands)
        ? product.brands.join(", ")
        : (product.brands ?? "");

      return {
        code: String(product.code ?? ""),
        name,
        brand: brands.trim() || null,
        kcal100: numberOrNull(n["energy-kcal_100g"]),
        protein100: numberOrNull(n["proteins_100g"]),
        carbs100: numberOrNull(n["carbohydrates_100g"]),
        fat100: numberOrNull(n["fat_100g"]),
      } satisfies FoodCandidate;
    })
    .filter((c): c is FoodCandidate => c !== null)
    // A row with no energy is not worth importing into a macro library.
    .filter((c) => c.kcal100 !== null);
}
