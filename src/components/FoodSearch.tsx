"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { importFood, searchFoods } from "@/app/(coach)/aliments/actions";
import type { FoodCandidate } from "@/lib/openFoodFacts";

export function FoodSearch() {
  const t = useTranslations("foodSearch");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<FoodCandidate[] | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      setResults(await searchFoods(term));
    });
  }

  return (
    <section className="glass rounded-r3 p-4">
      <h3 className="text-[10px] uppercase tracking-[.14em] text-[var(--ink2)]">
        {t("title")}
      </h3>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink2)]">
        {t("lede")}
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("search")}
          className="h-9 min-w-0 flex-1 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]"
        />
        <button
          type="submit"
          disabled={pending || term.trim().length < 2}
          className="h-9 shrink-0 rounded-r2 cta px-4 text-[12px] font-bold text-[var(--on-accent)] disabled:opacity-50"
        >
          {pending ? t("searching") : t("search")}
        </button>
      </form>

      {results !== null && results.length === 0 && !pending && (
        <p className="mt-3 text-[11px] text-[var(--ink2)]">{t("none")}</p>
      )}

      {results !== null && results.length > 0 && (
        <ul className="mt-3 max-h-[320px] overflow-y-auto">
          {results.map((candidate) => (
            <li
              key={candidate.code}
              className="flex items-center gap-3 border-b border-[var(--hair)] py-2 last:border-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold">
                  {candidate.name}
                </span>
                <span className="tnum block truncate text-[11px] text-[var(--ink3)]">
                  {[
                    candidate.brand,
                    candidate.kcal100 != null ? `${candidate.kcal100} kcal` : null,
                    candidate.protein100 != null ? `P ${candidate.protein100}` : null,
                    candidate.carbs100 != null ? `G ${candidate.carbs100}` : null,
                    candidate.fat100 != null ? `L ${candidate.fat100}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  · {t("per100")}
                </span>
              </span>

              <form action={importFood} className="shrink-0">
                <input type="hidden" name="name" value={candidate.name} />
                <input type="hidden" name="brand" value={candidate.brand ?? ""} />
                <input type="hidden" name="kcal_100g" value={candidate.kcal100 ?? ""} />
                <input type="hidden" name="protein_100g" value={candidate.protein100 ?? ""} />
                <input type="hidden" name="carbs_100g" value={candidate.carbs100 ?? ""} />
                <input type="hidden" name="fat_100g" value={candidate.fat100 ?? ""} />
                <button
                  type="submit"
                  className="rounded-rp border border-[var(--edge)] bg-[var(--glass2)] px-3 py-1 text-[10px] font-bold text-[var(--ink2)]"
                >
                  {t("import")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
