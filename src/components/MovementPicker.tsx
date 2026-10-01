"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import type { CatalogueEntry } from "@/components/ExerciseLibrary";
import {
  FAMILIES,
  KITS,
  familyOf,
  fold,
  kitOf,
  type FamilyKey,
  type KitKey,
} from "@/lib/movementFamilies";

/**
 * The library for a thumb, where there is no room for the pane and nothing
 * to drag with: a search, eight big families, then one family's movements
 * filtered by kit. A tap adds the movement to the day; the sheet stays open
 * for the next one.
 */
export function MovementPicker({
  dayLabel,
  catalogue,
  onAdd,
  onClose,
}: {
  dayLabel: string;
  catalogue: CatalogueEntry[];
  onAdd: (name: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("picker");
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<FamilyKey | null>(null);
  const [kit, setKit] = useState<KitKey | null>(null);
  const [added, setAdded] = useState<string[]>([]);

  const counts = useMemo(() => {
    const byFamily = new Map<FamilyKey, number>();
    for (const entry of catalogue) {
      const key = familyOf(entry.muscleGroup);
      byFamily.set(key, (byFamily.get(key) ?? 0) + 1);
    }
    return byFamily;
  }, [catalogue]);

  const searching = fold(query) !== "";

  // Her own movements first, then the alphabet.
  const sorted = (rows: CatalogueEntry[]) =>
    [...rows].sort((a, b) => Number(b.mine) - Number(a.mine) || a.name.localeCompare(b.name));

  const inFamily = useMemo(
    () => (family ? catalogue.filter((entry) => familyOf(entry.muscleGroup) === family) : []),
    [catalogue, family],
  );
  const kitsHere = KITS.filter((key) => inFamily.some((entry) => kitOf(entry.equipment) === key));

  const rows = searching
    ? sorted(catalogue.filter((entry) => fold(entry.name).includes(fold(query)))).slice(0, 40)
    : family
      ? sorted(inFamily.filter((entry) => !kit || kitOf(entry.equipment) === kit))
      : [];

  // Any name is accepted, as in the editor: one she types joins her library.
  const exact = catalogue.some((entry) => fold(entry.name) === fold(query));

  function add(name: string) {
    onAdd(name);
    setAdded((list) => [...list, name]);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${t("title")} ${dayLabel}`}
      className="fixed inset-x-0 top-0 z-[60] flex h-[calc(var(--app-h,100dvh)-var(--app-gap,0px))] flex-col bg-[var(--deep)] pt-[env(safe-area-inset-top)]"
    >
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        {family && !searching ? (
          <RoundButton label={t("back")} onClick={() => { setFamily(null); setKit(null); }}>
            ‹
          </RoundButton>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">
            {t("title")}
          </p>
          <h2 className="truncate font-display text-[24px] font-extrabold uppercase leading-none tracking-[-.01em]">
            {family && !searching ? t(`family.${family}`) : dayLabel}
          </h2>
        </div>
        <RoundButton label={t("close")} onClick={onClose}>
          ×
        </RoundButton>
      </header>

      <label className="mx-4 flex h-12 items-center gap-2.5 rounded-r2 border border-[var(--edge)] bg-[var(--glass2)] px-3.5 text-[var(--ink3)]">
        <Icon name="search" size={20} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search")}
          enterKeyHint="search"
          autoCorrect="off"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--ink)] placeholder:text-[var(--ink3)] focus:outline-none"
        />
      </label>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {!searching && !family ? (
          <ul className="grid grid-cols-2 gap-2.5">
            {FAMILIES.map(({ key }) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setFamily(key)}
                  className="glass flex h-[104px] w-full flex-col items-start justify-between rounded-r3 p-3.5 text-left active:scale-[.98]"
                >
                  <span className="text-[var(--accent)]">
                    <Icon name={key} size={34} />
                  </span>
                  <span className="flex w-full items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-bold uppercase tracking-[.1em]">
                      {t(`family.${key}`)}
                    </span>
                    <span className="tnum text-[12px] text-[var(--ink3)]">{counts.get(key) ?? 0}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            {!searching && kitsHere.length > 1 && (
              <div className="glass2 mb-3 inline-flex max-w-full flex-wrap gap-1 rounded-rp p-1">
                {[null, ...kitsHere].map((key) => (
                  <button
                    key={key ?? "all"}
                    type="button"
                    onClick={() => setKit(key)}
                    aria-pressed={kit === key}
                    className={`h-9 whitespace-nowrap rounded-rp border px-3.5 text-[11.5px] font-bold uppercase tracking-[.1em] ${
                      kit === key ? "sel text-[var(--ink)]" : "border-transparent text-[var(--ink2)]"
                    }`}
                    style={kit === key ? { boxShadow: "var(--spec)" } : undefined}
                  >
                    {key ? t(`kit.${key}`) : t("all")}
                  </button>
                ))}
              </div>
            )}

            <ul className="flex flex-col gap-1.5">
              {searching && !exact && (
                <li>
                  <Row name={t("addFree", { name: query.trim() })} sub={t("addFreeSub")} done={added.includes(query.trim())} doneLabel={t("added")} onClick={() => add(query.trim())} />
                </li>
              )}
              {rows.map((entry) => (
                <li key={entry.id}>
                  <Row
                    name={entry.name}
                    sub={entry.equipment}
                    done={added.includes(entry.name)}
                    doneLabel={t("added")}
                    onClick={() => add(entry.name)}
                  />
                </li>
              ))}
            </ul>
            {rows.length === 0 && !searching && (
              <p className="p-6 text-center text-[13px] text-[var(--ink3)]">{t("none")}</p>
            )}
          </>
        )}
      </div>

      <div className="px-4 pb-[max(12px,calc(env(safe-area-inset-bottom)+8px-var(--app-gap,0px)))] pt-2">
        <button
          type="button"
          onClick={onClose}
          className="cta h-12 w-full rounded-r2 text-[15px] font-semibold text-[var(--on-accent)]"
        >
          {t("done", { count: added.length })}
        </button>
      </div>
    </div>
  );
}

function RoundButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="glass2 flex size-11 shrink-0 items-center justify-center rounded-full text-[24px] leading-none text-[var(--ink2)]"
    >
      {children}
    </button>
  );
}

function Row({
  name,
  sub,
  done,
  doneLabel,
  onClick,
}: {
  name: string;
  sub: string | null;
  done: boolean;
  doneLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={done}
      className="glass2 flex h-14 w-full items-center gap-3 rounded-r2 px-3.5 text-left active:scale-[.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{name}</span>
        {sub && <span className="block truncate text-[12px] text-[var(--ink3)]">{sub}</span>}
      </span>
      {done ? (
        <span className="shrink-0 text-[12px] font-semibold text-[var(--accent-soft)]">✓ {doneLabel}</span>
      ) : (
        <span
          aria-hidden
          className="cta flex size-9 shrink-0 items-center justify-center rounded-full text-[20px] font-bold leading-none text-[var(--on-accent)]"
        >
          +
        </span>
      )}
    </button>
  );
}
