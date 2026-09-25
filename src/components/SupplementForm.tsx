import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  SUPPLEMENT_CATEGORIES,
  SUPPLEMENT_TIMINGS,
  SUPPLEMENT_UNITS,
} from "@/lib/supabase/types";
import { addSupplement } from "@/app/(coach)/complements/actions";

const micro = "text-[11px] uppercase tracking-[.14em] text-[var(--ink2)]";
const cell =
  "h-10 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink3)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className={micro}>{label}</span>
      {children}
    </label>
  );
}

/**
 * A supplement of her own, written in the detail pane with the same sections
 * as the sheet it becomes. Saving selects it.
 */
export async function SupplementForm() {
  const t = await getTranslations("supp");
  const tf = await getTranslations("foods");

  return (
    <form action={addSupplement} className="min-w-0 flex-1 overflow-y-auto p-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="py-1 font-display text-[23px] font-extrabold tracking-[-.03em]">
            {t("newTitle")}
          </h1>
          <p className="mt-1 pl-0.5 text-[13px] text-[var(--ink2)]">{t("newLede")}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/complements"
            className="glass2 h-10 rounded-r2 px-3.5 text-[13px] font-semibold leading-10 text-[var(--ink2)]"
          >
            {t("cancel")}
          </Link>
          <button
            type="submit"
            className="cta h-10 rounded-r2 px-4 text-[13px] font-semibold text-[var(--onA)]"
          >
            {t("save")}
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(268px,1fr))] items-start gap-3">
        <section className="glass flex flex-col gap-3 rounded-r3 p-4">
          <span className={micro}>{t("identity")}</span>
          <Field label={t("name")}>
            <input name="name" required autoFocus className={`${cell} w-full`} />
          </Field>
          <Field label={t("category")}>
            <select name="category" defaultValue="other" className={`${cell} w-full`}>
              {SUPPLEMENT_CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {t(`cat.${key}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("note")}>
            <input name="note" className={`${cell} w-full`} />
          </Field>
        </section>

        <section className="glass flex flex-col gap-3 rounded-r3 p-4">
          <span className={micro}>{t("dose")}</span>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("doseMin")}>
              <input name="dose_min" inputMode="decimal" className={`tnum ${cell} w-full`} />
            </Field>
            <Field label={t("doseMax")}>
              <input name="dose_max" inputMode="decimal" className={`tnum ${cell} w-full`} />
            </Field>
          </div>
          <Field label={t("unitLabel")}>
            <select name="unit" defaultValue="g" className={`${cell} w-full`}>
              {SUPPLEMENT_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {t(`unit.${unit}`, { count: 1 })}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("timingLabel")}>
            <select name="timing" defaultValue="anytime" className={`${cell} w-full`}>
              {SUPPLEMENT_TIMINGS.map((timing) => (
                <option key={timing} value={timing}>
                  {t(`timing.${timing}`)}
                </option>
              ))}
            </select>
          </Field>
        </section>

        {/* Macros per unit of the dose — how a whey ends up in the day total. */}
        <section className="glass flex flex-col gap-3 rounded-r3 p-4">
          <span className={micro}>{t("macrosPerUnit")}</span>
          {(
            [
              ["protein_per_unit", tf("protein")],
              ["carbs_per_unit", tf("carbs")],
              ["fat_per_unit", tf("fat")],
            ] as const
          ).map(([field, label]) => (
            <Field key={field} label={t("perUnitOf", { macro: label })}>
              <input name={field} inputMode="decimal" placeholder="g" className={`tnum ${cell} w-full`} />
            </Field>
          ))}
        </section>
      </div>
    </form>
  );
}
