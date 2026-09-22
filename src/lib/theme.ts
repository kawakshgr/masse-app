"use client";

export type ThemeChoice = "auto" | "light" | "dark";

export const THEME_KEY = "masse:theme";

/**
 * The choice lives in this browser; the resolved value is stamped on <html>.
 * Read through a store rather than copied into state by an effect, so the first
 * paint and React agree.
 */
const listeners = new Set<() => void>();
let cache: ThemeChoice | null = null;

export function subscribeTheme(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getTheme(): ThemeChoice {
  if (cache !== null) return cache;
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    cache = raw === "light" || raw === "dark" ? raw : "auto";
  } catch {
    cache = "auto";
  }
  return cache;
}

export function getServerTheme(): ThemeChoice {
  return "auto";
}

/**
 * What is actually on screen. The switch is two-state, so it reflects this
 * rather than the stored choice: "auto" is not a position on the track, it is
 * simply what we follow until she touches it.
 */
export function getResolvedTheme(): "light" | "dark" {
  return resolve(getTheme());
}

/** Dark is the app's own default; the pre-paint script corrects it instantly. */
export function getServerResolvedTheme(): "light" | "dark" {
  return "dark";
}

/** Flips to the opposite of what she is looking at, whatever got her there. */
export function toggleTheme() {
  setTheme(getResolvedTheme() === "dark" ? "light" : "dark");
}

function resolve(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "auto") return choice;
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

export function setTheme(choice: ThemeChoice) {
  cache = choice;
  try {
    if (choice === "auto") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Blocked storage: the choice holds for this page only.
  }
  document.documentElement.dataset.theme = resolve(choice);
  listeners.forEach((listener) => listener());
}

/** Keeps "auto" honest when the OS flips while the app is open. */
export function watchSystemTheme(): () => void {
  let media: MediaQueryList;
  try {
    media = window.matchMedia("(prefers-color-scheme: light)");
  } catch {
    return () => {};
  }
  const onChange = () => {
    if (getTheme() === "auto") {
      document.documentElement.dataset.theme = resolve("auto");
      listeners.forEach((listener) => listener());
    }
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
