#!/usr/bin/env node
/**
 * Generates the iOS String Catalog from the web's dictionaries.
 *
 * The French copy is reviewed once and lifted verbatim — the two clients must
 * not drift into saying different things about the same screen. Run this after
 * touching src/i18n/messages/*.json:
 *
 *     node ios/tools/sync-strings.mjs
 *
 * Only the namespaces the client app actually shows are carried over; the
 * coach's vocabulary has no business in a client bundle.
 */
import { readFileSync, writeFileSync } from "node:fs";

// A dotted entry carries one sub-tree rather than the whole namespace: the
// client shows the coach's supplement timings and units, and none of the rest
// of her library's vocabulary.
const NAMESPACES = [
  "onboarding", "today", "goal", "equipment", "days", "cycle",
  "phase", "offline", "auth", "log", "common", "feel", "pain", "adherence",
  "clientNav", "fuel", "entry", "supp.timing", "supp.unit",
  "shell", "soonCopy", "bilan", "checkin",
];

/** Walks a dotted path, so "supp.timing" resolves to that object. */
const at = (root, path) =>
  path.split(".").reduce((node, key) => node?.[key], root);

const read = (locale) =>
  JSON.parse(readFileSync(`src/i18n/messages/${locale}.json`, "utf8"));

const fr = read("fr");
const en = read("en");

/**
 * An ICU plural, split into the cases it actually carries.
 *
 * The catalog cannot hold ICU machinery, but the copy still belongs in one
 * place — so each case becomes an ordinary key and Swift picks between them.
 * Hard-coding the French in Swift would have been fewer lines and would have
 * left English behind.
 */
function splitPlural(value) {
  const inner = value.slice(value.indexOf("plural,") + 7, value.lastIndexOf("}"));
  const cases = {};
  const pattern = /(=\d+|zero|one|two|few|many|other)\s*\{([^{}]*)\}/g;

  for (const [, label, text] of inner.matchAll(pattern)) {
    const name = label === "=0" ? "zero" : label === "=1" ? "one" : label;
    // `#` is the count itself.
    cases[name] = text.replace(/#/g, "%1$@");
  }
  return cases;
}

/** ICU `{n}` is what next-intl uses; Foundation wants `%1$@`. */
function toFoundation(value) {
  const order = [];
  const out = value.replace(/\{(\w+)\}/g, (_, name) => {
    let index = order.indexOf(name);
    if (index === -1) index = order.push(name) - 1;
    return `%${index + 1}$@`;
  });
  return { out, order };
}

const strings = {};
let carried = 0;
let skipped = 0;
let plurals = 0;

for (const ns of NAMESPACES) {
  for (const [key, value] of Object.entries(at(fr, ns) ?? {})) {
    if (typeof value !== "string") continue;
    // A select is ICU machinery with no catalog equivalent; skip it.
    if (/\{[^}]*,\s*select/.test(value)) { skipped += 1; continue; }

    // A plural becomes one key per case, which Swift chooses between.
    if (/\{[^}]*,\s*plural/.test(value)) {
      const frCases = splitPlural(value);
      const enSource = at(en, ns)?.[key];
      const enCases = typeof enSource === "string" ? splitPlural(enSource) : {};

      for (const [name, frCase] of Object.entries(frCases)) {
        strings[`${ns}.${key}.${name}`] = {
          extractionState: "manual",
          localizations: {
            fr: { stringUnit: { state: "translated", value: frCase } },
            en: {
              stringUnit: { state: "translated", value: enCases[name] ?? frCase },
            },
          },
          comment: "args: count",
        };
        carried += 1;
      }
      plurals += 1;
      continue;
    }

    const frText = toFoundation(value);
    const enValue = at(en, ns)?.[key];
    const enText = typeof enValue === "string" ? toFoundation(enValue).out : frText.out;

    strings[`${ns}.${key}`] = {
      extractionState: "manual",
      localizations: {
        fr: { stringUnit: { state: "translated", value: frText.out } },
        en: { stringUnit: { state: "translated", value: enText } },
      },
      ...(frText.order.length ? { comment: `args: ${frText.order.join(", ")}` } : {}),
    };
    carried += 1;
  }
}

writeFileSync(
  "ios/Masse/Resources/Localizable.xcstrings",
  JSON.stringify({ sourceLanguage: "fr", strings, version: "1.0" }, null, 2) + "\n",
);

console.log(`${carried} strings carried, ${plurals} plurals split, ${skipped} selects skipped`);
