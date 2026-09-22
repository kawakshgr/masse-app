"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Offline is a state, not an error.
 *
 * A logged set is written here first and always. `synced_at` null means the row
 * exists only on this device — the same convention the coach reads, so a held
 * set looks the same whichever client she is looking at.
 */

const KEY = "masse:setqueue";

const listeners = new Set<() => void>();
let cache: QueuedSet[] | null = null;
const EMPTY: QueuedSet[] = [];

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

function notify() {
  listeners.forEach((listener) => listener());
}

export type QueuedSet = {
  localId: string;
  client_id: string;
  session_exercise_id: string;
  set_index: number;
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
  logged_at: string;
  synced_at: string | null;
};

function read(): QueuedSet[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedSet[]) : [];
  } catch {
    return [];
  }
}

function write(rows: QueuedSet[]) {
  cache = rows;
  notify();
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    // Storage blocked. The set stays in memory for this session only, which is
    // worse than the promise — so the UI must keep showing it as held.
  }
}

export function heldCount(): number {
  return getSnapshot().filter((row) => row.synced_at === null).length;
}

export function enqueue(
  row: Omit<QueuedSet, "localId" | "logged_at" | "synced_at">,
): QueuedSet {
  const entry: QueuedSet = {
    ...row,
    localId:
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    logged_at: new Date().toISOString(),
    synced_at: null,
  };
  write([...getSnapshot(), entry]);
  return entry;
}

export function remove(localId: string) {
  write(getSnapshot().filter((row) => row.localId !== localId));
}

/** Pushes everything still held. Returns how many reached the server. */
export async function flush(): Promise<number> {
  const rows = getSnapshot();
  const held = rows.filter((row) => row.synced_at === null);
  if (held.length === 0) return 0;

  const supabase = createClient();
  let sent = 0;

  for (const row of held) {
    const { error } = await supabase.from("set_logs").insert({
      client_id: row.client_id,
      session_exercise_id: row.session_exercise_id,
      set_index: row.set_index,
      reps: row.reps,
      weight_kg: row.weight_kg,
      rpe: row.rpe,
      logged_at: row.logged_at,
      synced_at: new Date().toISOString(),
    });

    // A failure here is not a lost set: it stays held and goes again later.
    if (!error) {
      sent += 1;
      remove(row.localId);
    }
  }

  return sent;
}
