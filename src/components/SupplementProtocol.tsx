"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { SupplementTiming, SupplementUnit } from "@/lib/supabase/types";
import { SUPPLEMENT_TIMINGS } from "@/lib/supabase/types";
import {
  addClientSupplement,
  deleteClientSupplement,
  updateClientSupplement,
} from "@/app/(coach)/clients/nutrition-actions";

export type ProtocolRow = {
  id: string;
  name: string;
  dose: number | null;
  unit: SupplementUnit;
  timing: SupplementTiming;
  proteinG: number | null;
  kcal: number | null;
  /** Null means every day. */
  dayTypeId: string | null;
};

export type PickableSupplement = {
  id: string;
  name: string;
  doseMin: number | null;
  unit: SupplementUnit;
  timing: SupplementTiming;
  usable: boolean;
};

const cell =
  "h-8 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2 text-[13px] text-[var(--ink)]";

/**
 * What this client takes, ordered the way a day runs rather than the way rows
 * were typed. Anything carrying macros is counted in the day total by the panel
 * above — a protein shake that does not count makes the total a lie.
 */
export function SupplementProtocol({
  clientId,
  firstName,
  dayTypeId,
  dayTypeName,
  rows,
  library,
}: {
  clientId: string;
  firstName: string;
  /** The day type being edited. Null is the default plan. */
  dayTypeId: string | null;
  dayTypeName: string | null;
  rows: ProtocolRow[];
  library: PickableSupplement[];
}) {
  const t = useTranslations("proto");
  const tSupp = useTranslations("supp");
  const [adding, setAdding] = useState(false);

  const order = new Map(SUPPLEMENT_TIMINGS.map((key, index) => [key, index]));
  const shown = [...rows].sort(
    (a, b) => (order.get(a.timing) ?? 9) - (order.get(b.timing) ?? 9),
  );

  const fromSupplements = shown.reduce(
    (acc, row) => ({
      kcal: acc.kcal + Number(row.kcal ?? 0),
      proteinG: acc.proteinG + Number(row.proteinG ?? 0),
    }),
    { kcal: 0, proteinG: 0 },
  );

  const unitName = (unit: SupplementUnit, count: number) =>
    tSupp(`unit.${unit}`, { count });

  return (
    <section className="glass rounded-r3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
          {t("title")}
        </h3>
        <Link
          href="/complements"
          className="text-[11px] text-[var(--accent)] hover:underline"
        >
          {t("libraryLink")}
        </Link>
      </div>

      <p className="mt-1 text-[12px] leading-[1.5] text-[var(--ink2)]">
        {t("lede", { first: firstName })}
      </p>

      {shown.length === 0 ? (
        <p className="mt-3 text-[12px] text-[var(--ink3)]">{t("none")}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {shown.map((row) => (
            <li
              key={row.id}
              className="rounded-r2 border border-[var(--hair)] bg-[var(--glass2)] p-2"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">
                    {row.name}
                  </span>
                  <span className="block text-[11px] text-[var(--ink3)]">
                    {[
                      tSupp(`timing.${row.timing}`),
                      row.dayTypeId === null
                        ? t("everyDay")
                        : dayTypeName
                          ? t("onlyOn", { type: dayTypeName })
                          : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>

                <form
                  action={updateClientSupplement}
                  className="flex shrink-0 items-center gap-1"
                >
                  <input type="hidden" name="client_id" value={clientId} />
                  <input type="hidden" name="id" value={row.id} />
                  <input
                    name="dose"
                    inputMode="decimal"
                    defaultValue={row.dose ?? ""}
                    aria-label={t("dose")}
                    className={`tnum w-[68px] text-right ${cell}`}
                  />
                  <span className="text-[11px] text-[var(--ink3)]">
                    {unitName(row.unit, row.dose ?? 1)}
                  </span>
                  <button
                    type="submit"
                    className="h-8 rounded-r2 border border-[var(--edge)] px-2 text-[11.5px] text-[var(--ink2)]"
                  >
                    {tSupp("save")}
                  </button>
                </form>

                <form action={deleteClientSupplement} className="shrink-0">
                  <input type="hidden" name="client_id" value={clientId} />
                  <input type="hidden" name="id" value={row.id} />
                  <button
                    type="submit"
                    aria-label={t("remove")}
                    title={t("remove")}
                    className="px-1 text-[12px] text-[var(--ink3)] hover:text-[var(--a3)]"
                  >
                    ✕
                  </button>
                </form>
              </div>

              {(row.kcal ?? 0) > 0 && (
                <p className="tnum mt-1 text-[11px] text-[var(--ink3)]">
                  {Math.round(Number(row.kcal))} kcal ·{" "}
                  {Math.round(Number(row.proteinG ?? 0))} g P
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="tnum mt-2.5 text-[11px] leading-[1.5] text-[var(--ink3)]">
        {fromSupplements.kcal > 0
          ? t("inTotal", {
              kcal: Math.round(fromSupplements.kcal).toLocaleString("fr-FR"),
              protein: Math.round(fromSupplements.proteinG),
            })
          : t("noneInTotal")}
      </p>

      {adding ? (
        <form
          action={addClientSupplement}
          onSubmit={() => setAdding(false)}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="day_type_id" value={dayTypeId ?? ""} />

          <label className="min-w-[180px] flex-1">
            <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
              {t("pick")}
            </span>
            <select name="supplement_id" required className={`mt-1 w-full ${cell}`}>
              <option value="">—</option>
              {library.map((entry) => (
                <option
                  key={entry.id}
                  value={entry.id}
                  // Marked unusable in the library, so it is not on offer here.
                  // The server refuses it too; this only avoids the dead end.
                  disabled={!entry.usable}
                >
                  {entry.name}
                  {entry.usable ? "" : ` — ${tSupp("unusable")}`}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="block text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]">
              {t("dose")}
            </span>
            <input
              name="dose"
              inputMode="decimal"
              placeholder="—"
              className={`tnum mt-1 w-[88px] ${cell}`}
            />
          </label>

          <button
            type="submit"
            className="h-8 rounded-r2 cta px-3 text-[12.5px] font-semibold text-[var(--on-accent)]"
          >
            {tSupp("save")}
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="h-8 rounded-r2 px-2 text-[12.5px] text-[var(--ink3)]"
          >
            {tSupp("cancel")}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 h-8 rounded-r2 border border-[var(--edge)] px-3 text-[12.5px] font-semibold text-[var(--accent)]"
        >
          {t("add")}
        </button>
      )}
    </section>
  );
}
