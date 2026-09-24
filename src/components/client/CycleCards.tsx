"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteCycleLog, saveCycleLog } from "@/app/(client)/actions";
import { Card, Cta, Kicker, RoundButton, fieldClass } from "./ui";

/** A period start and a length. Nothing else leaves the browser. */
export function CycleEntryCard({ today }: { today: string }) {
  const t = useTranslations("entry");
  const [start, setStart] = useState(today);
  const [length, setLength] = useState(28);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="space-y-3.5">
      <label className="flex items-center justify-between gap-3">
        <span className="text-[15px] text-[var(--ink2)]">{t("periodStart")}</span>
        <input
          type="date"
          value={start}
          max={today}
          onChange={(event) => setStart(event.target.value)}
          className={`${fieldClass} tnum h-11 w-auto`}
        />
      </label>

      <div className="flex items-center gap-3">
        <span className="flex-1 text-[15px] text-[var(--ink2)]">{t("cycleLength")}</span>
        <RoundButton label={`${t("cycleLength")} −`} onClick={() => setLength((n) => Math.max(15, n - 1))}>
          −
        </RoundButton>
        <span className="tnum w-9 text-center text-[15px] font-semibold">{length}</span>
        <RoundButton label={`${t("cycleLength")} +`} onClick={() => setLength((n) => Math.min(60, n + 1))}>
          +
        </RoundButton>
      </div>

      <Cta
        disabled={pending || !start}
        onClick={() => startTransition(() => saveCycleLog(start, length))}
      >
        {t("save")}
      </Cta>

      <p className="text-[13px] leading-[1.45] text-[var(--ink3)]">{t("cyclePromise")}</p>
    </Card>
  );
}

/*
 * Symptom notes. This store is the whole of their storage.
 *
 * There is no table for them and there never will be. They live in this
 * browser, keyed by day like SymptomNotes on iOS, and they are outside every
 * form on the page — which is why the screen can promise it.
 */
const NOTES_KEY = "masse:symptoms:v2";
const LEGACY_NOTE_KEY = "masse:symptoms";
const noteListeners = new Set<() => void>();
let notesCache: Record<string, string> | null = null;
const NO_NOTES: Record<string, string> = {};

function readNotes(): Record<string, string> {
  if (notesCache) return notesCache;
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    notesCache = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    // The previous version kept one undated note. It is hers, so it is kept,
    // under the day it was found.
    const legacy = window.localStorage.getItem(LEGACY_NOTE_KEY);
    if (legacy) {
      const day = new Date().toISOString().slice(0, 10);
      notesCache = { ...notesCache, [day]: notesCache[day] ?? legacy };
      window.localStorage.setItem(NOTES_KEY, JSON.stringify(notesCache));
      window.localStorage.removeItem(LEGACY_NOTE_KEY);
    }
  } catch {
    notesCache = {};
  }
  return notesCache;
}

function writeNote(day: string, value: string) {
  const next = { ...readNotes() };
  if (value.trim()) next[day] = value;
  else delete next[day];
  notesCache = next;
  noteListeners.forEach((listener) => listener());
  try {
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
  } catch {
    // Blocked storage: not remembered. Still never sent.
  }
}

/** Every note, gone — Settings asks first. There is no copy anywhere else. */
export function clearSymptomNotes() {
  notesCache = {};
  noteListeners.forEach((listener) => listener());
  try {
    window.localStorage.removeItem(NOTES_KEY);
    window.localStorage.removeItem(LEGACY_NOTE_KEY);
  } catch {
    // Nothing stored, nothing to clear.
  }
}

function subscribeNotes(onChange: () => void) {
  noteListeners.add(onChange);
  return () => noteListeners.delete(onChange);
}

export function SymptomNoteCard({ today }: { today: string }) {
  const t = useTranslations("entry");
  const notes = useSyncExternalStore(subscribeNotes, readNotes, () => NO_NOTES);

  return (
    <Card className="space-y-2.5">
      <Kicker>{t("symptomNote")}</Kicker>
      <textarea
        rows={4}
        value={notes[today] ?? ""}
        onChange={(event) => writeNote(today, event.target.value)}
        className="w-full rounded-r1 bg-[var(--glass2)] p-2.5 text-[15px] text-[var(--ink)]"
      />
      <p className="text-[13px] leading-[1.45] text-[var(--ink3)]">{t("symptomHint")}</p>
    </Card>
  );
}

export function RemoveCycleEntry({ id }: { id: string }) {
  const t = useTranslations("entry");
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={t("remove")}
      disabled={pending}
      onClick={() => startTransition(() => deleteCycleLog(id))}
      className="flex size-8 items-center justify-center text-[13px] font-semibold text-[var(--ink3)] hover:text-[var(--a3)]"
    >
      ✕
    </button>
  );
}
