"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  addDayType,
  deleteDayType,
  setWeekDay,
} from "@/app/(coach)/clients/nutrition-actions";

export type DayType = {
  id: string;
  name: string;
  isRest: boolean;
  /** Its own targets, when it has them. */
  kcal: number | null;
  meals: number;
};

const micro = "text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]";
const cell =
  "h-9 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-2.5 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

/**
 * The pivot. A day type is what a day is — "Haut du corps", "OFF" — and the
 * targets and meals hang off it rather than off the weekday.
 *
 * That is what lets a client move a rest day without anyone editing a plan: the
 * weekday changes type, and the food follows the type.
 */
export function DayTypes({
  clientId,
  firstName,
  types,
  week,
  selected,
}: {
  clientId: string;
  firstName: string;
  types: DayType[];
  /** day_index → day type id, or null for the default. */
  week: (string | null)[];
  /** Which type the nutrition panel beside this is editing. */
  selected: string | null;
}) {
  const t = useTranslations("dayTypes");
  const tDays = useTranslations("days");
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const href = (id: string | null) =>
    `/clients/${clientId}?onglet=nutrition${id ? `&jour=${id}` : ""}`;

  const nameOf = (id: string | null) =>
    id === null ? t("default") : (types.find((x) => x.id === id)?.name ?? t("default"));

  return (
    <section className="glass flex flex-col gap-3 rounded-r3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={micro}>{t("title")}</h3>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-[12px] font-semibold text-[var(--accent-soft)]"
        >
          {t("add")}
        </button>
      </div>

      <p className="text-[12.5px] leading-[1.5] text-[var(--ink2)]">
        {t("lede", { first: firstName })}
      </p>

      {adding && (
        <form action={addDayType} className="flex flex-wrap gap-2" onSubmit={() => setAdding(false)}>
          <input type="hidden" name="client_id" value={clientId} />
          <input
            name="name"
            required
            autoFocus
            placeholder={t("namePlaceholder")}
            aria-label={t("name")}
            className={`${cell} min-w-0 flex-1`}
          />
          <label className="glass2 flex h-9 shrink-0 items-center gap-2 rounded-r2 px-3 text-[12.5px] text-[var(--ink2)]">
            <input type="checkbox" name="is_rest" value="1" className="size-4 accent-[var(--a1)]" />
            {t("isRest")}
          </label>
          <button
            type="submit"
            className="cta h-9 shrink-0 rounded-r2 px-3.5 text-[13px] font-semibold text-[var(--onA)]"
          >
            {t("create")}
          </button>
        </form>
      )}

      {/* Every type, plus the default that a day with no type falls back to. */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={href(null)}
          aria-current={selected === null ? "page" : undefined}
          className={`rounded-rp border border-[var(--edge)] px-3 py-1.5 text-[12.5px] font-semibold ${
            selected === null ? "sel text-[var(--ink)]" : "bg-[var(--glass2)] text-[var(--ink2)]"
          }`}
        >
          {t("default")}
        </Link>
        {types.map((type) => (
          <Link
            key={type.id}
            href={href(type.id)}
            aria-current={selected === type.id ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-rp border border-[var(--edge)] px-3 py-1.5 text-[12.5px] font-semibold ${
              selected === type.id ? "sel text-[var(--ink)]" : "bg-[var(--glass2)] text-[var(--ink2)]"
            }`}
          >
            {type.isRest && <span aria-hidden>☾</span>}
            {type.name}
            <span className="tnum text-[11px] font-normal text-[var(--ink3)]">
              {type.kcal == null ? t("noTarget") : `${type.kcal}`}
            </span>
          </Link>
        ))}
      </div>

      {/* The ordinary week. Changing a day here changes what is eaten on it. */}
      <div className="flex flex-col gap-1">
        <span className={micro}>{t("week")}</span>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <form key={day} action={setWeekDay} className="min-w-0">
              <input type="hidden" name="client_id" value={clientId} />
              <input type="hidden" name="day_index" value={day} />
              <label className="block min-w-0">
                <span className="block truncate text-[11px] text-[var(--ink3)]">
                  {tDays(String(day))}
                </span>
                <select
                  name="day_type_id"
                  defaultValue={week[day] ?? ""}
                  onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  aria-label={tDays(String(day))}
                  className={`mt-1 w-full ${cell}`}
                >
                  <option value="">{t("default")}</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
            </form>
          ))}
        </div>
        <p className="mt-1 text-[12px] leading-[1.45] text-[var(--ink3)]">
          {t("weekNote", { first: firstName })}
        </p>
      </div>

      {selected !== null && (
        <div className="flex items-center gap-2 border-t border-[var(--hair)] pt-2.5">
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--ink2)]">
            {t("editing", { name: nameOf(selected) })}
          </span>
          {confirming === selected ? (
            <>
              <form action={deleteDayType} onSubmit={() => setConfirming(null)}>
                <input type="hidden" name="client_id" value={clientId} />
                <input type="hidden" name="day_type_id" value={selected} />
                <button
                  type="submit"
                  className="h-8 rounded-r2 border border-[var(--a3)] px-2.5 text-[12px] font-semibold text-[var(--a3)]"
                >
                  {t("confirmDelete")}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="h-8 rounded-r2 px-2.5 text-[12px] text-[var(--ink3)]"
              >
                {t("cancel")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(selected)}
              className="h-8 shrink-0 rounded-r2 px-2.5 text-[12px] text-[var(--ink3)] hover:text-[var(--a3)]"
            >
              {t("delete")}
            </button>
          )}
        </div>
      )}

      {confirming === selected && selected !== null && (
        <p className="text-[12px] leading-[1.45] text-[var(--ink2)]">
          {t("deleteBody", { name: nameOf(selected) })}
        </p>
      )}
    </section>
  );
}
