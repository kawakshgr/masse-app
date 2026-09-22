/**
 * Plain module, deliberately without "use client": the server page needs to
 * call isClientTab() to validate the URL, and a function exported from a client
 * module cannot be invoked on the server — only rendered as a component.
 */

export const CLIENT_TABS = [
  "overview",
  "history",
  "checkins",
  "nutrition",
  "cycle",
  "steps",
  "file",
] as const;

export type ClientTab = (typeof CLIENT_TABS)[number];

export function isClientTab(value: string | undefined): value is ClientTab {
  return value !== undefined && (CLIENT_TABS as readonly string[]).includes(value);
}
