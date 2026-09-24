"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Offline is a state, not an error — the web twin of SetQueue/TrainingLog on
 * iOS.
 *
 * A logged set is written here first and always. Its id is made here too, and
 * that is the whole design: a flush that half succeeds and runs again upserts
 * the same rows instead of writing them twice. The queue is an outbox — once
 * the server has a row, the server is where it lives.
 */

const KEY = "masse:setqueue:v2";
const LEGACY_KEY = "masse:setqueue";

const listeners = new Set<() => void>();
let cache: QueuedSet[] | null = null;
const EMPTY: QueuedSet[] = [];

export type QueuedSet = {
  id: string;
  client_id: string;
  session_exercise_id: string;
  set_index: number;
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
  logged_at: string;
  synced_at: string | null;
};

/** Subscribe/snapshot pair for useSyncExternalStore. */
export function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getSnapshot(): QueuedSet[] {
  if (cache === null) cache = read();
  return cache;
}

export function getServerSnapshot(): QueuedSet[] {
  return EMPTY;
}

function read(): QueuedSet[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as QueuedSet[];

    // Sets held by the previous version of this queue, which had no id. A held
    // set is a promise, so they are carried over rather than dropped.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (!legacy) return [];
    const carried = (JSON.parse(legacy) as (Omit<QueuedSet, "id"> & { localId?: string })[])
      .filter((row) => row.synced_at === null)
      .map((row) => {
        const { localId, ...rest } = row;
        void localId;
        return { ...rest, id: crypto.randomUUID() };
      });
    window.localStorage.setItem(KEY, JSON.stringify(carried));
    window.localStorage.removeItem(LEGACY_KEY);
    return carried;
  } catch {
    return [];
  }
}

function write(rows: QueuedSet[]) {
  cache = rows;
  listeners.forEach((listener) => listener());
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    // Storage blocked. The set stays in memory for this page only, and the
    // screen keeps showing it as held — which is still true.
  }
}

/** Accepts the set unconditionally. Nothing on a gym floor waits on a network. */
export function enqueue(
  row: Omit<QueuedSet, "id" | "logged_at" | "synced_at">,
): QueuedSet {
  const entry: QueuedSet = {
    ...row,
    id: crypto.randomUUID(),
    logged_at: new Date().toISOString(),
    synced_at: null,
  };
  write([...getSnapshot(), entry]);
  return entry;
}

export function remove(id: string) {
  write(getSnapshot().filter((row) => row.id !== id));
}

let flushing = false;

/**
 * Sends what is held, all at once. Failure is silent by design: the sets stay
 * held and the screen already says so. Returns the rows the server took.
 */
export async function flush(): Promise<QueuedSet[]> {
  const held = getSnapshot();
  if (held.length === 0 || flushing) return [];

  flushing = true;
  try {
    const now = new Date().toISOString();
    const payload = held.map((row) => ({ ...row, synced_at: now }));
    const { error } = await createClient().from("set_logs").upsert(payload, { onConflict: "id" });
    if (error) return [];

    const sent = new Set(payload.map((row) => row.id));
    write(getSnapshot().filter((row) => !sent.has(row.id)));
    return payload;
  } finally {
    flushing = false;
  }
}
